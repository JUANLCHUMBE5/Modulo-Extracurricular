import cors from "cors";
import { execFile } from "child_process";
import { randomUUID } from "crypto";
import express from "express";
import ExcelJS from "exceljs";
import { promises as fs } from "fs";
import multer from "multer";
import os from "os";
import path from "path";
import { promisify } from "util";
import { getDb, resetDb, saveDb } from "./localDb.js";

const app = express();
const PORT = Number(process.env.EXCEL_API_PORT || 5175);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_WORD_FILE_SIZE = 25 * 1024 * 1024;
const execFileAsync = promisify(execFile);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_WORD_FILE_SIZE, files: 1 },
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origen no permitido por CORS."));
  },
}));
app.use(express.json({ limit: "30mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/db", async (_req, res) => {
  try {
    res.json(await getDb());
  } catch {
    res.status(500).json({ message: "No se pudo leer la base local." });
  }
});

app.put("/api/db", async (req, res) => {
  try {
    const db = await saveDb(req.body);
    res.json(db);
  } catch {
    res.status(500).json({ message: "No se pudo guardar la base local." });
  }
});

app.post("/api/db/reset", async (_req, res) => {
  try {
    res.json(await resetDb());
  } catch {
    res.status(500).json({ message: "No se pudo reiniciar la base local." });
  }
});

app.post("/api/coordinacion/cargas/preview", upload.single("archivo"), async (req, res) => {
  try {
    const periodo = normalizarPeriodo(req.body.periodo);
    const archivo = req.file;
    const programas = parseJsonArray(req.body.programas);
    const existentes = parseJsonObject(req.body.existentes);

    validarArchivoExcel(archivo);

    const programasPeriodo = programas.filter((programa) =>
      normalizarPeriodo(programa.periodo) === periodo &&
      String(programa.estado || "Habilitado") === "Habilitado"
    );

    const filas = await leerExcelSeguro(archivo);
    const registros = validarRegistros({ filas, programasPeriodo, existentes });

    const resumen = {
      total: registros.length,
      validos: registros.filter((item) => item.estado === "Valido").length,
      errores: registros.filter((item) => item.estado === "Error").length,
      duplicados: registros.filter((item) => item.estado === "Duplicado").length,
    };

    res.json({
      id: `PREVIEW-${Date.now()}`,
      periodo,
      archivoNombre: renombrarArchivo(archivo.originalname),
      registros,
      resumen,
    });
  } catch (error) {
    res.status(400).json({
      message: error.publicMessage || "No se pudo validar el archivo Excel.",
    });
  }
});

app.post("/api/secretaria/documentos/pdf", documentUpload.single("archivo"), async (req, res) => {
  try {
    const archivo = req.file;
    validarArchivoWord(archivo);

    const pdf = await convertirWordAPdf(archivo.buffer);
    const nombre = normalizarNombreDescarga(archivo.originalname).replace(/\.docx$/i, ".pdf");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    res.send(pdf);
  } catch (error) {
    res.status(400).json({
      message: error.publicMessage || "No se pudo convertir el Word a PDF. Verifique que el servidor tenga Microsoft Word o LibreOffice instalado.",
    });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: "El archivo no cumple las condiciones permitidas." });
  }

  return res.status(500).json({ message: "No se pudo procesar la solicitud." });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Excel API listening on http://127.0.0.1:${PORT}`);
});

function validarArchivoExcel(archivo) {
  if (!archivo) lanzar("Seleccione un archivo Excel.");

  const nombre = String(archivo.originalname || "");
  if (!/\.(xlsx|xls)$/i.test(nombre)) lanzar("Solo se permiten archivos .xlsx o .xls.");
  if (/\.(xlsx|xls)\.[a-z0-9]+$/i.test(nombre.toLowerCase())) {
    lanzar("El archivo tiene una extension sospechosa.");
  }
  if (archivo.size > MAX_FILE_SIZE) lanzar("El archivo no debe superar 5 MB.");

  const esXlsxReal = archivo.buffer.subarray(0, 4).toString("hex") === "504b0304";
  if (/\.xlsx$/i.test(nombre) && !esXlsxReal) {
    lanzar("El archivo no parece ser un Excel valido.");
  }
}

function validarArchivoWord(archivo) {
  if (!archivo) lanzar("Seleccione una plantilla Word para convertir.");

  const nombre = String(archivo.originalname || "");
  if (!/\.docx$/i.test(nombre)) lanzar("Solo se permite convertir documentos Word .docx.");
  if (/\.docx\.[a-z0-9]+$/i.test(nombre.toLowerCase())) {
    lanzar("El archivo Word tiene una extension sospechosa.");
  }
  if (archivo.size > MAX_WORD_FILE_SIZE) lanzar("El documento Word no debe superar 25 MB.");

  const esDocxReal = archivo.buffer.subarray(0, 4).toString("hex") === "504b0304";
  if (!esDocxReal) lanzar("El archivo no parece ser un Word valido.");
}

