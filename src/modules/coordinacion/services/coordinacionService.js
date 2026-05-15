import { mockDb, nextMockId, saveMockDb, syncMockDbFromStorage } from "../../../services/localDbClient";
import { fechaActualInput, fechaActualIso, normalizarFecha } from "../../../services/dateService";

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));
const obtenerApiBase = () => import.meta.env.VITE_LOCAL_API_URL || "";

export async function listarCategorias() {
  await delay(300);
  await syncMockDbFromStorage();
  return [...mockDb.categorias];
}

export async function crearCategoria(nombre) {
  await delay(300);
  if (mockDb.categorias.includes(nombre)) throw new Error("La categoría ya existe.");
  mockDb.categorias.push(nombre);
  saveMockDb();
  return nombre;
}

export async function eliminarCategoria(nombre) {
  await delay(300);
  await syncMockDbFromStorage();
  const categoria = String(nombre || "").trim();
  if (!categoria) throw new Error("Seleccione una categoría para quitar.");

  const estaEnUso = mockDb.programas.some((programa) =>
    String(programa.categoria || "").toLowerCase() === categoria.toLowerCase()
  );
  if (estaEnUso) {
    throw new Error("No se puede quitar una categoría que ya está usada por programas registrados.");
  }

  mockDb.categorias = mockDb.categorias.filter((item) =>
    String(item).toLowerCase() !== categoria.toLowerCase()
  );
  saveMockDb();
  return categoria;
}

export async function listarProgramas() {
  await delay(400);
  await syncMockDbFromStorage();
  normalizarPeriodosGuardados();
  finalizarProgramasVencidos();
  return mockDb.programas.map(conCuposDisponibles);
}

export async function obtenerPrograma(id) {
  await delay(300);
  await syncMockDbFromStorage();
  normalizarPeriodosGuardados();
  finalizarProgramasVencidos();
  const programa = mockDb.programas.find((item) => item.id === id);
  if (!programa) throw new Error("Programa no encontrado.");
  return conCuposDisponibles(programa);
}

export async function crearPrograma(datos) {
  await delay(700);
  await syncMockDbFromStorage();
  finalizarProgramasVencidos();
  validarDatosPrograma(datos);
  const correlativo = nextMockId("nextProgramaId");
  const nuevo = {
    id: `PROG-${String(correlativo).padStart(3, "0")}`,
    cuposOcupados: 0,
    estado: "Habilitado",
    ...datos,
    periodo: normalizarPeriodo(datos.periodo),
    cupos: Number(datos.cupos),
    costo: Number(Number(datos.costo).toFixed(2)),
    plantillaBase64: datos.plantillaBase64 || "",
    plantillaVariables: datos.plantillaVariables || [],
    plantillaValidada: Boolean(datos.plantillaValidada),
    requisitos: datos.requisitos || "",
    comunicado: datos.comunicado || "",
    detalleCosto: datos.detalleCosto || "",
    detalleAlmuerzo: datos.detalleAlmuerzo || "",
    concesionarios: datos.concesionarios || "",
  };

  mockDb.programas.push(nuevo);
  saveMockDb();
  return conCuposDisponibles(nuevo);
}

export async function crearProgramaDesdeDocumento(datos) {
  await delay(700);
  await syncMockDbFromStorage();
  finalizarProgramasVencidos();

  if (!String(datos.nombre || "").trim()) throw new Error("Ingrese el nombre del programa.");
  if (!datos.plantilla || !datos.plantillaBase64 || !datos.plantillaValidada) {
    throw new Error("Suba un Word apto con variables antes de guardar.");
  }

  const correlativo = nextMockId("nextProgramaId");
  const nuevo = {
    ...datos,
    id: `PROG-${String(correlativo).padStart(3, "0")}`,
    periodo: normalizarPeriodo(datos.periodo || "escolar"),
    categoria: datos.categoria || mockDb.categorias[0] || "General",
    grupo: datos.grupo || "Por definir",
    horario: datos.horario || "Por definir",
    gradosAplicables: Array.isArray(datos.gradosAplicables) && datos.gradosAplicables.length
      ? datos.gradosAplicables
      : ["3 años", "4 años", "5 años", "1", "2", "3", "4", "5", "6"],
    dias: Array.isArray(datos.dias) ? datos.dias : [],
    horariosPorGrupo: Array.isArray(datos.horariosPorGrupo) ? datos.horariosPorGrupo : [],
    fechaInicio: datos.fechaInicio || fechaActualInput(),
    fechaFin: datos.fechaFin || fechaActualInput(),
    cupos: Number(datos.cupos) > 0 ? Number(datos.cupos) : 1,
    cuposOcupados: 0,
    costo: Number(datos.costo) > 0 ? Number(Number(datos.costo).toFixed(2)) : 1,
    modalidadCobro: datos.modalidadCobro || "Mensual",
    estado: "Deshabilitado",
    plantillaVariables: datos.plantillaVariables || [],
    plantillaValidada: true,
    requisitos: datos.requisitos || "",
    comunicado: datos.comunicado || "",
    detalleCosto: datos.detalleCosto || "",
    detalleAlmuerzo: datos.detalleAlmuerzo || "",
    concesionarios: datos.concesionarios || "",
    requiereUniforme: Boolean(datos.requiereUniforme),
    creadoDesdeDocumento: true,
  };

  mockDb.programas.push(nuevo);
  saveMockDb();
  return conCuposDisponibles(nuevo);
}

