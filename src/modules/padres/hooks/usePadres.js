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
    texto: "Hola, soy el asistente del portal de padres. Puedo ayudarte con el programa, horario, monto, ficha y estado de pago.",
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
    medioEnvio: "WhatsApp",
    acepta: false,
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
        medioEnvio: inscripcion?.medioEnvio || estudiante.medioEnvio || actual.medioEnvio || "WhatsApp",
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
  const tipoReforzamiento = useMemo(() => obtenerTipoReforzamiento(programa), [programa]);
  const nombreCorto = obtenerNombreCorto(estudiante?.nombres);
  const iniciales = obtenerIniciales(estudiante?.nombres);
  const bannerEstudiante = obtenerBannerEstudiante(estudiante);
  const siguientePaso = obtenerSiguientePaso({ programa, inscripcion });
  const mostrarCatalogoProgramas = !programa;
  const programasDisponibles = useMemo(
    () => programasCoordinacion.filter((item) => item.registrable),
    [programasCoordinacion]
  );

  useEffect(() => {
    setInfoProgramaAceptada(false);
    setInfoProgramaAbierta(false);
  }, [programa?.programaId, programa?.id]);

  async function guardarDatos(event) {
    event.preventDefault();
    if (!form.apoderado.trim()) return avisar("Ingrese el nombre del padre o apoderado.");
    if (!/^\d{9}$/.test(form.telefono.trim())) return avisar("Ingrese un telefono WhatsApp valido de 9 numeros.");
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
    if (!form.apoderado.trim()) return avisar("Ingrese el nombre del padre o apoderado.");
    if (!/^\d{9}$/.test(form.telefono.trim())) return avisar("Ingrese un telefono WhatsApp valido de 9 numeros.");
    if (!form.acepta) return avisar("Confirme que los datos son correctos antes de solicitar el registro.");

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
    } catch (err) {
      avisar(err.message || "No se pudo registrar la inscripcion.");
    } finally {
      setGuardando(false);
    }
  }

  function avisar(message) {
    notifications.show({ color: "orange", title: "Revisar datos", message });
  }

  function actualizar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
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

  function continuarPago() {
    if (!infoProgramaAceptada) return avisar("Debe aceptar que leyo la informacion del programa antes de continuar con el pago.");
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
  const texto = pregunta.toLowerCase();
  if (!programa) return "Por ahora no hay un programa asignado. Cuando Coordinacion registre la invitacion, aparecera en esta pantalla.";
  if (texto.includes("monto") || texto.includes("pagar") || texto.includes("costo")) {
    return `El monto registrado para ${programa.programa} es ${formatearSoles(programa.costo)}. El estado de pago es ${inscripcion?.estadoPago || "Pendiente de pago"}.`;
  }
  if (texto.includes("horario")) {
    return `El horario registrado es: ${programa.horario || "por confirmar"}.`;
  }
  if (texto.includes("ficha") || texto.includes("descargar")) {
    return "La ficha estara disponible cuando Secretaria confirme la inscripcion y genere el documento correspondiente.";
  }
  if (texto.includes("qr")) {
    return "El QR se habilitara cuando Caja valide el pago del programa.";
  }
  if (texto.includes("estado")) {
    return `La inscripcion figura como ${inscripcion?.estadoInscripcion || (inscripcion ? "Registrada" : "Pendiente de inscripcion presencial")} y el pago como ${inscripcion?.estadoPago || "Pendiente de pago"}.`;
  }
  if (texto.includes("hacer") || texto.includes("siguiente")) {
    return obtenerSiguientePaso({ programa, inscripcion }).detalle;
  }
  return `Su hijo(a) ${estudiante?.nombres || ""} tiene asignado el programa ${programa.programa}, correspondiente a ${tipoReforzamiento}.`;
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
