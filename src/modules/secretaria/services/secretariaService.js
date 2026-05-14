import { mockDb, nextMockId, saveMockDb, syncMockDbFromStorage } from "../../../services/localDbClient";
import {
  buscarInvitacionPorDniPeriodo,
  listarProgramas,
  obtenerPrograma,
} from "../../coordinacion/services/coordinacionService";
import { fechaActualInput, fechaActualIso, normalizarFecha, obtenerVentanaInscripcion } from "../../../services/dateService";

export async function buscarEstudiantePorDni(dni, periodo = "escolar") {
  await esperar(350);
  await syncMockDbFromStorage();
  const periodoNormalizado = normalizarPeriodo(periodo);
  const estudiante = mockDb.estudiantes[dni];
  const invitacionPeriodo = await buscarInvitacionPorDniPeriodo(dni, periodoNormalizado);

  if (!estudiante && invitacionPeriodo) {
    return adaptarInvitadoComoEstudiante(invitacionPeriodo, periodoNormalizado);
  }

  if (!estudiante) return null;

  if (invitacionPeriodo) {
    return adaptarEstudianteBase(estudiante, periodoNormalizado, invitacionPeriodo);
  }

  return {
    ...estudiante,
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    estadoInscripcion: obtenerEstadoInscripcionPorPeriodo(dni, periodoNormalizado),
    estadoPago: obtenerEstadoPagoPorPeriodo(dni, periodoNormalizado),
    origenRegistro: "Base general de estudiantes",
    tieneInvitacion: false,
    programaAsignado: "",
    requiereUniforme: false,
  };
}

export async function buscarEstudiantesPorNombre(nombre, periodo = "escolar") {
  await esperar(350);
  await syncMockDbFromStorage();
  const periodoNormalizado = normalizarPeriodo(periodo);
  const termino = normalizarTexto(nombre);
  if (termino.length < 3) return [];

  const resultados = [];
  const vistos = new Set();

  Object.values(mockDb.estudiantes).forEach((estudiante) => {
    const textoBusqueda = normalizarTexto(`${estudiante.nombres} ${estudiante.codigoEstudiante || ""}`);
    if (!textoBusqueda.includes(termino)) return;

    vistos.add(claveAlumno(estudiante));
    const invitacion = buscarInvitacionEnMemoria(estudiante.dni, periodoNormalizado);
    resultados.push(invitacion
      ? adaptarEstudianteBase(estudiante, periodoNormalizado, invitacion)
      : {
          ...estudiante,
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    estadoInscripcion: obtenerEstadoInscripcionPorPeriodo(estudiante.dni, periodoNormalizado),
          estadoPago: obtenerEstadoPagoPorPeriodo(estudiante.dni, periodoNormalizado),
          origenRegistro: "Base general de estudiantes",
          tieneInvitacion: false,
          programaAsignado: "",
          requiereUniforme: false,
        });
  });

  mockDb.programas
    .filter((programa) => normalizarPeriodo(programa.periodo) === periodoNormalizado)
    .forEach((programa) => {
      (mockDb.invitadosPorPrograma[programa.id] || []).forEach((invitado) => {
        const clave = claveAlumno(invitado);
        if (vistos.has(clave)) return;

        const textoBusqueda = normalizarTexto(`${invitado.nombres} ${invitado.codigoEstudiante || ""}`);
        if (!textoBusqueda.includes(termino)) return;

        vistos.add(clave);
        resultados.push(adaptarInvitadoComoEstudiante({
          programaId: programa.id,
          programa,
          invitado,
        }, periodoNormalizado));
      });
    });

  return resultados.slice(0, 8);
}

export async function listarProgramasPorPeriodo(periodo) {
  const programas = await listarProgramas();
  const periodoNormalizado = normalizarPeriodo(periodo);
  return programas
    .filter((programa) =>
      normalizarPeriodo(programa.periodo) === periodoNormalizado &&
      programa.estado === "Habilitado" &&
      Number(programa.cuposDisponibles ?? 0) > 0
    )
    .map(adaptarProgramaCoordinacion);
}

export async function obtenerProgramaPorId(programaId, periodo) {
  const programa = await obtenerPrograma(programaId);
  if (normalizarPeriodo(programa.periodo) !== normalizarPeriodo(periodo)) return null;
  return adaptarProgramaCoordinacion(programa);
}