export async function editarPrograma(id, datos) {
  await delay(700);
  await syncMockDbFromStorage();
  finalizarProgramasVencidos();
  validarDatosPrograma(datos);
  const index = mockDb.programas.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Programa no encontrado.");

  mockDb.programas[index] = {
    ...mockDb.programas[index],
    ...datos,
    id,
    periodo: normalizarPeriodo(datos.periodo),
    cupos: Number(datos.cupos),
    costo: Number(Number(datos.costo).toFixed(2)),
    plantillaBase64: datos.plantillaBase64 || "",
    plantillaVariables: datos.plantillaVariables || [],
    plantillaValidada: Boolean(datos.plantillaValidada),
    requisitos: datos.requisitos || "",
    comunicado: datos.comunicado || "",
    detalleCosto: datos.detalleCosto || "",
    detalleAlmuerzo: datos.detalleAlmuerzo || "",
    concesionarios: datos.concesionarios || "",
  };

  saveMockDb();
  return conCuposDisponibles(mockDb.programas[index]);
}

export async function cambiarEstadoPrograma(id, nuevoEstado) {
  await delay(400);
  await syncMockDbFromStorage();
  normalizarPeriodosGuardados();
  finalizarProgramasVencidos();
  const programa = mockDb.programas.find((item) => item.id === id);
  if (!programa) throw new Error("Programa no encontrado.");
  if (programa.estado === "Finalizado") {
    throw new Error("El programa ya finalizó. Cree un nuevo ciclo para continuar.");
  }
  if (nuevoEstado === "Habilitado" && programaVencido(programa)) {
    programa.estado = "Finalizado";
    programa.finalizadoAutomaticamenteEn = programa.finalizadoAutomaticamenteEn || fechaActualIso();
    saveMockDb();
    throw new Error("El programa ya cumplió su fecha fin. Cree un nuevo ciclo para continuar.");
  }
  programa.estado = nuevoEstado;
  saveMockDb();
  return conCuposDisponibles(programa);
}

export async function eliminarPrograma(id) {
  await delay(400);
  await syncMockDbFromStorage();
  const index = mockDb.programas.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Programa no encontrado.");

  mockDb.programas.splice(index, 1);
  delete mockDb.invitadosPorPrograma[id];
  saveMockDb();
  return true;
}

export async function listarInvitados(programaId) {
  await delay(400);
  await syncMockDbFromStorage();
  return [...(mockDb.invitadosPorPrograma[programaId] || [])];
}

export async function buscarInvitacionPorDniPeriodo(dni, periodo) {
  await delay(250);
  await syncMockDbFromStorage();
  normalizarPeriodosGuardados();
  finalizarProgramasVencidos();
  const programasPeriodo = mockDb.programas.filter((programa) =>
    normalizarPeriodo(programa.periodo) === normalizarPeriodo(periodo)
  );

  for (const programa of programasPeriodo) {
    const invitado = (mockDb.invitadosPorPrograma[programa.id] || [])
      .find((alumno) =>
        alumno.dni === dni &&
        normalizarPeriodo(alumno.periodo || programa.periodo) === normalizarPeriodo(periodo)
      );

    if (invitado) {
      return {
        programaId: programa.id,
        programa: conCuposDisponibles(programa),
        invitado,
      };
    }
  }

  return null;
}

export async function importarInvitados(programaId, lista) {
  await delay(800);
  const existentes = mockDb.invitadosPorPrograma[programaId] || [];
  const dniExistentes = new Set(existentes.map((item) => item.dni));
  const nuevos = lista.filter((item) => !dniExistentes.has(item.dni));
  const duplicados = lista.length - nuevos.length;
  const programa = mockDb.programas.find((item) => item.id === programaId);
  mockDb.invitadosPorPrograma[programaId] = [
    ...existentes,
    ...nuevos.map((item) => ({
      ...item,
      periodo: item.periodo || normalizarPeriodo(programa?.periodo),
    })),
  ];
  saveMockDb();
  return { importados: nuevos.length, duplicados };
}

