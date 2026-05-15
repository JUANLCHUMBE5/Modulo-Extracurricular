import { mockDb, saveMockDb, syncMockDbFromStorage } from "../../../services/localDbClient";
import { fechaActualIso, obtenerVentanaInscripcion } from "../../../services/dateService";

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerResumenPadre(dni) {
  await delay();
  await syncMockDbFromStorage();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const estudiante = mockDb.estudiantes[dniLimpio] || null;

  if (!estudiante) {
    throw new Error("No se encontró información del estudiante.");
  }

  const invitaciones = obtenerInvitaciones(dniLimpio);
  const inscripciones = obtenerInscripciones(estudiante, dniLimpio);
  const pagos = obtenerPagos(dniLimpio, inscripciones);
  const documentos = obtenerDocumentos(dniLimpio, estudiante);
  const inscripcionActual = inscripciones[0] || null;
  const invitacionActual = invitaciones[0] || null;

  return {
    estudiante,
    invitaciones,
    inscripciones,
    pagos,
    documentos,
    inscripcionActual,
    invitacionActual,
    estadoGeneral: calcularEstadoGeneral(inscripcionActual, invitacionActual),
  };
}

export async function guardarDatosApoderadoPadres(dni, datos) {
  await delay(300);
  await syncMockDbFromStorage();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const estudiante = mockDb.estudiantes[dniLimpio];
  if (!estudiante) throw new Error("No se encontró información del estudiante.");

  estudiante.apoderado = limpiarTexto(datos.apoderado);
  estudiante.telefonoApoderado = limpiarTexto(datos.telefono);
  estudiante.correoApoderado = limpiarTexto(datos.correo);
  estudiante.medioEnvio = limpiarTexto(datos.medioEnvio);

  mockDb.inscripciones = mockDb.inscripciones.map((inscripcion) => {
    if (inscripcion.dniEstudiante !== dniLimpio) return inscripcion;
    return {
      ...inscripcion,
      apoderado: estudiante.apoderado,
      telefono: estudiante.telefonoApoderado,
      correo: estudiante.correoApoderado,
      medioEnvio: estudiante.medioEnvio,
    };
  });

  saveMockDb();
  return estudiante;
}

export async function registrarInscripcionPadres(dni, datos, programaId = "") {
  await delay(400);
  await syncMockDbFromStorage();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const estudiante = mockDb.estudiantes[dniLimpio];
  if (!estudiante) throw new Error("No se encontró información del estudiante.");

  const invitacion = obtenerInvitaciones(dniLimpio)[0];
  const programaSeleccionadoId = programaId || invitacion?.programaId;
  if (!programaSeleccionadoId) throw new Error("Seleccione un curso disponible para registrar.");

  const programa = mockDb.programas.find((item) => item.id === programaSeleccionadoId);
  if (!programa) throw new Error("El programa ya no existe. Coordinación debe revisarlo.");
  if (programa.estado !== "Habilitado") throw new Error("El programa no está habilitado.");

  const ventana = obtenerVentanaInscripcion(programa.fechaInicio);
  if (!ventana.permitida) {
    throw new Error("La inscripción web cerró. Desde el segundo día de clases, acérquese a Caja para evaluar el registro.");
  }

  if (Number(programa.cuposOcupados || 0) >= Number(programa.cupos || 0)) {
    throw new Error("El programa no tiene cupos disponibles.");
  }

  const duplicada = mockDb.inscripciones.some((item) =>
    item.programaId === programa.id &&
    item.estadoInscripcion !== "Anulada" &&
    item.dniEstudiante === dniLimpio
  );
  if (duplicada) throw new Error("El estudiante ya tiene una inscripción registrada en este programa.");

  const registro = {
    id: `INS-${Date.now().toString().slice(-6)}`,
    programaId: programa.id,
    periodo: programa.periodo,
    programa: programa.nombre,
    horario: invitacion?.horario || resolverHorarioPorGrado(programa, estudiante.grado) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || "Horario por confirmar",
    docente: programa.responsable || programa.docente || "No definido",
    costo: Number(programa.costo ?? 0),
    modalidadCobro: programa.modalidadCobro || "",
    fechaInicio: programa.fechaInicio || "",
    fechaFin: programa.fechaFin || "",
    requisitos: programa.requisitos || "",
    comunicado: programa.comunicado || "",
    detalleCosto: programa.detalleCosto || "",
    detalleAlmuerzo: programa.detalleAlmuerzo || "",
    concesionarios: programa.concesionarios || "",
    plantilla: programa.plantilla || "",
    plantillaBase64: programa.plantillaBase64 || "",
    plantillaVariables: programa.plantillaVariables || [],
    requiereUniforme: Boolean(programa.requiereUniforme),
    dniEstudiante: dniLimpio,
    codigoEstudiante: estudiante.codigoEstudiante || "",
    nombresEstudiante: estudiante.nombres,
    gradoEstudiante: estudiante.grado,
    grado: estudiante.grado,
    seccion: estudiante.seccion,
    apoderado: limpiarTexto(datos.apoderado || estudiante.apoderado),
    telefono: limpiarTexto(datos.telefono || estudiante.telefonoApoderado),
    correo: limpiarTexto(datos.correo || estudiante.correoApoderado),
    medioEnvio: limpiarTexto(datos.medioEnvio || estudiante.medioEnvio || "WhatsApp"),
    observacion: invitacion ? "Registro solicitado desde portal de padres." : "Registro libre solicitado desde portal de padres.",
    estadoInscripcion: "Pendiente de pago",
    estadoPago: "Pendiente",
    origenRegistro: "Portal padres",
    fechaRegistro: fechaActualIso(),
  };

  mockDb.inscripciones.push(registro);
  programa.cuposOcupados = Number(programa.cuposOcupados || 0) + 1;
  saveMockDb();
  return registro;
}