export async function registrarInscripcion(payload) {
  await esperar(500);
  await syncMockDbFromStorage();
  finalizarProgramasVencidos();

  const programa = mockDb.programas.find((item) => item.id === payload.programaId);
  if (!programa) throw new Error("El programa ya no existe. Coordinación debe revisarlo.");
  if (programa.estado !== "Habilitado") {
    throw new Error("No se puede registrar la inscripción porque el programa no está habilitado.");
  }
  if (Number(programa.cuposOcupados || 0) >= Number(programa.cupos || 0)) {
    throw new Error("No se puede registrar la inscripción porque el programa no tiene cupos disponibles.");
  }
  validarVentanaInscripcionRegular(programa, payload);
  const horarioResuelto = resolverHorarioPorGrado(programa, payload.gradoEstudiante);
  if (tieneHorariosPorGrupo(programa) && !horarioResuelto) {
    throw new Error("El grado del alumno no tiene horario configurado en este programa. Coordinación debe revisar los turnos.");
  }

  const clavesPayload = clavesAlumnoInscripcion(payload);
  const duplicada = mockDb.inscripciones.some((item) =>
    item.programaId === payload.programaId &&
    item.estadoInscripcion !== "Anulada" &&
    clavesAlumnoInscripcion(item).some((clave) => clavesPayload.includes(clave))
  );

  if (duplicada) throw new Error("El alumno ya tiene una inscripción registrada en este programa.");

  const registro = {
    id: `INS-${Date.now().toString().slice(-6)}`,
    estadoInscripcion: "Pendiente de pago",
    estadoPago: "Pendiente",
    fechaRegistro: fechaActualIso(),
    ...payload,
    programa: programa.nombre,
    horario: horarioResuelto || programa.horario,
    docente: programa.responsable || programa.docente || "No definido",
    costo: Number(programa.costo ?? 0),
    modalidadCobro: programa.modalidadCobro || "",
    fechaInicio: programa.fechaInicio || "",
    fechaFin: programa.fechaFin || "",
    gradosAplicables: programa.gradosAplicables || [],
    horariosPorGrupo: programa.horariosPorGrupo || [],
    requisitos: programa.requisitos || "",
    plantilla: programa.plantilla || "",
    plantillaBase64: programa.plantillaBase64 || "",
    plantillaVariables: programa.plantillaVariables || [],
    requiereUniforme: Boolean(programa.requiereUniforme),
  };

  mockDb.inscripciones.push(registro);
  programa.cuposOcupados = Number(programa.cuposOcupados || 0) + 1;

  const estudiante = mockDb.estudiantes[payload.dniEstudiante];
  if (estudiante) {
    estudiante.apoderado = payload.apoderado;
    estudiante.telefonoApoderado = payload.telefono;
  }

  saveMockDb();
  return registro;
}

export async function registrarDocumentoGenerado({
  estudiante,
  inscripcion,
  usuario = "Secretaría",
  tipoDocumento = "Comunicado personalizado",
}) {
  await esperar(250);
  await syncMockDbFromStorage();

  const documento = {
    id: `DOC-${String(nextMockId("nextDocumentoId")).padStart(3, "0")}`,
    alumno: inscripcion.nombresEstudiante || estudiante?.nombres || "",
    dniEstudiante: inscripcion.dniEstudiante || estudiante?.dni || "",
    programa: inscripcion.programa,
    programaId: inscripcion.programaId,
    fecha: fechaActualIso(),
    usuario,
    tipoDocumento,
    plantilla: inscripcion.plantilla || "",
  };

  mockDb.documentosGenerados.unshift(documento);
  saveMockDb();
  return documento;
}

export async function buscarInscripcionEstudiante(estudiante, periodo = "escolar") {
  await esperar(200);
  await syncMockDbFromStorage();

  const periodoNormalizado = normalizarPeriodo(periodo);
  const clavesEstudiante = clavesAlumnoInscripcion(estudiante);
  if (!clavesEstudiante.length) return null;

  const inscripciones = [...mockDb.inscripciones]
    .reverse()
    .filter((item) =>
    item.estadoInscripcion !== "Anulada" &&
      normalizarPeriodo(item.periodo) === periodoNormalizado &&
      clavesAlumnoInscripcion(item).some((clave) => clavesEstudiante.includes(clave))
    );

  const inscripcion = inscripciones.find((item) => item.programaId === estudiante?.programaAsignado) || inscripciones[0] || null;
  return sincronizarInscripcionConProgramaActual(inscripcion);
}

