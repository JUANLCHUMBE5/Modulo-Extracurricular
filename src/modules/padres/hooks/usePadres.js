import { useCallback, useEffect, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import {
  guardarDatosApoderadoPadres,
  obtenerProgramasCoordinacion,
  obtenerResumenPadre,
  registrarInscripcionPadres,
} from "../services/padresService";

const mensajesIniciales = [
  {
    autor: "bot",
    texto: "Hola, soy Rafael. Puedo orientarte sobre el programa, horario, pago, ficha y el siguiente paso del registro.",
  },
];

function usePadres(user) {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [asistenteAbierto, setAsistenteAbierto] = useState(false);
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [consulta, setConsulta] = useState("");
  const [programasCoordinacion, setProgramasCoordinacion] = useState([]);
  const [cargandoProgramas, setCargandoProgramas] = useState(false);
  const [programaSeleccionadoId, setProgramaSeleccionadoId] = useState("");
  const [infoProgramaAbierta, setInfoProgramaAbierta] = useState(false);
  const [infoProgramaAceptada, setInfoProgramaAceptada] = useState(false);
  const [form, setForm] = useState({
    apoderado: "",
    telefono: "",
    correo: "",
    acepta: false,
    enviarPdfCorreo: false,
  });

  const cargarResumen = useCallback(async ({ silencioso = false } = {}) => {
    if (!user?.dni) {
      setError("No se encontro el DNI del estudiante en la sesion.");
      setCargando(false);
      return;
    }

    if (!silencioso) setCargando(true);
    setError("");

    try {
      const datos = await obtenerResumenPadre(user.dni);
      setResumen(datos);
      const estudiante = datos.estudiante;
      const inscripcion = datos.inscripcionActual;

      setForm((actual) => ({
        ...actual,
        apoderado: inscripcion?.apoderado || estudiante.apoderado || actual.apoderado,
        telefono: inscripcion?.telefono || estudiante.telefonoApoderado || actual.telefono,
        correo: inscripcion?.correo || estudiante.correoApoderado || actual.correo,
        enviarPdfCorreo: Boolean(inscripcion?.enviarPdfCorreo ?? estudiante.enviarPdfCorreo ?? actual.enviarPdfCorreo),
      }));

      if (silencioso) {
        notifications.show({
          color: "sanrafael",
          title: "Padres",
          message: "Informacion actualizada.",
        });
      }
    } catch (err) {
      const mensaje = err.message || "No se pudo cargar la informacion del estudiante.";
      setError(mensaje);
      notifications.show({ color: "orange", title: "Padres", message: mensaje });
    } finally {
      setCargando(false);
    }
  }, [user?.dni]);

  const cargarProgramas = useCallback(async () => {
    setCargandoProgramas(true);
    try {
      const programas = await obtenerProgramasCoordinacion();
      setProgramasCoordinacion(programas);
    } catch (err) {
      console.error("Error cargando programas:", err);
    } finally {
      setCargandoProgramas(false);
    }
  }, []);

  useEffect(() => {
    cargarResumen();
    cargarProgramas();
  }, [cargarResumen, cargarProgramas]);

  useEffect(() => {
    const actualizar = () => cargarResumen({ silencioso: true });
    window.addEventListener("mock-db-updated", actualizar);
    return () => window.removeEventListener("mock-db-updated", actualizar);
  }, [cargarResumen]);

  const estudiante = resumen?.estudiante;
  const inscripcion = resumen?.inscripcionActual;
  const invitacion = resumen?.invitacionActual;
  const programa = inscripcion || invitacion;
  const apoderadoBloqueado = Boolean(inscripcion?.apoderado || estudiante?.apoderado);
  const tipoReforzamiento = useMemo(() => obtenerTipoReforzamiento(programa), [programa]);
  const nombreCorto = obtenerNombreCorto(estudiante?.nombres);
  const iniciales = obtenerIniciales(estudiante?.nombres);
  const bannerEstudiante = obtenerBannerEstudiante(estudiante);
  const siguientePaso = obtenerSiguientePaso({ programa, inscripcion });
  const mostrarCatalogoProgramas = !programa;
  const programasDisponibles = useMemo(
    () => programasCoordinacion
      .map((item) => prepararProgramaParaGrado(item, estudiante?.grado))
      .filter((item) => item.registrable && item.disponibleParaGrado),
    [programasCoordinacion, estudiante?.grado]
  );

  useEffect(() => {
    setInfoProgramaAceptada(false);
    setInfoProgramaAbierta(false);
  }, [programa?.programaId, programa?.id]);

  async function guardarDatos(event) {
    event.preventDefault();
    if (!form.apoderado.trim()) return avisar("Ingrese el nombre del padre o apoderado.");
    if (!/^\d{9}$/.test(form.telefono.trim())) return avisar("Ingrese un telefono de contacto valido de 9 numeros.");
    if (form.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
      return avisar("Ingrese un correo valido o deje el campo vacio.");
    }
    if (!form.acepta) return avisar("Confirme que los datos son correctos.");

    setGuardando(true);
    try {
      await guardarDatosApoderadoPadres(user.dni, form);
      notifications.show({
        color: "sanrafael",
        title: "Padres",
        message: "Datos del apoderado guardados.",
      });
      await cargarResumen({ silencioso: true });
    } catch (err) {
      avisar(err.message || "No se pudieron guardar los datos.");
    } finally {
      setGuardando(false);
    }
  }

  async function solicitarInscripcionPadres(programaId = "") {
    if (!form.apoderado.trim()) {
      avisar("Ingrese el nombre del padre o apoderado.");
      return false;
    }
    if (!/^\d{9}$/.test(form.telefono.trim())) {
      avisar("Ingrese un telefono de contacto valido de 9 numeros.");
      return false;
    }
    if (!form.acepta) {
      avisar("Confirme que los datos son correctos antes de solicitar el registro.");
      return false;
    }
    if (!programaId && invitacion && !inscripcion && !infoProgramaAceptada) {
      setInfoProgramaAbierta(true);
      avisar("Revise y acepte el comunicado del programa antes de registrar la inscripcion.");
      return false;
    }

    setGuardando(true);
    if (programaId) setProgramaSeleccionadoId(programaId);
    try {
      await registrarInscripcionPadres(user.dni, form, programaId);
      notifications.show({
        color: "sanrafael",
        title: "Padres",
        message: "Inscripcion registrada como pendiente de pago. Acerquese a Caja para validar el pago.",
      });
      await cargarResumen({ silencioso: true });
      return true;
    } catch (err) {
      avisar(err.message || "No se pudo registrar la inscripcion.");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  function avisar(message) {
    notifications.show({ color: "orange", title: "Revisar datos", message });
  }

  function actualizar(campo, valor) {
    setForm((actual) => {
      const siguiente = { ...actual, [campo]: valor };
      if (campo === "correo" && !String(valor || "").trim()) {
        siguiente.enviarPdfCorreo = false;
      }
      return siguiente;
    });
  }

  function preguntar(texto) {
    const pregunta = String(texto || consulta).trim();
    if (!pregunta) return;
    const respuesta = responderAsistente(pregunta, { estudiante, programa, inscripcion, tipoReforzamiento });
    setMensajes((actual) => [
      ...actual,
      { autor: "padre", texto: pregunta },
      { autor: "bot", texto: respuesta },
    ]);
    setConsulta("");
  }

  function consultarRafael(texto) {
    setAsistenteAbierto(true);
    preguntar(texto);
  }

  function abrirPago() {
    if (!programa) return consultarRafael("Monto a pagar");
    setInfoProgramaAbierta(true);
  }

  async function continuarPago() {
    if (!infoProgramaAceptada) return avisar("Debe aceptar que leyo la informacion del programa antes de continuar.");
    if (invitacion && !inscripcion) {
      const registrado = await solicitarInscripcionPadres();
      if (registrado) setInfoProgramaAbierta(false);
      return;
    }

    setInfoProgramaAbierta(false);
    consultarRafael("Monto a pagar");
  }

  return {
    abrirPago,
    actualizar,
    asistenteAbierto,
    bannerEstudiante,
    cargando,
    cargandoProgramas,
    consulta,
    consultarRafael,
    continuarPago,
    error,
    estudiante,
    form,
    guardando,
    apoderadoBloqueado,
    infoProgramaAbierta,
    infoProgramaAceptada,
    iniciales,
    inscripcion,
    invitacion,
    mensajes,
    mostrarCatalogoProgramas,
    nombreCorto,
    preguntar,
    programa,
    programasDisponibles,
    programaSeleccionadoId,
    setAsistenteAbierto,
    setConsulta,
    setInfoProgramaAbierta,
    setInfoProgramaAceptada,
    siguientePaso,
    solicitarInscripcionPadres,
    guardarDatos,
  };
}

function responderAsistente(pregunta, { estudiante, programa, inscripcion, tipoReforzamiento }) {
  const texto = normalizarConsulta(pregunta);
  const nombreEstudiante = obtenerNombreCorto(estudiante?.nombres);

  if (!programa) {
    if (coincideConsulta(texto, ["programa", "taller", "inscripcion", "registrar"])) {
      return `Aun no hay un programa asignado para ${nombreEstudiante}. Cuando Coordinacion habilite una invitacion o un taller disponible, lo veras en esta pantalla.`;
    }
    return "Por ahora no encuentro un programa activo para este estudiante. Revisa nuevamente cuando Coordinacion publique o asigne el programa.";
  }

  const nombrePrograma = programa.programa || "el programa asignado";
  const estadoInscripcion = obtenerEstadoInscripcionAsistente({ programa, inscripcion });
  const estadoPago = inscripcion?.estadoPago || "Pendiente de pago";
  const costo = formatearSoles(programa.costo);
  const horario = programa.horario || "horario por confirmar";

  if (coincideConsulta(texto, ["estado", "situacion", "proceso", "pendiente"])) {
    return `Estado actual: ${estadoInscripcion}. Pago: ${estadoPago}.`;
  }

  if (coincideConsulta(texto, ["monto", "pagar", "pago", "costo", "precio", "cuanto"])) {
    if (!inscripcion) {
      return `${nombrePrograma} tiene un costo registrado de ${costo}. Antes de pagar, revisa la informacion del programa y solicita el registro para que quede pendiente de validacion en Caja.`;
    }
    return `El monto registrado para ${nombrePrograma} es ${costo}. El pago figura como: ${estadoPago}.`;
  }

  if (coincideConsulta(texto, ["horario", "hora", "dia", "dias", "clase"])) {
    return `El horario registrado para ${nombrePrograma} es: ${horario}. Si ves "por confirmar", Coordinacion aun debe completar el horario.`;
  }

  if (coincideConsulta(texto, ["ficha", "descargar", "documento", "comunicado", "pdf"])) {
    if (!inscripcion) {
      return "La ficha se habilita despues de registrar la inscripcion. Primero revisa el comunicado del programa y confirma los datos del apoderado.";
    }
    return "La ficha o comunicado queda disponible cuando Secretaria confirma la inscripcion y genera el documento correspondiente.";
  }

  if (coincideConsulta(texto, ["qr", "codigo", "voucher"])) {
    return "El QR o constancia de pago se habilita cuando Caja valida el pago del programa. Mientras tanto, el estado permanecera como pendiente.";
  }

  if (coincideConsulta(texto, ["hacer", "siguiente", "ahora", "ayuda", "paso"])) {
    return obtenerSiguientePaso({ programa, inscripcion }).detalle;
  }

  if (coincideConsulta(texto, ["programa", "taller", "curso", "asignado"])) {
    return `${nombreEstudiante} tiene asignado ${nombrePrograma}. Tipo: ${tipoReforzamiento}. Horario: ${horario}. Costo: ${costo}.`;
  }

  if (coincideConsulta(texto, ["apoderado", "telefono", "correo", "datos"])) {
    return "Verifica los datos del apoderado en el formulario de confirmacion. El telefono debe tener 9 digitos y el correo puede quedar vacio si no desea recibir documentos por email.";
  }

  return `Puedo ayudarte con programa, horario, pago, ficha, estado o el siguiente paso. Para ${nombrePrograma}, lo mas importante ahora es: ${obtenerSiguientePaso({ programa, inscripcion }).detalle}`;
}

function normalizarConsulta(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function coincideConsulta(texto, palabras) {
  return palabras.some((palabra) => texto.includes(palabra));
}

function obtenerEstadoInscripcionAsistente({ programa, inscripcion }) {
  if (inscripcion?.estadoInscripcion) return inscripcion.estadoInscripcion;
  if (inscripcion) return "Inscripcion registrada";
  if (programa) return "Programa asignado, pendiente de registrar";
  return "Sin programa asignado";
}

function obtenerTipoReforzamiento(programa) {
  const nombre = String(programa?.programa || "").toLowerCase();
  if (nombre.includes("reforz")) return "Reforzamiento y nivelacion";
  if (nombre.includes("tarea")) return "Club de tareas";
  if (nombre.includes("deporte")) return "Taller deportivo";
  if (nombre.includes("matem")) return "Refuerzo academico";
  return "Programa extracurricular";
}

function formatearSoles(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

function obtenerNombreCorto(nombre) {
  return String(nombre || "su hijo(a)").trim().split(/\s+/).slice(0, 2).join(" ");
}

function obtenerIniciales(nombre) {
  const partes = String(nombre || "SR").trim().split(/\s+/).filter(Boolean);
  return partes.slice(0, 2).map((parte) => parte[0]).join("").toUpperCase() || "SR";
}

function obtenerBannerEstudiante(estudiante) {
  const sexo = normalizarSexo(estudiante?.sexo || estudiante?.genero || estudiante?.gender) || inferirSexoDemo(estudiante?.nombres);
  if (sexo === "hombre") return "/assets/padres/BANNER%20DE%20HOMBRES.png";
  if (sexo === "mujer") return "/assets/padres/BANNER%20DE%20MUJERES.png";
  return "";
}

function normalizarSexo(valor) {
  const texto = String(valor || "").trim().toLowerCase();
  if (["m", "masculino", "hombre", "varon", "varón", "male"].includes(texto)) return "hombre";
  if (["f", "femenino", "mujer", "female"].includes(texto)) return "mujer";
  return "";
}

function inferirSexoDemo(nombre) {
  const primerNombre = String(nombre || "").trim().split(/\s+/)[0]?.toLowerCase();
  if (["camila", "lucia", "maria", "rosa", "claudia", "patricia", "ana"].includes(primerNombre)) return "mujer";
  if (["juan", "mateo", "jose", "carlos"].includes(primerNombre)) return "hombre";
  return "";
}

function prepararProgramaParaGrado(programa, gradoEstudiante) {
  const horarioDelGrado = resolverHorarioCatalogoPorGrado(programa, gradoEstudiante);
  const disponibleParaGrado = programaDisponibleCatalogoParaGrado(programa, gradoEstudiante, horarioDelGrado);

  return {
    ...programa,
    horario: disponibleParaGrado ? (horarioDelGrado || programa.horario) : "",
    disponibleParaGrado,
  };
}

function programaDisponibleCatalogoParaGrado(programa, gradoEstudiante, horarioDelGrado = "") {
  if (!programa?.requiereGradoCompatible) return true;
  if (Array.isArray(programa.horariosPorGrupo) && programa.horariosPorGrupo.length > 0) {
    return Boolean(horarioDelGrado);
  }

  const gradosAplicables = Array.isArray(programa.gradosAplicables) ? programa.gradosAplicables : [];
  if (!gradosAplicables.length) return true;

  const gradoNormalizado = descomponerGradoCatalogo(gradoEstudiante);
  if (!gradoNormalizado.numero) return false;

  return gradosAplicables.some((grado) => coincideGradoCatalogo(grado, gradoNormalizado));
}

function resolverHorarioCatalogoPorGrado(programa, gradoEstudiante = "") {
  const grupos = programa?.horariosPorGrupo || [];
  if (!Array.isArray(grupos) || grupos.length === 0) return "";

  const gradoNormalizado = descomponerGradoCatalogo(gradoEstudiante);
  if (!gradoNormalizado.numero) return "";

  let gradoDelTurno = "";
  const grupo = grupos.find((item) => {
    gradoDelTurno = (item.grados || []).find((grado) => coincideGradoCatalogo(grado, gradoNormalizado)) || "";
    return Boolean(gradoDelTurno);
  });

  if (!grupo) return "";
  const grado = formatearGradoCatalogo(gradoDelTurno || gradoEstudiante);
  const aula = grupo.aula ? ` - Aula ${grupo.aula}` : "";
  return `${grado ? `${grado}: ` : ""}${grupo.dia} almuerzo ${grupo.almuerzoInicio || "14:20"}-${grupo.almuerzoFin || "15:10"}, clase ${grupo.horaInicio || ""}-${grupo.horaFin || ""}${aula}`;
}

function coincideGradoCatalogo(gradoGrupo, gradoEstudiante) {
  const grupo = descomponerGradoCatalogo(gradoGrupo);
  if (!grupo.numero || !gradoEstudiante?.numero) return false;
  if (grupo.numero !== gradoEstudiante.numero) return false;
  return !grupo.nivel || !gradoEstudiante.nivel || grupo.nivel === gradoEstudiante.nivel;
}

function formatearGradoCatalogo(valor) {
  const [nivel, grado] = String(valor || "").split(":");
  if (!nivel || !grado) return valor;
  return `${nivel} ${grado}`;
}

function descomponerGradoCatalogo(valor) {
  const texto = normalizarTexto(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obtenerSiguientePaso({ programa, inscripcion }) {
  if (!programa) {
    return {
      titulo: "Sin programa asignado",
      detalle: "Coordinacion aun no registra una invitacion para este estudiante.",
    };
  }

  if (!inscripcion) {
    if (programa?.ventanaInscripcion?.requiereCaja) {
      return {
        titulo: "Registro por Caja",
        detalle: "La inscripcion web ya cerro. Desde el segundo dia de clases, acerquese a Caja si aun desea matricular al estudiante.",
      };
    }

    return {
      titulo: "Registro disponible",
      detalle: "Puede confirmar los datos y registrar la inscripcion web. El pago quedara pendiente para validarse en Caja.",
    };
  }

  if (!String(inscripcion.estadoPago || "").toLowerCase().includes("pag")) {
    return {
      titulo: "Pago pendiente",
      detalle: "La inscripcion ya fue registrada. Acerquese a Caja para validar el pago del programa.",
    };
  }

  return {
    titulo: "Proceso al dia",
    detalle: "El pago figura como registrado. Revise el horario y conserve la ficha del programa.",
  };
}

export { formatearSoles };
export default usePadres;