async function convertirWordAPdf(buffer) {
  const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), "modulo-extracurricular-"));
  const base = randomUUID();
  const entrada = path.join(carpeta, `${base}.docx`);
  const salida = path.join(carpeta, `${base}.pdf`);

  try {
    await fs.writeFile(entrada, buffer);

    const convertido = await convertirConLibreOffice(entrada, carpeta, salida)
      .catch(() => convertirConMicrosoftWord(entrada, salida));

    return await fs.readFile(convertido);
  } finally {
    await fs.rm(carpeta, { recursive: true, force: true }).catch(() => {});
  }
}

async function convertirConLibreOffice(entrada, carpeta, salida) {
  const ejecutables = [
    "soffice",
    "libreoffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ];

  for (const ejecutable of ejecutables) {
    try {
      await execFileAsync(ejecutable, [
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        carpeta,
        entrada,
      ], { timeout: 90000, windowsHide: true });

      await fs.access(salida);
      return salida;
    } catch {
      // Probar el siguiente convertidor disponible.
    }
  }

  throw new Error("LibreOffice no disponible.");
}

async function convertirConMicrosoftWord(entrada, salida) {
  const script = path.join(path.dirname(entrada), "convertir-word-pdf.ps1");
  await fs.writeFile(script, `
$ErrorActionPreference = "Stop"
$entrada = $args[0]
$salida = $args[1]
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $documento = $word.Documents.Open($entrada, $false, $true)
  try {
    $documento.ExportAsFixedFormat($salida, 17)
  } finally {
    $documento.Close($false)
  }
} finally {
  $word.Quit()
}
`, "utf8");

  await execFileAsync("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    script,
    entrada,
    salida,
  ], { timeout: 90000, windowsHide: true });

  await fs.access(salida);
  return salida;
}

async function leerExcelSeguro(archivo) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(archivo.buffer, {
      ignoreNodes: ["dataValidations", "conditionalFormatting", "extLst"],
    });
  } catch {
    lanzar("El archivo no se pudo abrir como Excel .xlsx valido. Verifique que no este danado, protegido o guardado en otro formato.");
  }

  const hoja = workbook.worksheets[0];
  if (!hoja) lanzar("El Excel no contiene hojas para validar.");

  const { encabezados, filaEncabezado } = obtenerEncabezados(hoja);
  validarColumnasObligatorias(encabezados);

  const filas = [];
  hoja.eachRow((row, rowNumber) => {
    if (rowNumber <= filaEncabezado) return;
    const fila = {};
    encabezados.forEach(({ nombre, columna }) => {
      fila[nombre] = limpiarTexto(row.getCell(columna).text);
    });
    if (Object.values(fila).some(Boolean)) filas.push({ filaExcel: rowNumber, ...fila });
  });

  return filas;
}

function obtenerEncabezados(hoja) {
  for (let fila = 1; fila <= Math.min(10, hoja.rowCount); fila += 1) {
    const encabezados = [];
    hoja.getRow(fila).eachCell((cell, columna) => {
      const nombre = normalizarEncabezado(cell.text);
      if (nombre) encabezados.push({ nombre, columna });
    });

    const disponibles = new Set(encabezados.map((item) => item.nombre));
    if (disponibles.has("dni") && disponibles.has("curso_programa")) {
      return { encabezados, filaEncabezado: fila };
    }
  }

  lanzar("No se encontro la fila de encabezados del Excel.");
}

function validarColumnasObligatorias(encabezados) {
  const disponibles = new Set(encabezados.map((item) => item.nombre));
  const obligatorias = ["dni", "nombres", "apellidos", "grado", "seccion", "curso_programa"];
  const faltantes = obligatorias.filter((columna) => !disponibles.has(columna));
  if (faltantes.length) lanzar(`Faltan columnas obligatorias: ${faltantes.join(", ")}.`);
}

