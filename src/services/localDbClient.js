// BASE LOCAL PARA DESARROLLO.
// La fuente principal es server/db.json mediante /api/db.
// En producción será reemplazada por la API del sistema principal.

const STORAGE_KEY = "san_rafael_mock_database_v1";

export const initialData = {
  categorias: ["Academico", "Ingles", "Deportivo", "Verano", "Arte", "Otro"],
  nextProgramaId: 4,
  nextCargaId: 1,
  nextDocumentoId: 1,
  estudiantes: {
    12345678: {
      dni: "12345678",
      codigoEstudiante: "EST-12345678",
      nombres: "Juan Perez Lopez",
      sexo: "M",
      grado: "3 Primaria",
      seccion: "B",
      tipoAlumno: "Alumno interno",
      fechaNacimiento: "2017-05-14",
      estadoInscripcion: "No inscrito",
      apoderado: "Carlos Perez Ramirez",
      telefonoApoderado: "987654321",
    },
    11112222: {
      dni: "11112222",
      codigoEstudiante: "EST-11112222",
      nombres: "Mateo Salazar Torres",
      sexo: "M",
      grado: "5 Primaria",
      seccion: "A",
      tipoAlumno: "Alumno interno",
      fechaNacimiento: "2015-09-22",
      estadoInscripcion: "No inscrito",
      apoderado: "Rosa Torres Vega",
      telefonoApoderado: "976543210",
    },
    22223333: {
      dni: "22223333",
      codigoEstudiante: "EST-22223333",
      nombres: "Camila Torres Ruiz",
      sexo: "F",
      grado: "4 Primaria",
      seccion: "C",
      tipoAlumno: "Alumno interno",
      fechaNacimiento: "2016-03-08",
      estadoInscripcion: "No inscrito",
      apoderado: "",
      telefonoApoderado: "",
    },
  },
  programas: [
    {
      id: "REF-PRI-2026",
      nombre: "Reforzamiento Matematica",
      periodo: "escolar",
      categoria: "Academico",
      grupo: "Primaria 1, 2 y 3",
      horario: "Lunes y miercoles 3:20 p. m. - 4:50 p. m.",
      fechaInicio: "2026-03-10",
      fechaFin: "2026-12-15",
      cupos: 20,
      cuposOcupados: 8,
      costo: 70,
      modalidadCobro: "Mensual",
      responsable: "Prof. Ana Torres",
      tutora: "Srta. Lucia Vega",
      plantilla: "comunicado-reforzamiento.docx",
      plantillaBase64: "",
      plantillaVariables: ["alumno", "grado", "seccion", "apoderado", "celular"],
      plantillaValidada: true,
      plantillaActualizadaEn: "2026-03-01T12:00:00.000Z",
      requisitos: "Traer cuaderno de ejercicios y cartuchera.",
      requiereUniforme: false,
      tallasPolo: [],
      tallasShort: [],
      estado: "Habilitado",
    },
    {
      id: "MAT-SEC-2026",
      nombre: "Matematica avanzada",
      periodo: "escolar",
      categoria: "Academico",
      grupo: "Secundaria 3, 4 y 5",
      horario: "Martes y jueves 4:00 p. m. - 5:30 p. m.",
      fechaInicio: "2026-03-10",
      fechaFin: "2026-12-15",
      cupos: 15,
      cuposOcupados: 15,
      costo: 90,
      modalidadCobro: "Unico",
      responsable: "Prof. Carlos Ruiz",
      tutora: "",
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      plantillaActualizadaEn: "",
      requisitos: "Rendir prueba diagnóstica de ingreso.",
      requiereUniforme: false,
      tallasPolo: [],
      tallasShort: [],
      estado: "Sin cupos",
    },
    {
      id: "DEP-GEN-2026",
      nombre: "Deportes generales",
      periodo: "escolar",
      categoria: "Deportivo",
      grupo: "Primaria y Secundaria",
      horario: "Viernes 3:00 p. m. - 5:00 p. m.",
      fechaInicio: "2026-03-10",
      fechaFin: "2026-12-15",
      cupos: 25,
      cuposOcupados: 10,
      costo: 50,
      modalidadCobro: "Mensual",
      responsable: "Prof. Miguel Soto",
      tutora: "Srta. Rosa Lima",
      plantilla: "ficha-deportes.docx",
      plantillaBase64: "",
      plantillaVariables: ["alumno", "grado", "seccion", "apoderado", "celular"],
      plantillaValidada: true,
      plantillaActualizadaEn: "2026-03-01T12:00:00.000Z",
      requisitos: "Traer botella de agua y zapatillas deportivas.",
      requiereUniforme: true,
      tallasPolo: ["S", "M", "L", "XL"],
      tallasShort: ["S", "M", "L", "XL"],
      estado: "Habilitado",
    },
  ],
  invitadosPorPrograma: {
    "REF-PRI-2026": [
      { dni: "12345678", nombres: "Juan Perez Lopez", grado: "3 Primaria", seccion: "B", periodo: "escolar", estado: "Invitado" },
      { dni: "74521890", nombres: "Lucia Mendoza Paredes", grado: "3 Primaria", seccion: "B", periodo: "escolar", estado: "Invitado" },
    ],
    "DEP-GEN-2026": [
      { dni: "11112222", nombres: "Mateo Salazar Torres", grado: "5 Primaria", seccion: "A", periodo: "escolar", estado: "Invitado" },
    ],
  },
  inscripciones: [],
  documentosGenerados: [],
  pagos: [],
  asistencias: [],
  historialCargas: [],
  usuarios: [
    { id: "1", nombre: "Admin Principal", usuario: "admin", rol: "Administrador", estado: "Activo", contrasena: "1234" },
    { id: "2", nombre: "Maria Secretaria", usuario: "secretaria", rol: "Secretaria", estado: "Activo", contrasena: "1234" },
    { id: "3", nombre: "Jose Caja", usuario: "caja", rol: "Caja", estado: "Activo", contrasena: "1234" },
    { id: "4", nombre: "Ana Coordinadora", usuario: "coordinacion", rol: "Coordinacion", estado: "Activo", contrasena: "1234" },
    { id: "5", nombre: "Auxiliar de Ingreso", usuario: "aux", rol: "Auxiliar", estado: "Activo", contrasena: "1234" },
    { id: "6", nombre: "Direccion General", usuario: "dir", rol: "Direccion", estado: "Activo", contrasena: "1234" },
    { id: "7", nombre: "Profesor Responsable", usuario: "profe", rol: "Coordinacion", estado: "Activo", contrasena: "1234" },
  ],
};

