import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { renderAsync } from "docx-preview";
import {
  IconFileText as FileText,
  IconLoader2 as Loader2,
  IconPrinter as Printer,
  IconX as X,
} from "@tabler/icons-react";
import {
  calcularDuracionTexto as calcularDuracionFechas,
  formatearFechaPeru,
  normalizarFecha,
} from "../../../services/dateService";
function FichaAceptación({ estudiante, inscripcion, onClose }) {
  const ficha = crearDatosFicha(estudiante, inscripcion);
  const pdfFrameRef = useRef(null);
  const wordPreviewRef = useRef(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [wordPreview, setWordPreview] = useState({ cargando: false, error: "" });
  const [imprimiendoFicha, setImprimiendoFicha] = useState(false);
  const [documento, setDocumento] = useState({
    cargando: true,
    titulo: "Ficha de invitación",
    lineas: [],
    html: "",
    usaPlantilla: false,
    ficha,
  });

  useEffect(() => {
    document.body.classList.add("secretaria-printing-ficha");
    let activo = true;

    crearDocumentoInvitacion(estudiante, inscripcion).then((resultado) => {
      if (activo) setDocumento({ ...resultado, cargando: false });
    });

    return () => {
      activo = false;
      document.body.classList.remove("secretaria-printing-ficha");
    };
  }, [estudiante, inscripcion]);

  useEffect(() => {
    if (documento.cargando) {
      setPdfUrl("");
      setWordPreview({ cargando: false, error: "" });
      return undefined;
    }

    if (inscripcion.plantillaBase64 && wordPreviewRef.current) {
      let activo = true;
      setPdfUrl("");
      setWordPreview({ cargando: true, error: "" });
      wordPreviewRef.current.innerHTML = "";

      generarComunicadoWordBlob({ estudiante, inscripcion, omitirMarcaAguaVista: true })
        .then(async (blob) => {
          if (!activo || !wordPreviewRef.current) return;
          wordPreviewRef.current.innerHTML = "";
          await renderAsync(blob, wordPreviewRef.current, null, {
            className: "secretaria-docx-preview",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            breakPages: false,
            ignoreLastRenderedPageBreak: false,
          });
          prepararVistaDocxParaImpresion(wordPreviewRef.current);
          requestAnimationFrame(() => {
            if (activo) normalizarMarcasAguaDocx(wordPreviewRef.current);
          });
          window.setTimeout(() => {
            if (activo) normalizarMarcasAguaDocx(wordPreviewRef.current);
          }, 300);
          if (activo) setWordPreview({ cargando: false, error: "" });
        })
        .catch(() => {
          if (!activo) return;
          const url = crearUrlPdfInvitacion(documento);
          setPdfUrl(url);
          setWordPreview({
            cargando: false,
            error: "No se pudo mostrar el Word original en la vista. Puede intentar descargar el PDF cuando el convertidor del backend esté disponible.",
          });
        });

      return () => {
        activo = false;
      };
    }

    const url = crearUrlPdfInvitacion(documento);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [documento, estudiante, inscripcion]);

  async function imprimirFicha() {
    if (inscripcion.plantillaBase64) {
      setImprimiendoFicha(true);
      try {
        const word = await generarComunicadoWordBlob({ estudiante, inscripcion, omitirMarcaAguaVista: true });
        try {
          const pdf = await convertirWordOriginalAPdf(word);
          imprimirPdfBlob(pdf);
        } catch {
          await imprimirWordRenderizado(word);
        }
      } catch (err) {
        setWordPreview((actual) => ({
          ...actual,
          cargando: false,
          error: err.message || "No se pudo preparar la impresión.",
        }));
      } finally {
        setImprimiendoFicha(false);
      }
      return;
    }

    if (pdfFrameRef.current?.contentWindow) {
      pdfFrameRef.current.contentWindow.focus();
      pdfFrameRef.current.contentWindow.print();
      return;
    }

    window.print();
  }

  return (
    <div className="secretaria-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="secretaria-card secretaria-ficha-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="secretaria-ficha-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="secretaria-ficha-top">
          <h2 id="secretaria-ficha-title">Ficha de invitación</h2>
          <button className="secretaria-modal-close" type="button" onClick={onClose} aria-label="Cerrar ficha">
            <X size={18} />
          </button>
        </div>

        <div className="secretaria-ficha-paper secretaria-pdf-paper">
          {documento.cargando ? (
            <p>Generando invitación personalizada...</p>
          ) : inscripcion.plantillaBase64 ? (
            <>
              <div className="secretaria-word-ready">
                <FileText size={18} />
                <div>
                  <strong>Vista del Word original personalizado</strong>
                  <span>Es la plantilla cargada por Coordinación con los datos del alumno y apoderado rellenados.</span>
                </div>
              </div>
              {wordPreview.cargando ? <p className="secretaria-word-loading">Preparando vista del Word...</p> : null}
              {wordPreview.error ? <p className="secretaria-word-error">{wordPreview.error}</p> : null}
              <div className="secretaria-word-document" ref={wordPreviewRef} />
            </>
          ) : pdfUrl ? (
            <iframe
              ref={pdfFrameRef}
              className="secretaria-pdf-viewer"
              src={pdfUrl}
              title="Vista PDF de la ficha de invitación"
            />
          ) : (
            <>
              <header>
                <h3>COLEGIO MATEMATICO SAN RAFAEL</h3>
                <strong>{documento.titulo}</strong>
                <span>Carabayllo, {ficha.fecha}</span>
                <span>Código de inscripcion: {ficha.codigo}</span>
              </header>
              <div className="secretaria-invitation-text">
                {documento.lineas.map((linea, index) => (
                  <p key={`${linea}-${index}`}>{linea}</p>
                ))}
              </div>

              <FichaBloque
                titulo="Resumen de invitación"
                items={documento.resumen}
              />
            </>
          )}
        </div>

        <div className="secretaria-ficha-actions">
          <button
            className="secretaria-primary-button"
            type="button"
            onClick={imprimirFicha}
            disabled={imprimiendoFicha || wordPreview.cargando}
          >
            {imprimiendoFicha ? <Loader2 className="secretaria-spin" size={17} /> : <Printer size={17} />}
            <span>{imprimiendoFicha ? "Preparando" : "Imprimir ficha"}</span>
          </button>
          <button className="secretaria-register-button" type="button" onClick={onClose}>Aceptar</button>
        </div>
      </section>
    </div>
  );
}

function FichaBloque({ titulo, items }) {
  return (
    <section className="secretaria-ficha-block">
      <h4>{titulo}</h4>
      {items.map(([label, value]) => (
        <p key={label}>
          <strong>{label}:</strong> {value}
        </p>
      ))}
    </section>
  );
}

async function imprimirInscripcionDirecta(estudiante, inscripcion) {
  if (inscripcion.plantillaBase64) {
    const word = await generarComunicadoWordBlob({ estudiante, inscripcion, omitirMarcaAguaVista: true });
    try {
      const pdf = await convertirWordOriginalAPdf(word);
      imprimirPdfBlob(pdf);
    } catch {
      await imprimirWordRenderizado(word);
    }
    return;
  }

  const documento = await crearDocumentoInvitacion(estudiante, inscripcion);
  const pdf = crearPdfInvitacionDocumento(documento).output("blob");
  imprimirPdfBlob(pdf);
}

function crearDatosFicha(estudiante, inscripcion) {
  const fechaRegistro = normalizarFecha(inscripcion.fechaRegistro) || new Date();

  return {
    codigo: inscripcion.id || "Sin código",
    fecha: formatearFechaFicha(fechaRegistro),
    estudiante: {
      nombre: inscripcion.nombresEstudiante || estudiante.nombres || "No definido",
      dni: inscripcion.dniEstudiante || estudiante.dni || "No definido",
      grado: estudiante.grado || "No aplica",
      seccion: estudiante.seccion || "No aplica",
      periodo: estudiante.periodo || obtenerNombrePeriodo(inscripcion.periodo),
      colegio: inscripcion.colegioProcedencia || "Colegio San Rafael",
    },
    programa: {
      nombre: inscripcion.programa || "No definido",
      horario: inscripcion.horario || "No definido",
      responsable: inscripcion.docente || "No definido",
      costo: `S/ ${Number(inscripcion.costo || 0).toFixed(2)}`,
      modalidadCobro: inscripcion.modalidadCobro || "No definido",
      requisitos: inscripcion.requisitos || "Sin requisitos adicionales",
      plantilla: inscripcion.plantilla || "Sin plantilla asociada",
      uniforme: inscripcion.requiereUniforme ? "Sí" : "No",
      talla: inscripcion.tallaUniforme || "No aplica",
      estado: inscripcion.estadoInscripción || "Pendiente de pago",
      estadoPago: inscripcion.estadoPago || "Pendiente",
    },
    apoderado: {
      nombre: inscripcion.apoderado || "No definido",
      telefono: inscripcion.telefono || "No definido",
      correo: inscripcion.correo || "No registrado",
      medioEnvio: inscripcion.medioEnvio || "No definido",
    },
    observacion: inscripcion.observacion || "Sin observación",
  };
}

async function crearDocumentoInvitacion(estudiante, inscripcion) {
  const ficha = crearDatosFicha(estudiante, inscripcion);
  let lineas = [];
  let html = "";

  if (inscripcion.plantillaBase64) {
    try {
      const plantilla = await extraerPlantillaPersonalizada({
        estudiante,
        inscripcion,
      });
      lineas = plantilla.lineas;
      html = plantilla.html;
    } catch {
      lineas = [];
      html = "";
    }
  }

  if (!lineas.length) {
    lineas = crearLineasInvitacionDefault(ficha);
  }

  return {
    titulo: inscripcion.plantilla
      ? "Ficha de invitación personalizada"
      : "Ficha de invitación al programa extracurricular",
    lineas,
    html,
    usaPlantilla: Boolean(html),
    resumen: crearResumenInvitacion(ficha),
    ficha,
  };
}

async function extraerPlantillaPersonalizada({ estudiante, inscripcion }) {
  const zip = await JSZip.loadAsync(base64ToArrayBuffer(inscripcion.plantillaBase64));
  const datos = crearMapaVariablesDocumento(estudiante, inscripcion);
  const archivosXml = Object.values(zip.files)
    .filter((file) => /^word\/(document|header|footer)\d*\.xml$/i.test(file.name))
    .sort((a, b) => Number(a.name !== "word/document.xml") - Number(b.name !== "word/document.xml"));
  const textos = await Promise.all(archivosXml.map(async (file) =>
    extraerTextoPlanoDocx(await file.async("text"))
  ));
  const htmls = await Promise.all(archivosXml.map(async (file) =>
    convertirDocxXmlAHtml(reemplazarVariablesXml(await file.async("text"), datos))
  ));
  const textoPersonalizado = reemplazarVariablesTexto(textos.join("\n"), datos);
  return {
    lineas: dividirLineasDocumento(textoPersonalizado),
    html: htmls.join(""),
  };
}

function crearLineasInvitacionDefault(ficha) {
  return [
    `Estimado(a) apoderado(a) ${ficha.apoderado.nombre}:`,
    `Por medio de la presente, el Colegio Matemático San Rafael invita al estudiante ${ficha.estudiante.nombre}, del grado ${ficha.estudiante.grado} sección ${ficha.estudiante.seccion}, a participar en el programa extracurricular ${ficha.programa.nombre}.`,
    `El programa se desarrollará en el horario ${ficha.programa.horario}, bajo la responsabilidad de ${ficha.programa.responsable}.`,
    `El costo registrado es ${ficha.programa.costo}, con modalidad de cobro ${ficha.programa.modalidadCobro}.`,
    `Requisitos: ${ficha.programa.requisitos}. Uniforme requerido: ${ficha.programa.uniforme}.`,
    `Telefono de contacto del apoderado: ${ficha.apoderado.telefono}.`,
    `La inscripción queda registrada como ${ficha.programa.estado} y el pago queda ${ficha.programa.estadoPago}.`,
    ficha.observacion !== "Sin observación" ? `Observación: ${ficha.observacion}.` : "",
  ].filter(Boolean);
}

function crearResumenInvitacion(ficha) {
  return [
    ["Estudiante", ficha.estudiante.nombre],
    ["DNI", ficha.estudiante.dni],
    ["Grado y sección", `${ficha.estudiante.grado} ${ficha.estudiante.seccion}`],
    ["Programa invitado", ficha.programa.nombre],
    ["Horario", ficha.programa.horario],
    ["Costo", ficha.programa.costo],
    ["Modalidad", ficha.programa.modalidadCobro],
    ["Requisitos", ficha.programa.requisitos],
    ["Apoderado", ficha.apoderado.nombre],
    ["Celular", ficha.apoderado.telefono],
  ];
}

function extraerTextoPlanoDocx(xml) {
  return decodificarEntidadesXml(String(xml || "")
    .replace(/<\/w:p>/gi, "\n")
    .replace(/<w:tab[^>]*\/>/gi, " ")
    .replace(/<w:br[^>]*\/>/gi, "\n")
    .replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function convertirDocxXmlAHtml(xml) {
  const body = String(xml || "").match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/i)?.[1] || String(xml || "");
  const bloques = body.match(/<w:p[\s\S]*?<\/w:p>|<w:tbl[\s\S]*?<\/w:tbl>/gi) || [];

  return bloques.map((bloque) => {
    if (/^<w:tbl/i.test(bloque)) return convertirTablaDocxAHtml(bloque);
    return convertirParrafoDocxAHtml(bloque);
  }).join("");
}

function convertirParrafoDocxAHtml(parrafo) {
    const texto = extraerTextoPlanoDocx(parrafo);
    if (!texto) return "";
    const clases = ["secretaria-word-paragraph"];
    const alineacion = parrafo.match(/<w:jc[^>]+w:val="([^"]+)"/i)?.[1] || "";
    if (alineacion === "center") clases.push("is-center");
    if (alineacion === "right" || alineacion === "end") clases.push("is-right");
    if (alineacion === "both") clases.push("is-justify");
    const esTitulo = /<w:b\b/i.test(parrafo) && texto.length < 120;
    if (esTitulo) clases.push("is-bold");
    return `<p class="${clases.join(" ")}">${escaparHtml(texto)}</p>`;
}

function convertirTablaDocxAHtml(tabla) {
  const filas = tabla.match(/<w:tr[\s\S]*?<\/w:tr>/gi) || [];
  const filasHtml = filas.map((fila) => {
    const celdas = fila.match(/<w:tc[\s\S]*?<\/w:tc>/gi) || [];
    const celdasHtml = celdas.map((celda) => {
      const parrafos = celda.match(/<w:p[\s\S]*?<\/w:p>/gi) || [];
      const contenido = parrafos
        .map(convertirParrafoDocxAHtml)
        .join("") || "&nbsp;";
      return `<td>${contenido}</td>`;
    }).join("");
    return `<tr>${celdasHtml}</tr>`;
  }).join("");

  return filasHtml ? `<table class="secretaria-word-table"><tbody>${filasHtml}</tbody></table>` : "";
}

function decodificarEntidadesXml(valor) {
  return String(valor || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function reemplazarVariablesTexto(texto, datos) {
  return Object.entries(datos).reduce((actual, [variable, valor]) => {
    const seguro = String(valor ?? "");
    const patrones = [
      new RegExp(`\\{\\{\\s*${escaparRegExp(variable)}\\s*\\}\\}`, "gi"),
      new RegExp(`\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
      new RegExp(`\\[\\[\\s*${escaparRegExp(variable)}\\s*\\]\\]`, "gi"),
      new RegExp(`\\$\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
      new RegExp(`<<\\s*${escaparRegExp(variable)}\\s*>>`, "gi"),
    ];
    return patrones.reduce((textoActual, patron) => textoActual.replace(patron, seguro), actual);
  }, texto);
}

function dividirLineasDocumento(texto) {
  return String(texto || "")
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean);
}

async function descargarComunicadoWord({ estudiante, inscripcion }) {
  const blob = await generarComunicadoWordBlob({ estudiante, inscripcion });
  descargarBlob(blob, `comunicado-${normalizarNombreArchivo(inscripcion.nombresEstudiante)}-${normalizarNombreArchivo(inscripcion.programa)}.docx`);
}

async function generarComunicadoWordBlob({ estudiante, inscripcion, omitirMarcaAguaVista = false }) {
  if (!inscripcion.plantillaBase64) {
    throw new Error("El programa no tiene una plantilla Word cargada por Coordinación.");
  }

  const datos = crearMapaVariablesDocumento(estudiante, inscripcion);
  try {
    const zipPlantilla = new PizZip(base64ToArrayBuffer(inscripcion.plantillaBase64));
    normalizarDelimitadoresPlantilla(zipPlantilla, datos);
    const doc = new Docxtemplater(zipPlantilla, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });
    doc.render(datos);
    if (omitirMarcaAguaVista) {
      removerMarcasAguaWord(doc.getZip());
    }
    return doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  } catch {
    return generarComunicadoWordBlobLegacy({ datos, inscripcion, omitirMarcaAguaVista });
  }
}

function removerMarcasAguaWord(zip) {
  Object.keys(zip.files)
    .filter((name) => /^word\/(document|header|footer)\d*\.xml$/i.test(name))
    .forEach((name) => {
      const file = zip.file(name);
      if (!file) return;
      const xml = file.asText();
      const limpio = quitarBloquesMarcaAguaWord(xml);
      if (limpio !== xml) zip.file(name, limpio);
    });
}

function quitarBloquesMarcaAguaWord(xml) {
  return String(xml || "").replace(/<w:pict\b[^>]*>[\s\S]*?<\/w:pict>/gi, (bloque) => (
    bloque.includes("WordPictureWatermark") ? "" : bloque
  ));
}

function limpiarPaginasDocxVacias(contenedor) {
  contenedor?.classList.remove("is-adapted");
  const paginas = Array.from(contenedor?.querySelectorAll(".docx") || []);
  paginas.forEach((pagina) => {
    const texto = pagina.textContent.replace(/\s+/g, "");
    const tieneContenidoVisual = pagina.querySelector("img, svg, canvas, table, picture");
    const altoContenido = pagina.scrollHeight;
    if (!texto && !tieneContenidoVisual) {
      pagina.remove();
      return;
    }

    if (texto.length < 3 && !tieneContenidoVisual && altoContenido < 80) {
      pagina.remove();
    }
  });
}

function prepararVistaDocxParaImpresion(contenedor) {
  const paginas = Array.from(contenedor?.querySelectorAll(".docx") || []);
  if (!paginas.length) return;

  const paginasConContenido = paginas.filter(paginaTieneContenidoDocx);
  paginas
    .filter((pagina) => !paginasConContenido.includes(pagina))
    .forEach((pagina) => pagina.remove());

  paginasConContenido.forEach((pagina) => {
    const contenido = pagina.querySelector("article") || pagina;
    pagina.style.height = pagina.style.height || "297mm";
    pagina.style.overflow = "visible";
    pagina.style.minHeight = pagina.style.minHeight || "297mm";
    pagina.style.position = "relative";
    contenido.style.position = "relative";
    ajustarDocxAUnaPagina(pagina, contenido);
  });

  normalizarMarcasAguaDocx(contenedor);
}

function ajustarDocxAUnaPagina(pagina, contenido) {
  contenido.style.transform = "";
  contenido.style.transformOrigin = "";
  contenido.style.width = "";

  const altoPagina = pagina.getBoundingClientRect().height || 1122;
  const altoContenido = Math.max(contenido.scrollHeight || 0, pagina.scrollHeight || 0);
  if (!altoPagina || !altoContenido || altoContenido <= altoPagina) return;

  const escala = Math.max(0.68, Math.min(1, (altoPagina - 12) / altoContenido));
  contenido.style.transform = `scale(${escala})`;
  contenido.style.transformOrigin = "top left";
  contenido.style.width = `${100 / escala}%`;
  pagina.style.height = `${altoPagina}px`;
  pagina.style.overflow = "hidden";
}

function normalizarMarcasAguaDocx(contenedor) {
  const paginas = Array.from(contenedor?.querySelectorAll(".docx") || []);
  paginas.forEach((pagina) => {
    const rectPagina = pagina.getBoundingClientRect();
    const anchoPagina = rectPagina.width || leerMedidaCss(pagina, "width") || 794;
    const altoPagina = rectPagina.height || leerMedidaCss(pagina, "height") || 1123;
    const visuales = Array.from(pagina.querySelectorAll("img, svg"));

    visuales.forEach((visual) => {
      const rect = visual.getBoundingClientRect();
      const ancho = rect.width || leerMedidaCss(visual, "width");
      const alto = rect.height || leerMedidaCss(visual, "height");
      const estilo = visual.getAttribute("style") || "";
      const pareceMarcaDeAguaWord = /z-index\s*:\s*-\d+/i.test(estilo);

      if (!pareceMarcaDeAguaWord && (ancho < anchoPagina * 0.45 || alto < altoPagina * 0.28)) return;

      const contenedorMarca = obtenerContenedorMarcaAgua(visual, pagina);
      visual.classList.add("secretaria-docx-watermark");
      visual.setAttribute("aria-hidden", "true");
      if (contenedorMarca !== visual) {
        contenedorMarca.classList.add("secretaria-docx-watermark-holder");
        contenedorMarca.setAttribute("aria-hidden", "true");
      }
    });

    const contenido = pagina.querySelector("article") || pagina;
    Array.from(contenido.children).forEach((hijo) => {
      if (
        hijo.classList.contains("secretaria-docx-watermark") ||
        hijo.classList.contains("secretaria-docx-watermark-holder")
      ) return;
      hijo.style.position = hijo.style.position || "relative";
      hijo.style.zIndex = hijo.style.zIndex || "1";
    });
  });
}

function obtenerContenedorMarcaAgua(visual, pagina) {
  let actual = visual;
  while (actual.parentElement && actual.parentElement !== pagina) {
    const padre = actual.parentElement;
    if (padre.classList.contains("docx") || padre.tagName === "ARTICLE" || padre.tagName === "SECTION") break;
    const texto = padre.textContent.replace(/\s+/g, "").trim();
    const visuales = padre.querySelectorAll("img, svg, canvas, picture").length;
    if (texto || visuales > 1) break;
    actual = padre;
  }
  return actual;
}

function leerMedidaCss(elemento, propiedad) {
  const estilos = [
    elemento?.style?.getPropertyValue(propiedad),
    elemento?.getAttribute?.("style")?.match(new RegExp(`${propiedad}\\s*:\\s*([^;]+)`, "i"))?.[1],
  ].filter(Boolean);

  for (const valor of estilos) {
    const medida = convertirMedidaCssAPx(valor);
    if (medida) return medida;
  }
  return 0;
}

function convertirMedidaCssAPx(valor) {
  const match = String(valor || "").trim().match(/^(-?\d+(?:\.\d+)?)(px|pt|in|cm|mm)?$/i);
  if (!match) return 0;
  const numero = Number(match[1]);
  const unidad = (match[2] || "px").toLowerCase();
  if (!Number.isFinite(numero)) return 0;
  if (unidad === "pt") return numero * (96 / 72);
  if (unidad === "in") return numero * 96;
  if (unidad === "cm") return numero * (96 / 2.54);
  if (unidad === "mm") return numero * (96 / 25.4);
  return numero;
}

function paginaTieneContenidoDocx(pagina) {
  const texto = pagina.textContent.replace(/\s+/g, "").trim();
  const visuales = Array.from(pagina.querySelectorAll("img, svg, canvas, picture"));
  const tablasConContenido = Array.from(pagina.querySelectorAll("table")).some((tabla) =>
    tabla.textContent.replace(/\s+/g, "").trim().length > 0
  );

  return texto.length > 2 || tablasConContenido || visuales.length > 0;
}

async function generarComunicadoWordBlobLegacy({ datos, inscripcion, omitirMarcaAguaVista = false }) {
  const zip = await JSZip.loadAsync(base64ToArrayBuffer(inscripcion.plantillaBase64));
  const archivosXml = Object.values(zip.files).filter((file) =>
    /^word\/(document|header|footer)\d*\.xml$/i.test(file.name)
  );

  await Promise.all(archivosXml.map(async (file) => {
    const xml = await file.async("text");
    const reemplazado = reemplazarVariablesXml(xml, datos);
    zip.file(file.name, omitirMarcaAguaVista ? quitarBloquesMarcaAguaWord(reemplazado) : reemplazado);
  }));

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function normalizarDelimitadoresPlantilla(zip, datos) {
  const variables = Object.keys(datos).map(escaparRegExp).join("|");
  if (!variables) return;

  const patrones = [
    new RegExp(`\\{\\{\\s*(${variables})\\s*\\}\\}`, "gi"),
    new RegExp(`\\[\\[\\s*(${variables})\\s*\\]\\]`, "gi"),
    new RegExp(`\\$\\{\\s*(${variables})\\s*\\}`, "gi"),
    new RegExp(`&lt;&lt;\\s*(${variables})\\s*&gt;&gt;`, "gi"),
  ];

  Object.keys(zip.files)
    .filter((name) => /^word\/(document|header|footer)\d*\.xml$/i.test(name))
    .forEach((name) => {
      const file = zip.file(name);
      const xml = file.asText();
      const normalizado = patrones.reduce(
        (actual, patron) => actual.replace(patron, (_match, variable) => `{${variable}}`),
        xml
      );
      zip.file(name, normalizado);
    });
}

function crearMapaVariablesDocumento(estudiante, inscripcion) {
  const costo = `S/ ${Number(inscripcion.costo || 0).toFixed(2)}`;
  const fechaInicio = formatearFechaInicioRango(inscripcion.fechaInicio, inscripcion.fechaFin);
  const fechaFin = formatearFechaFinRango(inscripcion.fechaInicio, inscripcion.fechaFin);
  const rangoFechas = formatearRangoFechasLetras(inscripcion.fechaInicio, inscripcion.fechaFin);
  const duracion = calcularDuracionTexto(inscripcion.fechaInicio, inscripcion.fechaFin);
  const alumno = inscripcion.nombresEstudiante || estudiante?.nombres || "";
  const apoderado = inscripcion.apoderado || "";
  const telefono = inscripcion.telefono || "";
  const grado = estudiante?.grado || "";
  const seccion = estudiante?.seccion || "";
  const gradoSeccion = `${grado} ${seccion}`.trim();
  const programa = inscripcion.programa || "";
  const fechaActual = formatearFechaFicha(new Date());
  const horario = inscripcion.horario || "";
  const horarioDocumento = crearHorarioDocumento(inscripcion, estudiante);
  const dias = horarioDocumento.dia || extraerDiasHorario(horario);
  const horas = horarioDocumento.clase || extraerHorasHorario(horario);
  const almuerzo = horarioDocumento.almuerzo || extraerAlmuerzoHorario(horario);
  const aula = horarioDocumento.aula || inscripcion.aula || "";
  const horarioCambridge = [dias, horas].filter(Boolean).join(" ");
  const niveles = horarioDocumento.niveles;
  const pago = inscripcion.modalidadCobro || "";
  const anioActual = String(new Date().getFullYear());
  const seleccionCambridge = normalizarSeleccionCambridge(inscripcion.seleccion || estudiante?.seleccion);
  const marcaSeleccion = "X";
  return {
    N_COM: inscripcion.id || "",
    TITULO: `Comunicado ${programa}`.trim(),
    FECHA: fechaActual,
    FECHA_CARTA: fechaActual,
    ANIO_CARTA: anioActual,
    ANIO_CERT: anioActual,
    AREA: "Coordinación de Actividades Extracurriculares",
    PROG: programa,
    CICLO: estudiante?.periodo || obtenerNombrePeriodo(inscripcion.periodo),
    CICLO_I: fechaInicio || rangoFechas,
    CICLO_II: fechaFin || rangoFechas,
    INI: fechaInicio,
    FIN: fechaFin,
    RANGO: rangoFechas,
    VIGENCIA: rangoFechas,
    DUR: duracion,
    N1: niveles[0] || gradoSeccion,
    N2: niveles[1] || "",
    N3: niveles[2] || "",
    N4: niveles[3] || "",
    DIA: dias,
    ALM: almuerzo || "",
    CLASE: horas || horario,
    PAGO: pago,
    COSTO: costo,
    HOR_ALM: almuerzo || "",
    ALUMNO: alumno,
    ALU: alumno,
    GR_SEC: gradoSeccion,
    NIV: gradoSeccion || grado,
    AUL: aula,
    HORARIO: horarioCambridge || horario,
    CHK_A: seleccionCambridge === "A" ? marcaSeleccion : "",
    CHK_B: seleccionCambridge === "B" ? marcaSeleccion : "",
    CHK_C: seleccionCambridge === "C" ? marcaSeleccion : "",
    APOD: apoderado,
    CEL: telefono,
    num: inscripcion.id || "",
    numero: inscripcion.id || "",
    nro: inscripcion.id || "",
    alumno,
    nombre_alumno: alumno,
    "nombre del alumno": alumno,
    estudiante: alumno,
    dni: inscripcion.dniEstudiante || estudiante?.dni || "Sin DNI",
    codigo: inscripcion.codigoEstudiante || estudiante?.codigoEstudiante || "",
    codigo_estudiante: inscripcion.codigoEstudiante || estudiante?.codigoEstudiante || "",
    grado,
    seccion,
    sección: seccion,
    apoderado,
    nombre_apoderado: apoderado,
    "nombre del apoderado": apoderado,
    celular: telefono,
    telefono,
    teléfono: telefono,
    telefono_apoderado: telefono,
    correo: inscripcion.correo || "",
    medio_envio: inscripcion.medioEnvio || "",
    programa: inscripcion.programa || "",
    prog: inscripcion.programa || "",
    curso: inscripcion.programa || "",
    curso_programa: inscripcion.programa || "",
    nivel: estudiante?.grado || "",
    nivel1: grado,
    grado_seccion: gradoSeccion,
    periodo: estudiante?.periodo || obtenerNombrePeriodo(inscripcion.periodo),
    ciclo: estudiante?.periodo || obtenerNombrePeriodo(inscripcion.periodo),
    horario,
    dia: dias,
    dias,
    día: dias,
    días: dias,
    dia1: dias,
    día1: dias,
    hora: horas,
    horas,
    clases: horas || inscripcion.horario || "",
    clase: horas || inscripcion.horario || "",
    clase1: horas || inscripcion.horario || "",
    almuerzo: almuerzo || "",
    alm1: almuerzo || "",
    costo,
    modalidad_cobro: pago,
    requisitos: inscripcion.requisitos || "",
    observacion: inscripcion.observacion || "",
    inicio: fechaInicio,
    fecha_inicio: fechaInicio,
    fin: fechaFin,
    fecha_fin: fechaFin,
    rango: rangoFechas,
    rango_fechas: rangoFechas,
    vigencia: rangoFechas,
    duracion,
    duración: duracion,
    fecha: fechaActual,
  };
}

function reemplazarVariablesXml(xml, datos) {
  return Object.entries(datos).reduce((actual, [variable, valor]) => {
    const seguro = escaparXml(valor);
    const patrones = [
      new RegExp(`\\{\\{\\s*${escaparRegExp(variable)}\\s*\\}\\}`, "gi"),
      new RegExp(`\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
      new RegExp(`\\[\\[\\s*${escaparRegExp(variable)}\\s*\\]\\]`, "gi"),
      new RegExp(`\\$\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
      new RegExp(`&lt;&lt;\\s*${escaparRegExp(variable)}\\s*&gt;&gt;`, "gi"),
    ];
    return patrones.reduce((texto, patron) => texto.replace(patron, seguro), actual);
  }, xml);
}

function base64ToArrayBuffer(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let index = 0; index < binario.length; index += 1) {
    bytes[index] = binario.charCodeAt(index);
  }
  return bytes.buffer;
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escaparXml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escaparRegExp(valor) {
  return String(valor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatearFechaFicha(fecha) {
  return formatearFechaPeru(fecha, formatearFechaPeru(new Date()));
}

function formatearFechaValor(valor) {
  return formatearFechaPeru(valor);
}

function formatearFechaInicioRango(inicio, fin) {
  const fechaInicio = normalizarFecha(inicio);
  const fechaFin = normalizarFecha(fin);
  if (!fechaInicio) return "";

  const mismoAnio = fechaFin && fechaInicio.getFullYear() === fechaFin.getFullYear();
  return formatearFechaLetras(fechaInicio, { incluirAnio: !mismoAnio });
}

function formatearFechaFinRango(inicio, fin) {
  const fechaInicio = normalizarFecha(inicio);
  const fechaFin = normalizarFecha(fin);
  if (!fechaFin) return "";

  const mismoAnio = fechaInicio && fechaInicio.getFullYear() === fechaFin.getFullYear();
  return formatearFechaLetras(fechaFin, { incluirAnio: true, usarDeAnio: mismoAnio });
}

function formatearRangoFechasLetras(inicio, fin) {
  const fechaInicio = normalizarFecha(inicio);
  const fechaFin = normalizarFecha(fin);
  if (!fechaInicio && !fechaFin) return "";
  if (!fechaInicio) return formatearFechaLetras(fechaFin, { incluirAnio: true });
  if (!fechaFin) return formatearFechaLetras(fechaInicio, { incluirAnio: true });
  return `del ${formatearFechaInicioRango(inicio, fin)} al ${formatearFechaFinRango(inicio, fin)}`;
}

function formatearFechaLetras(fecha, { incluirAnio = true, usarDeAnio = true } = {}) {
  if (!fecha) return "";
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const base = `${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
  if (!incluirAnio) return base;
  return `${base}${usarDeAnio ? " de" : ""} ${fecha.getFullYear()}`;
}

function extraerDiasHorario(horario) {
  const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const texto = normalizarComparacion(horario);
  return dias
    .filter((dia) => texto.includes(normalizarComparacion(dia)))
    .join(", ");
}

function normalizarSeleccionCambridge(valor) {
  const texto = normalizarComparacion(valor).replace(/[^abc]/g, "");
  return texto.charAt(0).toUpperCase();
}

function extraerHorasHorario(horario) {
  const matches = [...String(horario || "").matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/gi)]
    .map((match) => {
      const hora = match[1];
      const minuto = match[2] || "00";
      const periodo = match[3] ? ` ${match[3].replace(/\s+/g, "")}` : "";
      return `${hora}:${minuto}${periodo}`;
    });

  return matches.length >= 2 ? `${matches[0]} - ${matches[1]}` : "";
}

function extraerAlmuerzoHorario(horario) {
  const match = String(horario || "").match(/almuerzo\s+([^,·/]+)/i);
  return match?.[1]?.trim() || "";
}

function crearHorarioDocumento(inscripcion, estudiante) {
  const grupos = Array.isArray(inscripcion?.horariosPorGrupo) ? inscripcion.horariosPorGrupo : [];
  const gradoAlumno = inscripcion?.gradoEstudiante || inscripcion?.grado || estudiante?.grado || "";
  const grupo = grupos.find((item) => (item.grados || []).some((grado) => coincideGradoDocumento(grado, gradoAlumno)));
  const gradoDelTurno = grupo?.grados?.find((grado) => coincideGradoDocumento(grado, gradoAlumno)) || gradoAlumno;
  const nivelesTurno = gradoDelTurno ? [formatearGradoDocumento(gradoDelTurno)] : [];
  if (!grupo) {
    return {
      dia: extraerDiasHorario(inscripcion?.horario),
      almuerzo: extraerAlmuerzoHorario(inscripcion?.horario),
      clase: extraerHorasHorario(inscripcion?.horario),
      aula: inscripcion?.aula || "",
      niveles: nivelesTurno,
    };
  }

  return {
    dia: grupo.dia || "",
    almuerzo: formatearRangoHoraDocumento(grupo.almuerzoInicio, grupo.almuerzoFin),
    clase: formatearRangoHoraDocumento(grupo.horaInicio, grupo.horaFin),
    aula: grupo.aula || "",
    niveles: nivelesTurno,
  };
}

function coincideGradoDocumento(valorGrupo, gradoAlumno) {
  const grupo = descomponerGradoDocumento(valorGrupo);
  const alumno = descomponerGradoDocumento(gradoAlumno);
  if (!grupo.numero || !alumno.numero) return false;
  if (grupo.numero !== alumno.numero) return false;
  return !grupo.nivel || !alumno.nivel || grupo.nivel === alumno.nivel;
}

function descomponerGradoDocumento(valor) {
  const texto = normalizarComparacion(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

function formatearGradoDocumento(valor) {
  const texto = String(valor || "").replace(/^(Inicial|Primaria|Secundaria):/i, "").trim();
  if (!texto) return "";
  if (/años?/i.test(texto)) return texto.toUpperCase();
  const numero = texto.match(/\d+/)?.[0];
  if (!numero) return texto.toUpperCase();
  return `${numero}°GRADO`;
}

function formatearRangoHoraDocumento(inicio, fin) {
  if (!inicio || !fin) return "";
  return `${formatearHoraDocumento(inicio)} a ${formatearHoraDocumento(fin)}`;
}

function formatearHoraDocumento(valor) {
  const match = String(valor || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return valor || "";
  const hora = Number(match[1]);
  const minutos = match[2];
  const hora12 = hora > 12 ? hora - 12 : hora || 12;
  return `${hora12}:${minutos}`;
}

function normalizarComparacion(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function calcularDuracionTexto(inicio, fin) {
  return calcularDuracionFechas(inicio, fin);
}

function obtenerNombrePeriodo(periodo) {
  return String(periodo || "").toLowerCase().includes("verano")
    ? "Ciclo verano"
    : "Año escolar";
}

function crearHtmlImpresionInvitacion(documento) {
  const ficha = documento.ficha || {};
  const lineasHtml = (documento.lineas || [])
    .map((linea) => `<p>${escaparHtml(linea)}</p>`)
    .join("");
  const resumenHtml = (documento.resumen || [])
    .map(([label, value]) => `<p><strong>${escaparHtml(label)}:</strong> ${escaparHtml(value)}</p>`)
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>Ficha de invitación ${escaparHtml(ficha.codigo || "")}</title>
        <style>
          @page { size: A4; margin: 18mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #253244; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; }
          main { width: 100%; }
          header { display: grid; justify-items: center; gap: 6px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #cbd5df; text-align: center; }
          h3 { margin: 0; font-size: 16px; letter-spacing: 0; }
          h4 { margin: 18px 0 8px; font-size: 13px; }
          p, strong, span { font-size: 12px; line-height: 1.55; }
          p { margin: 6px 0; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <h3>COLEGIO MATEMATICO SAN RAFAEL</h3>
            <strong>${escaparHtml(documento.titulo || "Ficha de invitación")}</strong>
            <span>Carabayllo, ${escaparHtml(ficha.fecha || "")}</span>
            <span>Código de inscripcion: ${escaparHtml(ficha.codigo || "")}</span>
          </header>
          ${lineasHtml}
          <h4>Resumen de invitación</h4>
          ${resumenHtml}
        </main>
      </body>
    </html>
  `;
}

function crearPdfInvitacionDocumento(documento) {
  const ficha = documento.ficha || {};
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margen = 18;
  const anchoTexto = 174;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("COLEGIO MATEMATICO SAN RAFAEL", 105, y, { align: "center" });
  y += 7;
  doc.setFontSize(11);
  doc.text(documento.titulo || "Ficha de invitación", 105, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Carabayllo, ${ficha.fecha || ""}`, 105, y, { align: "center" });
  y += 5;
  doc.text(`Código de inscripcion: ${ficha.codigo || ""}`, 105, y, { align: "center" });
  y += 9;
  doc.line(margen, y, 210 - margen, y);
  y += 9;

  (documento.lineas || []).forEach((linea) => {
    y = agregarParrafoPdf(doc, linea, margen, y, anchoTexto);
  });

  y = agregarBloquePdf(doc, "Resumen de invitación", documento.resumen || [], margen, y, anchoTexto);
  return doc;
}

function crearUrlPdfInvitacion(documento) {
  const doc = crearPdfInvitacionDocumento(documento);
  return URL.createObjectURL(doc.output("blob"));
}

async function convertirWordOriginalAPdf(wordBlob) {
  const formData = new FormData();
  formData.append(
    "archivo",
    wordBlob,
    "ficha.docx"
  );

  const response = await fetch("/api/secretaria/documentos/pdf", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "No se pudo convertir el Word original a PDF.");
  }

  return await response.blob();
}

function imprimirPdfBlob(pdfBlob) {
  const url = URL.createObjectURL(pdfBlob);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = url;

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  document.body.appendChild(iframe);
  setTimeout(() => {
    iframe.remove();
    URL.revokeObjectURL(url);
  }, 60000);
}

async function imprimirWordRenderizado(wordBlob) {
  const contenedor = document.createElement("div");
  contenedor.className = "secretaria-word-document";
  contenedor.style.position = "fixed";
  contenedor.style.left = "-10000px";
  contenedor.style.top = "0";
  contenedor.style.width = "210mm";
  contenedor.style.background = "#ffffff";
  document.body.appendChild(contenedor);

  try {
    await renderAsync(wordBlob, contenedor, null, {
      className: "secretaria-docx-preview",
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      breakPages: false,
      ignoreLastRenderedPageBreak: false,
    });
    prepararVistaDocxParaImpresion(contenedor);
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        normalizarMarcasAguaDocx(contenedor);
        window.setTimeout(() => {
          prepararVistaDocxParaImpresion(contenedor);
          normalizarMarcasAguaDocx(contenedor);
          resolve();
        }, 300);
      });
    });
    await imprimirHtmlRenderizado(contenedor.innerHTML);
  } finally {
    contenedor.remove();
  }
}

function imprimirHtmlRenderizado(html) {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      resolve();
      return;
    }

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>${obtenerEstilosParaImpresion()}</style>
          <style>
            @page { size: A4; margin: 0; }
            html, body { margin: 0; padding: 0; background: #ffffff; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .secretaria-word-print-root {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: #ffffff;
            }
            .secretaria-word-print-root .docx-wrapper {
              padding: 0 !important;
              background: #ffffff !important;
              box-shadow: none !important;
            }
            .secretaria-word-print-root .docx {
              margin: 0 auto !important;
              box-shadow: none !important;
              height: 297mm !important;
              min-height: 297mm !important;
              overflow: hidden !important;
            }
          </style>
        </head>
        <body>
          <main class="secretaria-word-document secretaria-word-print-root">${html}</main>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        iframe.remove();
        resolve();
      }, 1000);
    }, 350);
  });
}

function obtenerEstilosParaImpresion() {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || []).map((rule) => rule.cssText).join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");
}

function crearHtmlImpresionFicha(ficha) {
  const bloques = [
    ["Datos del estudiante", [
      ["Nombre y apellido", ficha.estudiante.nombre],
      ["DNI", ficha.estudiante.dni],
      ["Grado", ficha.estudiante.grado],
      ["Sección", ficha.estudiante.seccion],
      ["Periodo", ficha.estudiante.periodo],
      ["Colegio de procedencia", ficha.estudiante.colegio],
    ]],
    ["Datos del programa", [
      ["Programa / taller", ficha.programa.nombre],
      ["Horario", ficha.programa.horario],
      ["Responsable", ficha.programa.responsable],
      ["Costo referencial", ficha.programa.costo],
      ["Modalidad de cobro", ficha.programa.modalidadCobro],
      ["Requisitos", ficha.programa.requisitos],
      ["Plantilla utilizada", ficha.programa.plantilla],
      ["Uniforme requerido", ficha.programa.uniforme],
      ["Talla", ficha.programa.talla],
      ["Estado", ficha.programa.estado],
      ["Estado de pago", ficha.programa.estadoPago],
    ]],
    ["Datos del padre / apoderado", [
      ["Nombre del padre o apoderado", ficha.apoderado.nombre],
      ["Teléfono", ficha.apoderado.telefono],
    ]],
  ];

  const bloquesHtml = bloques.map(([titulo, items]) => `
    <section>
      <h4>${escaparHtml(titulo)}</h4>
      ${items.map(([label, value]) => `<p><strong>${escaparHtml(label)}:</strong> ${escaparHtml(value)}</p>`).join("")}
    </section>
  `).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>Ficha de aceptacion ${escaparHtml(ficha.codigo)}</title>
        <style>
          @page { size: A4; margin: 18mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #253244; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; }
          main { width: 100%; }
          header { display: grid; justify-items: center; gap: 6px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #cbd5df; text-align: center; }
          h3 { margin: 0; font-size: 16px; letter-spacing: 0; }
          h4 { margin: 16px 0 8px; font-size: 13px; }
          p, strong, span { font-size: 12px; line-height: 1.5; }
          p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <h3>COLEGIO MATEMATICO SAN RAFAEL</h3>
            <strong>Ficha de aceptacion del programa extracurricular</strong>
            <span>Carabayllo, ${escaparHtml(ficha.fecha)}</span>
            <span>Código de inscripcion: ${escaparHtml(ficha.codigo)}</span>
          </header>
          <p>Por medio de la presente, se deja constancia de que el padre o apoderado acepta la inscripcion del estudiante en el programa indicado, de acuerdo con las condiciones establecidas por la institución.</p>
          ${bloquesHtml}
          <h4>Aceptación</h4>
          <p>El padre o apoderado declara haber leído y aceptado las condiciones del programa. Esta ficha sera presentada en Caja para continuar con el proceso de pago.</p>
          <p><strong>Observación:</strong> ${escaparHtml(ficha.observacion)}</p>
        </main>
      </body>
    </html>
  `;
}

function descargarFichaPdf(ficha) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margen = 18;
  const anchoTexto = 174;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("COLEGIO MATEMATICO SAN RAFAEL", 105, y, { align: "center" });
  y += 7;
  doc.setFontSize(11);
  doc.text("Ficha de aceptacion del programa extracurricular", 105, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Carabayllo, ${ficha.fecha}`, 105, y, { align: "center" });
  y += 5;
  doc.text(`Código de inscripcion: ${ficha.codigo}`, 105, y, { align: "center" });
  y += 9;
  doc.line(margen, y, 210 - margen, y);
  y += 9;

  y = agregarParrafoPdf(doc, "Por medio de la presente, se deja constancia de que el padre o apoderado acepta la inscripcion del estudiante en el programa indicado, de acuerdo con las condiciones establecidas por la institución.", margen, y, anchoTexto);

  y = agregarBloquePdf(doc, "Datos del estudiante", [
    ["Nombre y apellido", ficha.estudiante.nombre],
    ["DNI", ficha.estudiante.dni],
    ["Grado", ficha.estudiante.grado],
    ["Sección", ficha.estudiante.seccion],
    ["Periodo", ficha.estudiante.periodo],
    ["Colegio de procedencia", ficha.estudiante.colegio],
  ], margen, y, anchoTexto);

  y = agregarBloquePdf(doc, "Datos del programa", [
    ["Programa / taller", ficha.programa.nombre],
    ["Horario", ficha.programa.horario],
    ["Responsable", ficha.programa.responsable],
    ["Costo referencial", ficha.programa.costo],
    ["Modalidad de cobro", ficha.programa.modalidadCobro],
    ["Requisitos", ficha.programa.requisitos],
    ["Plantilla utilizada", ficha.programa.plantilla],
    ["Uniforme requerido", ficha.programa.uniforme],
    ["Talla", ficha.programa.talla],
    ["Estado", ficha.programa.estado],
    ["Estado de pago", ficha.programa.estadoPago],
  ], margen, y, anchoTexto);

  y = agregarBloquePdf(doc, "Datos del padre / apoderado", [
    ["Nombre del padre o apoderado", ficha.apoderado.nombre],
    ["Teléfono", ficha.apoderado.telefono],
  ], margen, y, anchoTexto);

  doc.setFont("helvetica", "bold");
  doc.text("Aceptación", margen, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  y = agregarParrafoPdf(doc, "El padre o apoderado declara haber leído y aceptado las condiciones del programa. Esta ficha sera presentada en Caja para continuar con el proceso de pago.", margen, y, anchoTexto);
  agregarParrafoPdf(doc, `Observación: ${ficha.observacion}`, margen, y, anchoTexto);

  doc.save(`ficha-aceptacion-${normalizarNombreArchivo(ficha.codigo)}.pdf`);
}

function agregarBloquePdf(doc, titulo, items, x, y, anchoTexto) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(titulo, x, y + 4);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  items.forEach(([label, value]) => {
    const lineas = doc.splitTextToSize(`${label}: ${value}`, anchoTexto);
    doc.text(lineas, x, y);
    y += lineas.length * 5;
  });

  return y + 4;
}

function agregarParrafoPdf(doc, texto, x, y, anchoTexto) {
  doc.setFontSize(10);
  const lineas = doc.splitTextToSize(texto, anchoTexto);
  doc.text(lineas, x, y);
  return y + lineas.length * 5 + 5;
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarNombreArchivo(valor) {
  return String(valor || "sin-codigo")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sin-codigo";
}

export { FichaAceptación, imprimirInscripcionDirecta };