export async function previsualizarCargaAlumnos({ periodo, archivoNombre, archivo }) {
  await syncMockDbFromStorage();
  normalizarPeriodosGuardados();

  if (!archivo) throw new Error("Seleccione un archivo Excel.");
  validarArchivoExcelFrontend({ archivoNombre, archivo });

  const formData = new FormData();
  formData.append("periodo", periodo);
  formData.append("archivo", archivo);
  formData.append("programas", JSON.stringify(mockDb.programas));
  formData.append("existentes", JSON.stringify(mockDb.invitadosPorPrograma));

  const response = await fetch(`${obtenerApiBase()}/api/coordinacion/cargas/preview`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "No se pudo validar el archivo Excel.");
  }

  return data;
}

export async function previsualizarCargaAlumnosMasiva({ periodo, archivos, onProgress }) {
  const lista = Array.from(archivos || []);
  if (!lista.length) throw new Error("Seleccione al menos un archivo Excel.");
  if (lista.length > 6) throw new Error("Puede subir hasta 6 archivos Excel por carga.");

  const totalBytes = lista.reduce((total, archivo) => total + Number(archivo.size || 0), 0);
  if (totalBytes > 25 * 1024 * 1024) {
    throw new Error("La carga masiva no debe superar 25 MB en total.");
  }

  const previews = [];
  for (const [index, archivo] of lista.entries()) {
    onProgress?.({
      actual: index + 1,
      total: lista.length,
      porcentaje: Math.round((index / lista.length) * 100),
      archivo: archivo.name,
      estado: "validando",
    });

    const preview = await previsualizarCargaAlumnos({
      periodo,
      archivoNombre: archivo.name,
      archivo,
    });
    previews.push(preview);

    onProgress?.({
      actual: index + 1,
      total: lista.length,
      porcentaje: Math.round(((index + 1) / lista.length) * 100),
      archivo: archivo.name,
      estado: "completado",
    });
  }

  return combinarPreviewsCarga({ periodo, previews });
}

function combinarPreviewsCarga({ periodo, previews }) {
  const claves = new Set();
  const registros = [];

  previews.forEach((preview, archivoIndex) => {
    const archivoNombre = preview.archivoNombre || `Archivo ${archivoIndex + 1}`;
    preview.registros.forEach((registro) => {
      const item = {
        ...registro,
        archivoNombre,
        fila: `${archivoIndex + 1}.${registro.fila}`,
      };

      const clave = claveRegistroPreview(item);
      if (item.estado === "Valido" && clave && claves.has(clave)) {
        item.estado = "Duplicado";
        item.errores = [...(item.errores || []), "Alumno duplicado entre archivos de la misma carga."];
      }

      if (item.estado === "Valido" && clave) claves.add(clave);
      registros.push(item);
    });
  });

  return {
    id: `PREVIEW-MASIVO-${Date.now()}`,
    periodo,
    archivoNombre: previews.map((preview) => preview.archivoNombre).join(", "),
    archivos: previews.map((preview) => preview.archivoNombre),
    registros,
    resumen: {
      total: registros.length,
      validos: registros.filter((item) => item.estado === "Valido").length,
      errores: registros.filter((item) => item.estado === "Error").length,
      duplicados: registros.filter((item) => item.estado === "Duplicado").length,
    },
  };
}

function claveRegistroPreview(registro) {
  if (!registro.programaId) return "";
  if (registro.dni) return `${registro.programaId}:dni:${registro.dni}`;
  const nombre = `${registro.nombres || ""} ${registro.apellidos || ""}`.trim().toLowerCase();
  return nombre ? `${registro.programaId}:nombre:${nombre}:${registro.grado}:${registro.seccion}` : "";
}

export async function confirmarCargaAlumnos(preview) {
  await delay(600);
  await syncMockDbFromStorage();
  const validos = preview.registros.filter((item) => item.estado === "Valido");

  validos.forEach((item) => {
    if (!item.programaId) return;
    const existentes = mockDb.invitadosPorPrograma[item.programaId] || [];
    mockDb.invitadosPorPrograma[item.programaId] = [
      ...existentes,
      {
        codigoEstudiante: item.codigoEstudiante || "",
        dni: item.dni,
        nombres: `${item.nombres} ${item.apellidos}`.trim(),
        grado: item.grado,
        seccion: item.seccion,
        periodo: normalizarPeriodo(preview.periodo),
        telefonoApoderado: item.telefono,
        correo: item.correo,
        observacion: item.observacion,
        estado: item.estadoAlumno || "Invitado",
      },
    ];
  });

  saveMockDb();
  return {
    importados: validos.length,
    total: preview.resumen?.total || validos.length,
    errores: preview.resumen?.errores || 0,
    duplicados: preview.resumen?.duplicados || 0,
  };
}