function obtenerInvitaciones(dni) {
  const resultado = [];

  mockDb.programas.forEach((programa) => {
    const invitados = mockDb.invitadosPorPrograma[programa.id] || [];
    invitados
      .filter((invitado) => invitado.dni === dni)
      .forEach((invitado) => {
        resultado.push({
          id: `${programa.id}-${invitado.dni || invitado.codigoEstudiante || invitado.nombres}`,
          programaId: programa.id,
          programa: programa.nombre,
          periodo: normalizarPeriodoTexto(programa.periodo),
          horario: resolverHorarioPorGrado(programa, invitado.grado) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || "Horario por confirmar",
          responsable: programa.responsable || programa.docente || "Responsable por definir",
          costo: Number(programa.costo || 0),
          modalidadCobro: programa.modalidadCobro || "No definido",
          requisitos: programa.requisitos || "Sin requisitos adicionales",
          comunicado: programa.comunicado || "",
          detalleCosto: programa.detalleCosto || "",
          detalleAlmuerzo: programa.detalleAlmuerzo || "",
          concesionarios: programa.concesionarios || "",
          requiereUniforme: Boolean(programa.requiereUniforme),
          estadoPrograma: programa.estado || "No definido",
          estadoInvitacion: invitado.estado || "Invitado",
          fechaInicio: programa.fechaInicio || "",
          fechaFin: programa.fechaFin || "",
          ventanaInscripcion: obtenerVentanaInscripcion(programa.fechaInicio),
        });
      });
  });

  return resultado;
}

function obtenerInscripciones(estudiante, dni) {
  const claves = new Set([
    dni ? `dni:${dni}` : "",
    estudiante.codigoEstudiante ? `codigo:${normalizarTexto(estudiante.codigoEstudiante)}` : "",
    estudiante.nombres ? `nombre:${normalizarTexto(estudiante.nombres)}` : "",
  ].filter(Boolean));

  return [...mockDb.inscripciones]
    .filter((inscripcion) => {
      const clavesInscripcion = [
        inscripcion.dniEstudiante ? `dni:${inscripcion.dniEstudiante}` : "",
        inscripcion.codigoEstudiante ? `codigo:${normalizarTexto(inscripcion.codigoEstudiante)}` : "",
        inscripcion.nombresEstudiante ? `nombre:${normalizarTexto(inscripcion.nombresEstudiante)}` : "",
      ].filter(Boolean);

      return clavesInscripcion.some((clave) => claves.has(clave));
    })
    .map(sincronizarInscripcionConPrograma)
    .sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
}

function obtenerPagos(dni, inscripciones) {
  const idsInscripcion = new Set(inscripciones.map((item) => item.id));
  return [...(mockDb.pagos || [])]
    .filter((pago) => pago.dniEstudiante === dni || idsInscripcion.has(pago.inscripcionId))
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
}

function obtenerDocumentos(dni, estudiante) {
  const nombre = normalizarTexto(estudiante.nombres);
  return [...(mockDb.documentosGenerados || [])]
    .filter((documento) =>
      documento.dniEstudiante === dni ||
      normalizarTexto(documento.alumno) === nombre
    )
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
}

function sincronizarInscripcionConPrograma(inscripcion) {
  const programa = mockDb.programas.find((item) =>
    item.id === inscripcion.programaId ||
    normalizarTexto(item.nombre) === normalizarTexto(inscripcion.programa)
  );

  if (!programa) {
    return normalizarInscripcion(inscripcion);
  }

  return normalizarInscripcion({
    ...inscripcion,
    programa: programa.nombre || inscripcion.programa,
    horario: resolverHorarioPorGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || inscripcion.horario,
    docente: programa.responsable || programa.docente || inscripcion.docente,
    costo: Number(programa.costo ?? inscripcion.costo ?? 0),
    modalidadCobro: programa.modalidadCobro || inscripcion.modalidadCobro,
    fechaInicio: programa.fechaInicio || inscripcion.fechaInicio,
    fechaFin: programa.fechaFin || inscripcion.fechaFin,
    requisitos: programa.requisitos || inscripcion.requisitos,
    comunicado: programa.comunicado || inscripcion.comunicado || "",
    detalleCosto: programa.detalleCosto || inscripcion.detalleCosto || "",
    detalleAlmuerzo: programa.detalleAlmuerzo || inscripcion.detalleAlmuerzo || "",
    concesionarios: programa.concesionarios || inscripcion.concesionarios || "",
    requiereUniforme: Boolean(programa.requiereUniforme),
    estadoPrograma: programa.estado || "",
  });
}