export const mockDb = loadDatabase();

export async function saveMockDb() {
  if (typeof window === "undefined") return;
  const db = await persistirApiLocal(mockDb);
  Object.keys(mockDb).forEach((key) => {
    delete mockDb[key];
  });
  Object.assign(mockDb, mergeWithDefaults(db || mockDb, structuredCloneSafe(initialData)));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDb));
  window.dispatchEvent(new CustomEvent("mock-db-updated"));
}

export async function syncMockDbFromStorage() {
  if (typeof window === "undefined") return mockDb;
  const remoto = await leerApiLocal();
  if (remoto) {
    const freshData = mergeWithDefaults(remoto, structuredCloneSafe(initialData));
    Object.keys(mockDb).forEach((key) => {
      delete mockDb[key];
    });
    Object.assign(mockDb, freshData);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDb));
    return mockDb;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return mockDb;

  try {
    const freshData = mergeWithDefaults(JSON.parse(stored), structuredCloneSafe(initialData));
    Object.keys(mockDb).forEach((key) => {
      delete mockDb[key];
    });
    Object.assign(mockDb, freshData);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDb));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return mockDb;
}

export async function resetMockDb() {
  Object.keys(mockDb).forEach((key) => {
    delete mockDb[key];
  });
  Object.assign(mockDb, structuredCloneSafe(initialData));
  await saveMockDb();
}

export function nextMockId(key) {
  const value = Number(mockDb[key] || 1);
  mockDb[key] = value + 1;
  saveMockDb();
  return value;
}

async function leerApiLocal() {
  try {
    const { localDbApi } = await import("./apiClient.js");
    return await localDbApi.getDatabase();
  } catch {
    return null;
  }
}