export async function obtenerActividadPrograma(programaId) {
  await delay(200);
  await syncMockDbFromStorage();
  const alumnos = mockDb.invitadosPorPrograma[programaId]?.length || 0;
  const inscripciones = mockDb.inscripciones.filter((item) => item.programaId === programaId).length;
  const documentos = (mockDb.documentosGenerados || []).filter((item) => item.programaId === programaId).length;
  return { alumnos, inscripciones, documentos, tieneActividad: alumnos + inscripciones + documentos > 0 };
}

export async function obtenerErroresCarga(cargaId) {
  await delay(250);
  await syncMockDbFromStorage();
  return [];
}

export async function obtenerListaAsistencia(programaId) {
  await delay(500);
  await syncMockDbFromStorage();
  const invitados = mockDb.invitadosPorPrograma[programaId] || [];
  return invitados.map((estudiante) => ({
    ...estudiante,
    asistencia: Array.from({ length: 5 }, (_, index) => ({
      sesion: index + 1,
      fecha: `2026-04-${String(7 + index * 7).padStart(2, "0")}`,
      asistio: Math.random() > 0.3,
    })),
  }));
}

function conCuposDisponibles(programa) {
  return {
    ...programa,
    periodo: normalizarPeriodo(programa.periodo),
    cuposDisponibles: Number(programa.cupos || 0) - Number(programa.cuposOcupados || 0),
  };
}

function validarDatosPrograma(datos) {
  if (!String(datos.nombre || "").trim()) throw new Error("El nombre del programa es obligatorio.");
  if (!String(datos.periodo || "").trim()) throw new Error("El periodo del programa es obligatorio.");
  if (!String(datos.categoria || "").trim()) throw new Error("La categoría del programa es obligatoria.");
  if (!Array.isArray(datos.gradosAplicables) || datos.gradosAplicables.length === 0) {
    throw new Error("Seleccione al menos un grado aplicable.");
  }
  if (!String(datos.horario || "").trim()) throw new Error("El horario del programa es obligatorio.");
  if (!Number.isFinite(Number(datos.cupos)) || Number(datos.cupos) <= 0) {
    throw new Error("Los cupos deben ser un número positivo.");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(String(datos.costo || "")) || Number(datos.costo) <= 0) {
    throw new Error("Ingrese un costo válido en soles, con máximo dos decimales.");
  }
  if (!String(datos.modalidadCobro || "").trim()) throw new Error("La modalidad de cobro es obligatoria.");
  if (datos.plantilla && !datos.plantillaValidada) {
    throw new Error("La plantilla Word debe ser validada antes de guardar el programa.");
  }
}

function normalizarPeriodosGuardados() {
  let cambio = false;
  mockDb.programas.forEach((programa) => {
    const normalizado = normalizarPeriodo(programa.periodo);
    if (programa.periodo !== normalizado) {
      programa.periodo = normalizado;
      cambio = true;
    }
  });
  if (cambio) saveMockDb();
}

function finalizarProgramasVencidos() {
  const hoy = normalizarFecha(fechaActualInput());
  if (!hoy) return;

  let cambio = false;
  mockDb.programas.forEach((programa) => {
    if (!debeFinalizarPorFecha(programa, hoy)) return;
    programa.estado = "Finalizado";
    programa.finalizadoAutomaticamenteEn = programa.finalizadoAutomaticamenteEn || fechaActualIso();
    cambio = true;
  });

  if (cambio) saveMockDb();
}

function debeFinalizarPorFecha(programa, hoy) {
  if (programa.estado === "Finalizado") return false;
  return programaVencido(programa, hoy);
}

function programaVencido(programa, hoy = normalizarFecha(fechaActualInput())) {
  const fechaFin = normalizarFecha(programa.fechaFin);
  if (!fechaFin || !hoy) return false;
  return fechaFin < hoy;
}

function normalizarPeriodo(periodo) {
  const valor = String(periodo || "").toLowerCase();
  if (valor.includes("verano")) return "verano";
  return "escolar";
}