function normalizarInscripcion(inscripcion) {
  return {
    ...inscripcion,
    estadoInscripcion: obtenerEstadoInscripcion(inscripcion),
    estadoPago: inscripcion.estadoPago || "Pendiente",
    costo: Number(inscripcion.costo || 0),
  };
}

function obtenerEstadoInscripcion(inscripcion) {
  return inscripcion.estadoInscripcion ||
    inscripcion.estadoInscripción ||
    inscripcion.estadoInscripción ||
    inscripcion.estadoInscripción ||
    "Pendiente";
}

function resolverHorarioPorGrado(programa, gradoAlumno = "") {
  const grupos = programa?.horariosPorGrupo || [];
  if (!Array.isArray(grupos) || grupos.length === 0) return "";

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.numero) return "";
  let gradoDelTurno = "";
  const grupo = grupos.find((item) => {
    gradoDelTurno = (item.grados || []).find((grado) => coincideGrado(grado, gradoNormalizado)) || "";
    return Boolean(gradoDelTurno);
  });

  if (!grupo) return "";
  const grados = formatearGrado(gradoDelTurno || gradoAlumno);
  const aula = grupo.aula ? ` · Aula ${grupo.aula}` : "";
  return `${grados ? `${grados}: ` : ""}${grupo.dia} almuerzo ${grupo.almuerzoInicio || "14:20"}-${grupo.almuerzoFin || "15:10"}, clase ${grupo.horaInicio || ""}-${grupo.horaFin || ""}${aula}`;
}

function coincideGrado(gradoGrupo, gradoAlumnoNormalizado) {
  const grupo = descomponerGrado(gradoGrupo);
  if (!grupo.numero || !gradoAlumnoNormalizado?.numero) return false;
  if (grupo.numero !== gradoAlumnoNormalizado.numero) return false;
  return !grupo.nivel || !gradoAlumnoNormalizado.nivel || grupo.nivel === gradoAlumnoNormalizado.nivel;
}

function formatearGrado(valor) {
  const [nivel, grado] = String(valor || "").split(":");
  if (!nivel || !grado) return valor;
  return `${nivel} ${grado}`;
}

function tieneHorariosPorGrupo(programa) {
  return Array.isArray(programa?.horariosPorGrupo) && programa.horariosPorGrupo.length > 0;
}

function calcularEstadoGeneral(inscripcion, invitacion) {
  if (inscripcion) {
    if (String(inscripcion.estadoPago || "").toLowerCase().includes("pag")) {
      return { texto: "Inscrito con pago registrado", tono: "success" };
    }
    return { texto: "Inscripción pendiente de pago", tono: "warning" };
  }

  if (invitacion) {
    return { texto: "Invitación disponible", tono: "info" };
  }

  return { texto: "Sin programa asignado", tono: "neutral" };
}

function normalizarPeriodoTexto(periodo) {
  return String(periodo || "").toLowerCase().includes("verano") ? "Ciclo verano" : "Año escolar";
}

function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function descomponerGrado(valor) {
  const texto = normalizarTexto(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

function limpiarTexto(texto) {
  return String(texto || "").trim().replace(/\s+/g, " ");
}

export async function obtenerProgramasCoordinacion() {
  await delay(300);
  await syncMockDbFromStorage();
  return mockDb.programas.map((programa) => {
    const cupos = Number(programa.cupos || 0);
    const cuposOcupados = Number(programa.cuposOcupados || 0);
    const cuposDisponibles = Math.max(0, cupos - cuposOcupados);
    const ventanaInscripcion = obtenerVentanaInscripcion(programa.fechaInicio);

    return {
      id: programa.id,
      nombre: programa.nombre,
      categoria: programa.categoria,
      horario: programa.horario || "Por confirmar",
      periodo: normalizarPeriodoTexto(programa.periodo),
      estado: programa.estado || "Habilitado",
      cupos,
      cuposOcupados,
      cuposDisponibles,
      costo: Number(programa.costo || 0),
      responsable: programa.responsable || programa.docente || "Por definir",
      fechaInicio: programa.fechaInicio || "",
      fechaFin: programa.fechaFin || "",
      ventanaInscripcion,
      registrable: programa.estado === "Habilitado" && cuposDisponibles > 0 && ventanaInscripcion.permitida,
    };
  });
}