function validarRegistros({ filas, programasPeriodo, existentes }) {
  const clavesArchivo = new Set();

  return filas.map((fila, index) => {
    const normalizada = normalizarFila(fila);
    const programaDetectado = detectarProgramaPorCurso(normalizada.curso, programasPeriodo);
    const errores = validarFilaCarga(normalizada, programaDetectado);
    const clave = claveAlumno(normalizada);
    const claveArchivo = programaDetectado ? `${programaDetectado.id}:${clave}` : clave;
    const existentesPrograma = new Set((existentes[programaDetectado?.id] || []).map(claveAlumno));
    const duplicadoArchivo = Boolean(claveArchivo && clavesArchivo.has(claveArchivo));
    const duplicadoPrograma = Boolean(clave && existentesPrograma.has(clave));

    if (claveArchivo) clavesArchivo.add(claveArchivo);
    if (duplicadoArchivo) errores.push("Alumno duplicado en el archivo.");
    if (duplicadoPrograma) errores.push("Alumno ya existe en el programa.");

    const estado = errores.length > 0
      ? (duplicadoArchivo || duplicadoPrograma ? "Duplicado" : "Error")
      : "Valido";

    return {
      fila: fila.filaExcel || index + 2,
      ...normalizada,
      programaId: programaDetectado?.id || "",
      programaNombre: programaDetectado?.nombre || "",
      estado,
      errores,
    };
  });
}

function normalizarFila(fila) {
  return {
    codigoEstudiante: limpiarTexto(fila.codigo_estudiante),
    dni: limpiarTexto(fila.dni),
    nombres: limpiarTexto(fila.nombres),
    apellidos: limpiarTexto(fila.apellidos),
    grado: limpiarTexto(fila.grado),
    seccion: limpiarTexto(fila.seccion).toUpperCase(),
    curso: limpiarTexto(fila.curso_programa),
    observacion: limpiarTexto(fila.observacion),
    estadoAlumno: "Invitado",
  };
}

function validarFilaCarga(fila, programaDetectado) {
  const errores = [];
  if (fila.dni && !/^\d{8}$/.test(fila.dni)) errores.push("DNI invalido. Debe tener 8 digitos.");
  if (!textoSeguro(fila.nombres)) errores.push("Falta nombre.");
  if (!textoSeguro(fila.apellidos)) errores.push("Falta apellido.");
  if (!textoSeguro(fila.grado)) errores.push("Falta grado.");
  if (!textoSeguro(fila.seccion)) errores.push("Falta seccion.");
  if (!textoSeguro(fila.curso)) errores.push("Falta curso o programa.");
  if (fila.curso && !programaDetectado) errores.push("El programa indicado no existe o no está habilitado.");
  if (fila.observacion && /[<>]/.test(fila.observacion)) errores.push("Observación contiene caracteres no permitidos.");
  return errores;
}

function detectarProgramaPorCurso(curso, programas) {
  if (!curso) return null;
  return programas.find((programa) => coincideCurso(curso, programa.nombre)) || null;
}

function coincideCurso(curso, programa) {
  const a = normalizarComparacion(curso);
  const b = normalizarComparacion(programa);
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const tokensA = tokensCurso(a);
  const tokensB = tokensCurso(b);
  if (!tokensA.length || !tokensB.length) return false;

  const coincidencias = tokensA.filter((token) => tokensB.includes(token)).length;
  return coincidencias >= Math.min(2, tokensA.length, tokensB.length);
}

function claveAlumno(alumno) {
  if (alumno.dni) return `dni:${alumno.dni}`;
  const nombre = `${alumno.nombres || ""} ${alumno.apellidos || ""}`.trim().toLowerCase();
  return nombre ? `nombre:${nombre}:${alumno.grado}:${alumno.seccion}` : "";
}

function limpiarTexto(valor) {
  return String(valor ?? "").trim().replace(/[<>]/g, "");
}

function textoSeguro(valor) {
  return limpiarTexto(valor).length > 0;
}

function normalizarPeriodo(valor) {
  return String(valor || "").toLowerCase().includes("verano") ? "verano" : "escolar";
}

function normalizarEncabezado(valor) {
  return normalizarComparacion(valor)
    .replace(/[\s/.-]+/g, "_")
    .replace(/_+/g, "_");
}

function normalizarId(valor) {
  return normalizarComparacion(valor)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "curso";
}

function normalizarComparacion(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokensCurso(valor) {
  const ignorar = new Set(["curso", "programa", "taller", "de", "del", "la", "el", "y", "para"]);
  return normalizarComparacion(valor)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !ignorar.has(token));
}

function parseJsonArray(valor) {
  try {
    const parsed = JSON.parse(valor || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(valor) {
  try {
    const parsed = JSON.parse(valor || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function renombrarArchivo(nombre) {
  const extension = /\.xls$/i.test(nombre) ? "xls" : "xlsx";
  return `carga-${Date.now()}.${extension}`;
}

function normalizarNombreDescarga(nombre) {
  return String(nombre || "documento.docx")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "documento.docx";
}

function lanzar(publicMessage) {
  const error = new Error(publicMessage);
  error.publicMessage = publicMessage;
  throw error;
}