async function persistirApiLocal(data) {
  try {
    const { localDbApi } = await import("./apiClient.js");
    return await localDbApi.saveDatabase(data);
  } catch {
    // Si la API local no esta levantada, se conserva un respaldo temporal en localStorage.
    return data;
  }
}

function loadDatabase() {
  if (typeof window === "undefined") return structuredCloneSafe(initialData);

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const data = structuredCloneSafe(initialData);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  try {
    return mergeWithDefaults(JSON.parse(stored), structuredCloneSafe(initialData));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return structuredCloneSafe(initialData);
  }
}

function mergeWithDefaults(stored, defaults) {
  const merged = {
    ...defaults,
    ...stored,
    categorias: stored.categorias || defaults.categorias,
    estudiantes: mergeEstudiantes(defaults.estudiantes, stored.estudiantes || {}),
    programas: stored.programas || defaults.programas,
    invitadosPorPrograma: {
      ...defaults.invitadosPorPrograma,
      ...(stored.invitadosPorPrograma || {}),
    },
    inscripciones: stored.inscripciones || defaults.inscripciones,
    documentosGenerados: stored.documentosGenerados || defaults.documentosGenerados,
    pagos: stored.pagos || defaults.pagos,
    asistencias: stored.asistencias || defaults.asistencias,
    historialCargas: stored.historialCargas || defaults.historialCargas,
    usuarios: stored.usuarios || defaults.usuarios,
  };
  repararDatosBaseDemo(merged, defaults);
  return merged;
}

function mergeEstudiantes(defaults, stored) {
  const estudiantes = { ...defaults, ...stored };
  Object.keys(estudiantes).forEach((dni) => {
    estudiantes[dni] = {
      ...(defaults[dni] || {}),
      ...(stored[dni] || estudiantes[dni]),
    };
  });
  return estudiantes;
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function repararDatosBaseDemo(data, defaults) {
  const programasBase = new Map(defaults.programas.map((programa) => [programa.id, programa]));
  data.programas = data.programas.map((programa) => {
    const base = programasBase.get(programa.id);
    const normalizado = {
      ...programa,
      plantillaVariables: programa.plantillaVariables || [],
      plantillaBase64: programa.plantillaBase64 || "",
      plantillaValidada: Boolean(programa.plantillaValidada),
      plantillaActualizadaEn: programa.plantillaActualizadaEn || "",
      requisitos: programa.requisitos || base?.requisitos || "",
      comunicado: programa.comunicado || base?.comunicado || "",
      detalleCosto: programa.detalleCosto || base?.detalleCosto || "",
      detalleAlmuerzo: programa.detalleAlmuerzo || base?.detalleAlmuerzo || "",
      concesionarios: programa.concesionarios || base?.concesionarios || "",
    };
    if (programa.id === "REF-PRI-2026" || programa.id === "DEP-GEN-2026") {
      return {
        ...normalizado,
        plantilla: programa.plantilla || base?.plantilla || "",
        plantillaBase64: programa.plantillaBase64 || base?.plantillaBase64 || "",
        plantillaVariables: programa.plantillaVariables || base?.plantillaVariables || [],
        plantillaValidada: programa.plantillaValidada ?? base?.plantillaValidada ?? false,
        plantillaActualizadaEn: programa.plantillaActualizadaEn || base?.plantillaActualizadaEn || "",
        periodo: "escolar",
      };
    }
    return normalizado;
  });

  Object.entries(data.invitadosPorPrograma).forEach(([programaId, invitados]) => {
    const programa = data.programas.find((item) => item.id === programaId) || programasBase.get(programaId);
    data.invitadosPorPrograma[programaId] = invitados.map((invitado) => ({
      ...invitado,
      codigoEstudiante: invitado.codigoEstudiante || "",
      periodo: invitado.periodo || programa?.periodo || "escolar",
    }));
  });

  if (data.invitadosPorPrograma["REF-PRI-2026"]) {
    data.invitadosPorPrograma["REF-PRI-2026"] = data.invitadosPorPrograma["REF-PRI-2026"]
      .map((invitado) => invitado.dni === "12345678" ? { ...invitado, periodo: "escolar" } : invitado);
  }
}