function validarArchivoExcelFrontend({ archivoNombre, archivo }) {
  const nombre = String(archivoNombre || archivo?.name || "");
  const nombreMinuscula = nombre.toLowerCase();

  if (!/\.(xlsx|xls)$/i.test(nombre)) throw new Error("Solo se permiten archivos .xlsx o .xls.");
  if (/\.(xlsx|xls)\.[a-z0-9]+$/i.test(nombreMinuscula)) throw new Error("El archivo tiene una extension sospechosa.");
  if (archivo.size > 5 * 1024 * 1024) throw new Error("El archivo no debe superar 5 MB.");
}

function normalizarFila(fila) {
  return {
    codigoEstudiante: limpiarTexto(obtenerValor(fila, ["codigo_estudiante", "Código estudiante", "Código"])),
    dni: limpiarTexto(obtenerValor(fila, ["dni", "DNI", "Dni", "Documento"])),
    nombres: limpiarTexto(obtenerValor(fila, ["nombres", "Nombres", "Nombre"])),
    apellidos: limpiarTexto(obtenerValor(fila, ["apellidos", "Apellidos", "Apellido"])),
    grado: limpiarTexto(obtenerValor(fila, ["Grado"])),
    seccion: limpiarTexto(obtenerValor(fila, ["seccion", "Sección", "Sección"])).toUpperCase(),
    curso: limpiarTexto(obtenerValor(fila, ["curso_programa", "Curso / Programa", "Curso", "Programa"])),
    telefono: limpiarTexto(obtenerValor(fila, ["Teléfono apoderado", "Teléfono"])),
    correo: limpiarTexto(obtenerValor(fila, ["Correo", "Email"])),
    observacion: limpiarTexto(obtenerValor(fila, ["observacion", "Observación", "Observación"])),
    estadoAlumno: limpiarTexto(obtenerValor(fila, ["Estado"])),
  };
}

function validarFilaCarga(fila, programaDetectado) {
  const errores = [];

  if (!/^\d{8}$/.test(fila.dni)) errores.push("DNI invalido. Debe tener 8 digitos.");
  if (!textoSeguro(fila.nombres)) errores.push("Falta nombre o contiene caracteres no permitidos.");
  if (!textoSeguro(fila.apellidos)) errores.push("Falta apellido o contiene caracteres no permitidos.");
  if (!textoSeguro(fila.grado)) errores.push("Falta grado.");
  if (!/^[A-Z0-9-]{1,4}$/.test(fila.seccion)) errores.push("Sección invalida.");
  if (!fila.curso) errores.push("Falta curso o programa.");
  if (fila.curso && !programaDetectado) errores.push("Curso o programa no coincide con un programa registrado del periodo.");
  if (fila.telefono && !/^\d{9}$/.test(fila.telefono)) errores.push("Teléfono invalido.");
  if (fila.correo && !correoSeguro(fila.correo)) errores.push("Correo invalido o temporal.");
  if (fila.observacion && /[<>]/.test(fila.observacion)) errores.push("Observación contiene caracteres no permitidos.");

  return errores;
}

function textoSeguro(texto) {
  const valor = String(texto ?? "").trim();
  return valor.length > 0 && !/[<>]/.test(valor);
}

function correoSeguro(correo) {
  const valor = String(correo ?? "").trim().toLowerCase();
  const dominio = valor.split("@")[1];
  const temporales = ["tempmail.com", "10minutemail.com", "guerrillamail.com", "mailinator.com", "yopmail.com", "trashmail.com"];
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) && !temporales.includes(dominio);
}

function obtenerValor(fila, nombres) {
  const esperados = nombres.map(normalizarEncabezado);
  const key = Object.keys(fila).find((campo) =>
    esperados.includes(normalizarEncabezado(campo))
  );
  return key ? fila[key] : "";
}

function limpiarTexto(valor) {
  return String(valor ?? "").trim().replace(/[<>]/g, "");
}

function claveAlumno(alumno) {
  if (alumno.dni) return `dni:${alumno.dni}`;
  const nombre = `${alumno.nombres || ""} ${alumno.apellidos || ""}`.trim().toLowerCase();
  return nombre ? `nombre:${nombre}:${alumno.grado}:${alumno.seccion}` : "";
}

function coincideCurso(curso, programa) {
  const normalizar = (texto) => texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const a = normalizar(curso);
  const b = normalizar(programa);
  return a === b || a.includes(b) || b.includes(a);
}

function detectarProgramaPorCurso(curso, programas) {
  if (!curso) return null;
  return programas.find((programa) => coincideCurso(curso, programa.nombre)) || null;
}

function normalizarEncabezado(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s/.-]+/g, "_")
    .replace(/_+/g, "_");
}