function esperar(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sincronizarInscripcionConProgramaActual(inscripcion) {
  if (!inscripcion) return null;

  const programa = mockDb.programas.find((item) =>
    item.id === inscripcion.programaId ||
    normalizarTexto(item.nombre) === normalizarTexto(inscripcion.programa)
  );
  if (!programa) return inscripcion;

  return {
    ...inscripcion,
    programa: programa.nombre || inscripcion.programa,
    horario: resolverHorarioPorGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || inscripcion.horario,
    docente: programa.responsable || programa.docente || inscripcion.docente || "No definido",
    costo: Number(programa.costo ?? inscripcion.costo ?? 0),
    modalidadCobro: programa.modalidadCobro || inscripcion.modalidadCobro || "",
    fechaInicio: programa.fechaInicio || inscripcion.fechaInicio || "",
    fechaFin: programa.fechaFin || inscripcion.fechaFin || "",
    gradosAplicables: programa.gradosAplicables || inscripcion.gradosAplicables || [],
    horariosPorGrupo: programa.horariosPorGrupo || inscripcion.horariosPorGrupo || [],
    requisitos: programa.requisitos || inscripcion.requisitos || "",
    plantilla: programa.plantilla || inscripcion.plantilla || "",
    plantillaBase64: programa.plantillaBase64 || inscripcion.plantillaBase64 || "",
    plantillaVariables: programa.plantillaVariables || inscripcion.plantillaVariables || [],
    requiereUniforme: Boolean(programa.requiereUniforme),
  };
}

function adaptarProgramaCoordinacion(programa) {
  const periodoNormalizado = normalizarPeriodo(programa.periodo);
  const cuposDisponibles = Math.max(0, Number(programa.cuposDisponibles ?? 0));
  return {
    id: programa.id,
    nombre: programa.nombre,
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    horario: resolverHorarioPorGrado(programa) || programa.horario,
    docente: programa.responsable || programa.docente || "No definido",
    costo: Number(programa.costo ?? 0),
    cupos: cuposDisponibles > 0 ? `${cuposDisponibles} cupos disponibles` : "Sin cupos",
    cuposDisponibles,
    requiereUniforme: Boolean(programa.requiereUniforme),
    uniforme: programa.requiereUniforme ? "Sí" : "No",
    modalidadCobro: programa.modalidadCobro || "",
    fechaInicio: programa.fechaInicio || "",
    fechaFin: programa.fechaFin || "",
    requisitos: programa.requisitos || "",
    plantilla: programa.plantilla || "",
    plantillaBase64: programa.plantillaBase64 || "",
    plantillaVariables: programa.plantillaVariables || [],
    plantillaValidada: Boolean(programa.plantillaValidada),
    estado: programa.estado,
  };
}

function adaptarEstudianteBase(estudiante, periodoNormalizado, invitacionPeriodo) {
  const { programa } = invitacionPeriodo;
  return {
    ...estudiante,
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    estadoInscripcion: obtenerEstadoInscripcionPorPeriodo(estudiante.dni, periodoNormalizado),
    estadoPago: obtenerEstadoPagoPorPeriodo(estudiante.dni, periodoNormalizado),
    origenRegistro: "Base general de estudiantes + carga Excel de Coordinación",
    tieneInvitacion: true,
    programaAsignado: invitacionPeriodo.programaId,
    programaNombre: programa.nombre,
    programaHorario: resolverHorarioPorGrado(programa, estudiante.grado) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario),
    programaDocente: programa.responsable || programa.docente || "No definido",
    programaCosto: Number(programa.costo ?? 0),
    programaCupos: Number(programa.cuposDisponibles ?? programa.cupos ?? 0) > 0 ? "Disponible" : "Sin cupos",
    programaModalidadCobro: programa.modalidadCobro || "",
    programaRequisitos: programa.requisitos || "",
    programaFechaInicio: programa.fechaInicio || "",
    programaFechaFin: programa.fechaFin || "",
    plantilla: programa.plantilla || "",
    plantillaBase64: programa.plantillaBase64 || "",
    plantillaVariables: programa.plantillaVariables || [],
    requiereUniforme: Boolean(programa.requiereUniforme),
  };
}

function adaptarInvitadoComoEstudiante(invitacionPeriodo, periodoNormalizado) {
  const { programa, invitado } = invitacionPeriodo;
  return {
    dni: invitado.dni || "",
    codigoEstudiante: invitado.codigoEstudiante || "",
    nombres: invitado.nombres,
    grado: invitado.grado || "No definido",
    seccion: invitado.seccion || "No definido",
    tipoAlumno: "Alumno invitado",
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    estadoInscripcion: obtenerEstadoInscripcionPorPeriodo(invitado.dni, periodoNormalizado),
    estadoPago: obtenerEstadoPagoPorPeriodo(invitado.dni, periodoNormalizado),
    origenRegistro: "Carga Excel de Coordinación",
    tieneInvitacion: true,
    programaAsignado: invitacionPeriodo.programaId,
    programaNombre: programa.nombre,
    programaHorario: resolverHorarioPorGrado(programa, invitado.grado) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario),
    programaDocente: programa.responsable || programa.docente || "No definido",
    programaCosto: Number(programa.costo ?? 0),
    programaCupos: Number(programa.cuposDisponibles ?? programa.cupos ?? 0) > 0 ? "Disponible" : "Sin cupos",
    programaModalidadCobro: programa.modalidadCobro || "",
    programaRequisitos: programa.requisitos || "",
    programaFechaInicio: programa.fechaInicio || "",
    programaFechaFin: programa.fechaFin || "",
    plantilla: programa.plantilla || "",
    plantillaBase64: programa.plantillaBase64 || "",
    plantillaVariables: programa.plantillaVariables || [],
    requiereUniforme: Boolean(programa.requiereUniforme),
    telefonoApoderado: invitado.telefonoApoderado || "",
  };
}

function buscarInvitacionEnMemoria(dni, periodo) {
  if (!dni) return null;
  const periodoNormalizado = normalizarPeriodo(periodo);

  for (const programa of mockDb.programas) {
    if (normalizarPeriodo(programa.periodo) !== periodoNormalizado) continue;
    const invitado = (mockDb.invitadosPorPrograma[programa.id] || []).find((item) => item.dni === dni);
    if (invitado) return { programaId: programa.id, programa, invitado };
  }

  return null;
}

function resolverHorarioPorGrado(programa, gradoAlumno = "") {
  const grupos = programa?.horariosPorGrupo || [];
  if (!Array.isArray(grupos) || grupos.length === 0) return "";

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.numero) return "";
  const grupo = grupos.find((item) =>
    (item.grados || []).some((grado) => coincideGrado(grado, gradoNormalizado))
  );

  if (!grupo) return "";
  const grados = (grupo.grados || []).map(formatearGrado).filter(Boolean).join(", ");
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

function descomponerGrado(valor) {
  const texto = normalizarTexto(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

function normalizarPeriodo(periodo) {
  return String(periodo || "").toLowerCase().includes("verano") ? "verano" : "escolar";
}

function finalizarProgramasVencidos() {
  const hoy = normalizarFecha(fechaActualInput());
  if (!hoy) return;

  let cambio = false;
  mockDb.programas.forEach((programa) => {
    if (programa.estado === "Finalizado") return;
    const fechaFin = normalizarFecha(programa.fechaFin);
    if (!fechaFin || fechaFin >= hoy) return;

    programa.estado = "Finalizado";
    programa.finalizadoAutomaticamenteEn = programa.finalizadoAutomaticamenteEn || fechaActualIso();
    cambio = true;
  });

  if (cambio) saveMockDb();
}

function validarVentanaInscripcionRegular(programa, payload = {}) {
  if (payload.registroCaja) return;

  const ventana = obtenerVentanaInscripcion(programa.fechaInicio);
  if (ventana.permitida) return;

  throw new Error("La inscripcion regular cerro. Desde el segundo dia de clases, derive al padre a Caja para evaluar y registrar la matricula.");
}

function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obtenerEstadoInscripcionPorPeriodo(dni, periodo) {
  if (!dni) return "No inscrito";
  const inscripcion = [...mockDb.inscripciones]
    .reverse()
    .find((item) =>
      item.dniEstudiante === dni &&
      normalizarPeriodo(item.periodo) === normalizarPeriodo(periodo)
    );

  return inscripcion?.estadoInscripcion || "No inscrito";
}

function obtenerEstadoPagoPorPeriodo(dni, periodo) {
  if (!dni) return "Sin pago";
  const inscripcion = [...mockDb.inscripciones]
    .reverse()
    .find((item) =>
      item.dniEstudiante === dni &&
      normalizarPeriodo(item.periodo) === normalizarPeriodo(periodo)
    );

  return inscripcion?.estadoPago || "Sin pago";
}

function clavesAlumnoInscripcion(alumno) {
  const claves = [];
  if (alumno.dniEstudiante || alumno.dni) claves.push(`dni:${alumno.dniEstudiante || alumno.dni}`);
  if (alumno.codigoEstudiante) claves.push(`codigo:${normalizarTexto(alumno.codigoEstudiante)}`);
  const nombre = normalizarTexto(alumno.nombresEstudiante || alumno.nombres);
  if (nombre) claves.push(`nombre:${nombre}`);
  return claves;
}

function claveAlumno(alumno) {
  if (alumno.dni) return `dni:${alumno.dni}`;
  if (alumno.codigoEstudiante) return `codigo:${normalizarTexto(alumno.codigoEstudiante)}`;
  return `nombre:${normalizarTexto(alumno.nombres)}:${alumno.grado || ""}:${alumno.seccion || ""}`;
}
