import { useEffect, useState } from "react";
import { Alert as MantineAlert } from "@mantine/core";
import { toast } from "sonner";
import {
  IconAlertCircle as AlertCircle,
  IconCalendar as CalendarDays,
  IconCircleCheck as CheckCircle2,
  IconClipboardCheck as ClipboardCheck,
  IconFileText as FileText,
  IconId as IdCard,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconPhone as Phone,
  IconPrinter as Printer,
  IconSearch as Search,
  IconSend as Send,
  IconUserPlus as UserPlus,
  IconUserCircle as UserRound,
  IconX as X,
} from "@tabler/icons-react";
import {
  buscarEstudiantePorDni,
  buscarEstudiantesPorNombre,
  buscarInscripcionEstudiante,
  listarProgramasPorPeriodo,
  obtenerProgramaPorId,
  derivarInscripcionCaja,
  registrarInscripcion,
  registrarDocumentoGenerado,
} from "./services/secretariaService";
import {
  validarDni,
  validarTelefono,
  validarTextoSeguro,
} from "../../services/validators";
import {
  formatearFechaPeru,
} from "../../services/dateService";
import { resolverHorarioPorGradoLocal } from "./utils/horariosSecretaria";
import { FichaAceptación, imprimirInscripcionDirecta } from "./components/SecretariaFicha";
import {
  CampoLectura,
  CampoTexto,
  DatoHorario,
  formatearCuposSecretaria,
  resumirClaseSecretaria,
  resumirHorarioSecretaria,
} from "./components/SecretariaFields";
import "./Secretaria.css";

const formularioInicial = {
  dniExterno: "",
  nombresExterno: "",
  edadExterno: "",
  domicilioExterno: "",
  sexoExterno: "",
  tipoAlumnoVerano: "Alumno externo",
  gradoExterno: "",
  programa: "",
  colegioProcedencia: "",
  apoderado: "",
  telefono: "",
  correo: "",
  medioEnvio: "Impreso",
  tallaUniforme: "",
  observacion: "",
  aceptaCondiciones: false,
};

const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";

function Secretaria({ onLogout }) {
  const [periodo, setPeriodo] = useState("escolar");
  const [dni, setDni] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [estudiante, setEstudiante] = useState(null);
  const [inscripcion, setInscripción] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [programas, setProgramas] = useState([]);
  const [modoRegistro, setModoRegistro] = useState(false);
  const [modalExito, setModalExito] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [imprimiendoFichaRegistro, setImprimiendoFichaRegistro] = useState(false);
  const [derivandoCaja, setDerivandoCaja] = useState(false);
  const [resultadosNombre, setResultadosNombre] = useState([]);

  function mostrarMensaje(texto, tipo = "error") {
    setMensaje(texto);
    const titulo = tipo === "success" ? "Secretaría" : "Revisar atención";
    if (tipo === "success") {
      toast.success(titulo, { description: texto });
    } else {
      toast.warning(titulo, { description: texto });
    }
  }

  const programaAsignado = estudiante
    ? programas.find((programa) => programa.id === estudiante.programaAsignado)
    : null;
  const programaSeleccionado = programas.find((programa) => programa.id === formulario.programa);
  
  // Si el estudiante tiene invitación, usamos los datos que vienen del servicio para mostrar el nombre
  // Si no tiene invitación, usamos el programa seleccionado en el dropdown
  const nombreProgramaAMostrar = estudiante?.tieneInvitacion 
    ? estudiante.programaNombre 
    : (programaSeleccionado?.nombre || "");

  const programaParaRegistro = programaSeleccionado || programaAsignado || (estudiante?.tieneInvitacion ? {
    id: estudiante.programaAsignado,
    nombre: estudiante.programaNombre,
    horario: estudiante.programaHorario,
    docente: estudiante.programaDocente,
    costo: estudiante.programaCosto,
    cupos: estudiante.programaCupos,
    modalidadCobro: estudiante.programaModalidadCobro,
    requisitos: estudiante.programaRequisitos,
    fechaInicio: estudiante.programaFechaInicio,
    fechaFin: estudiante.programaFechaFin,
    plantilla: estudiante.plantilla,
    plantillaBase64: estudiante.plantillaBase64,
    plantillaVariables: estudiante.plantillaVariables,
    requiereUniforme: estudiante.requiereUniforme,
  } : null);
  const horarioResumenRegistro = resumirHorarioSecretaria(programaParaRegistro?.horario || "");

  useEffect(() => {
    listarProgramasPorPeriodo(periodo).then(setProgramas);
    setFormulario(formularioInicial);
    setEstudiante(null);
    setInscripción(null);
    setModoRegistro(false);
    setModalExito(false);
    setMensaje("");
  }, [periodo]);

  useEffect(() => {
    async function refrescarDesdeBase() {
      const programasActualizados = await listarProgramasPorPeriodo(periodo);
      setProgramas(programasActualizados);

      if (validarDni(dni)) {
        const encontrado = await buscarEstudiantePorDni(dni, periodo);
        if (encontrado) {
          setEstudiante(encontrado);
          const registro = await buscarInscripcionEstudiante(encontrado, periodo);
          setInscripción(registro);
        }
      }
    }

    window.addEventListener("mock-db-updated", refrescarDesdeBase);
    window.addEventListener("storage", refrescarDesdeBase);

    return () => {
      window.removeEventListener("mock-db-updated", refrescarDesdeBase);
      window.removeEventListener("storage", refrescarDesdeBase);
    };
  }, [periodo, dni]);

  async function cargarProgramasDelPeriodo() {
    const programasActualizados = await listarProgramasPorPeriodo(periodo);
    setProgramas(programasActualizados);
    return programasActualizados;
  }

  async function buscarEstudiante(event) {
    event.preventDefault();
    await consultarEstudiante();
  }

  async function consultarEstudiante() {
    setInscripción(null);
    setModoRegistro(false);
    setResultadosNombre([]);
    await cargarProgramasDelPeriodo();

    if (!validarDni(dni)) {
      if (dni.trim().length >= 3) {
        setBuscando(true);
        const resultados = await buscarEstudiantesPorNombre(dni, periodo);
        setBuscando(false);

        if (resultados.length === 1) {
          await aplicarEstudianteEncontrado(resultados[0]);
          return;
        }

        if (resultados.length > 1) {
          setEstudiante(null);
          setResultadosNombre(resultados);
          setMensaje("Seleccione el estudiante encontrado por nombre.");
          return;
        }
      }

      setEstudiante(null);
      setMensaje("Ingrese un DNI válido de 8 números o al menos 3 letras del nombre.");
      return;
    }

    setBuscando(true);
    const encontrado = await buscarEstudiantePorDni(dni, periodo);
    setBuscando(false);

    if (!encontrado) {
      if (periodo !== "verano") {
        setEstudiante(null);
        setMensaje("No se encontro al estudiante. El alumno externo solo puede registrarse en ciclo verano.");
        return;
      }

      await abrirRegistroAlumnoExterno(dni);
      return;
    }

    await aplicarEstudianteEncontrado(encontrado);
  }

  async function abrirRegistroAlumnoExterno(dniSugerido = "") {
    if (periodo !== "verano") {
      mostrarMensaje("El registro de alumno externo solo esta disponible en ciclo verano.");
      return;
    }

    const dniLimpio = String(dniSugerido || dni || "").replace(/\D/g, "").slice(0, 8);
    const programasActualizados = await cargarProgramasDelPeriodo();
    const primerProgramaPeriodo = programasActualizados[0]?.id || "";

    setInscripción(null);
    setResultadosNombre([]);
    setEstudiante({
      dni: dniLimpio,
      nombres: "Alumno externo por registrar",
      grado: "Por registrar",
      seccion: "Por registrar",
      tipoAlumno: "Alumno externo",
      periodo: "Ciclo verano",
      tieneInvitacion: false,
      requiereUniforme: false,
      programaAsignado: "",
      estadoInscripción: "Nuevo registro",
      esExterno: true,
    });
    setFormulario({
      ...formularioInicial,
      dniExterno: dniLimpio,
      programa: primerProgramaPeriodo,
    });
    setModoRegistro(true);
    setMensaje("");
  }

  async function aplicarEstudianteEncontrado(encontrado) {
    setResultadosNombre([]);
    const registroExistente = await buscarInscripcionEstudiante(encontrado, periodo);
    const estadoRegistro = registroExistente?.estadoInscripción || registroExistente?.estadoInscripcion;
    setEstudiante({
      ...encontrado,
      estadoInscripción: estadoRegistro || encontrado.estadoInscripción,
      estadoPago: registroExistente?.estadoPago || encontrado.estadoPago,
    });
    setInscripción(registroExistente);
    setFormulario({
      ...formularioInicial,
      programa: encontrado.tieneInvitacion ? encontrado.programaAsignado : "",
      apoderado: registroExistente?.apoderado ?? encontrado.apoderado ?? "",
      telefono: registroExistente?.telefono ?? encontrado.telefonoApoderado ?? "",
      correo: registroExistente?.correo ?? "",
      medioEnvio: registroExistente?.medioEnvio ?? "Impreso",
      tallaUniforme: registroExistente?.tallaUniforme ?? "",
      observacion: registroExistente?.observacion ?? "",
    });
    setMensaje("");
  }



  function actualizarFormulario(campo, valor) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function limpiarBusquedaEstudiante() {
    setDni("");
    setMensaje("");
    setEstudiante(null);
    setInscripción(null);
    setFormulario(formularioInicial);
    setModoRegistro(false);
    setModalExito(false);
    setResultadosNombre([]);
  }

  async function guardarInscripción(event) {
    event.preventDefault();
    setMensaje("");

    if (!estudiante) {
      mostrarMensaje("Primero busque un estudiante registrado.");
      return;
    }

    if (estudiante.esExterno) {
      if (!validarDni(formulario.dniExterno)) {
        mostrarMensaje("Ingrese el DNI del alumno externo con 8 numeros.");
        return;
      }
      if (!validarTextoSeguro(formulario.nombresExterno)) {
        mostrarMensaje("Ingrese el nombre completo del alumno externo.");
        return;
      }
      if (!validarTextoSeguro(formulario.edadExterno) || Number(formulario.edadExterno) <= 0) {
        mostrarMensaje("Ingrese la edad del estudiante.");
        return;
      }
      if (!validarTextoSeguro(formulario.domicilioExterno)) {
        mostrarMensaje("Ingrese el domicilio del estudiante.");
        return;
      }
      if (!formulario.sexoExterno) {
        mostrarMensaje("Seleccione el sexo del estudiante.");
        return;
      }
      if (!formulario.tipoAlumnoVerano) {
        mostrarMensaje("Seleccione si el estudiante es interno o externo.");
        return;
      }
      if (!validarTextoSeguro(formulario.gradoExterno)) {
        mostrarMensaje("Ingrese el grado del alumno externo.");
        return;
      }
    }

    const requiereSeleccionPrograma = periodo === "verano" || !estudiante.tieneInvitacion;
    const programaIdRegistro = requiereSeleccionPrograma
      ? formulario.programa
      : estudiante.programaAsignado;

    if (requiereSeleccionPrograma && !formulario.programa) {
      setMensaje(programas.length === 0
        ? "No hay programas habilitados para este periodo. Coordinación debe registrar o habilitar uno."
        : "Seleccione el programa o taller disponible para este periodo.");
      return;
    }

    const programaActualizado = programaIdRegistro
      ? await obtenerProgramaPorId(programaIdRegistro, periodo)
      : null;

    if (!programaActualizado) {
      mostrarMensaje("No se encontro el programa actualizado para este periodo. Actualice y vuelva a intentar.");
      return;
    }

    if (periodo === "escolar" && !estudiante.tieneInvitacion && !validarTextoSeguro(formulario.observacion)) {
      mostrarMensaje("La inscripcion excepcional requiere una observacion obligatoria.");
      return;
    }

    if (periodo === "verano" && !validarTextoSeguro(formulario.colegioProcedencia)) {
      mostrarMensaje("Ingrese el colegio de procedencia del estudiante.");
      return;
    }

    if (!validarTextoSeguro(formulario.apoderado)) {
      mostrarMensaje("Ingrese el nombre del apoderado sin caracteres especiales.");
      return;
    }

    if (!validarTelefono(formulario.telefono)) {
      mostrarMensaje("Ingrese un telefono de contacto valido de 9 numeros.");
      return;
    }

    if (programaActualizado.requiereUniforme && !formulario.tallaUniforme) {
      mostrarMensaje("Seleccione la talla de uniforme requerida por el taller.");
      return;
    }

    if (!formulario.aceptaCondiciones) {
      mostrarMensaje("Debe confirmar que el apoderado acepta las condiciones del programa.");
      return;
    }

    try {
      setGuardando(true);
      const dniRegistro = estudiante.esExterno ? formulario.dniExterno.trim() : estudiante.dni;
      const nombresRegistro = estudiante.esExterno
        ? formulario.nombresExterno.trim()
        : estudiante.nombres;
      const gradoRegistro = estudiante.esExterno
        ? formulario.gradoExterno.trim()
        : estudiante.grado || "";
      const registro = await registrarInscripcion({
        dniEstudiante: dniRegistro,
        codigoEstudiante: estudiante.codigoEstudiante || "",
        gradoEstudiante: gradoRegistro,
        seccionEstudiante: estudiante.esExterno ? "" : estudiante.seccion || "",
        nombresEstudiante: nombresRegistro,
        esExterno: estudiante.esExterno && formulario.tipoAlumnoVerano === "Alumno externo",
        esNuevoVerano: Boolean(estudiante.esExterno),
        edadEstudiante: estudiante.esExterno ? formulario.edadExterno.trim() : "",
        domicilioEstudiante: estudiante.esExterno ? formulario.domicilioExterno.trim() : "",
        sexoEstudiante: estudiante.esExterno ? formulario.sexoExterno : "",
        tipoAlumno: estudiante.esExterno ? formulario.tipoAlumnoVerano : estudiante.tipoAlumno,
        tipoInscripción:
          estudiante.esExterno
            ? (formulario.tipoAlumnoVerano === "Alumno externo" ? "Verano externo" : "Verano interno")
            :
          periodo === "escolar" && !estudiante.tieneInvitacion
            ? "Excepcional"
            : "Regular",
        programa: programaActualizado.nombre,
        programaId: programaActualizado.id,
        colegioProcedencia: formulario.colegioProcedencia.trim(),
        horario: programaActualizado.horario,
        docente: programaActualizado.docente,
        costo: programaActualizado.costo,
        cupos: programaActualizado.cupos,
        requiereUniforme: programaActualizado.requiereUniforme,
        periodo,
        apoderado: formulario.apoderado.trim(),
        telefono: formulario.telefono,
        correo: "",
        medioEnvio: "Impreso",
        tallaUniforme: formulario.tallaUniforme,
        observacion: formulario.observacion.trim(),
        origenRegistro: estudiante.esExterno
          ? "Alumno externo de ciclo verano"
          : estudiante.tieneInvitacion
          ? "Alumno invitado por Coordinación"
          : "Registro excepcional por Secretaría",
      });

      setInscripción(registro);
      setEstudiante((actual) =>
        actual ? {
          ...actual,
          dni: dniRegistro,
          nombres: nombresRegistro,
          grado: gradoRegistro,
          seccion: estudiante.esExterno ? "" : actual.seccion,
          tipoAlumno: registro.tipoAlumno,
          estadoInscripción: registro.estadoInscripción,
          estadoPago: registro.estadoPago,
        } : actual
      );
      setModoRegistro(false);
      setModalExito(true);
      setMensaje("");
      toast.success("Secretaría", {
        description: "Inscripción registrada correctamente.",
      });
    } catch (err) {
      mostrarMensaje(err.message || "No se pudo registrar la inscripcion. Intente actualizar y vuelva a confirmar.");
    } finally {
      setGuardando(false);
    }
  }

  async function abrirRegistro() {
    const programasActualizados = await cargarProgramasDelPeriodo();
    const programaExiste = programasActualizados.some((programa) =>
      programa.id === estudiante?.programaAsignado
    );
    if (estudiante?.tieneInvitacion && !programaExiste) {
      mostrarMensaje("El programa asignado por Coordinación no está habilitado o no tiene cupos disponibles.");
      return;
    }
    const primerProgramaPeriodo = programasActualizados[0]?.id || "";
    setFormulario((actual) => ({
      ...actual,
      programa: estudiante?.tieneInvitacion && programaExiste
        ? estudiante.programaAsignado
        : actual.programa || primerProgramaPeriodo,
      colegioProcedencia: actual.colegioProcedencia || (estudiante?.esExterno ? "" : "Colegio San Rafael"),
      apoderado: actual.apoderado || estudiante?.apoderado || "",
      telefono: actual.telefono || estudiante?.telefonoApoderado || "",
      aceptaCondiciones: false,
    }));
    setModoRegistro(true);
  }

  async function abrirFichaGenerada() {
    if (!inscripcion || imprimiendoFichaRegistro) return;

    setImprimiendoFichaRegistro(true);
    setMensaje("");
    try {
      const inscripcionActualizada = await buscarInscripcionEstudiante(estudiante, periodo);
      const fichaRegistro = await completarInscripcionConProgramaActual(inscripcionActualizada || inscripcion);
      if (!fichaRegistro.plantillaBase64) {
        throw new Error("No encuentro el archivo Word de este programa. Vuelva a subir la plantilla en Coordinación.");
      }
      setInscripción(fichaRegistro);
      await registrarDocumentoGenerado({
        estudiante,
        inscripcion: fichaRegistro,
        tipoDocumento: fichaRegistro.plantilla ? "Comunicado personalizado" : "Ficha personalizada",
      });
      await imprimirInscripcionDirecta(estudiante, fichaRegistro);
    } catch (err) {
      mostrarMensaje(err.message || "No se pudo preparar la ficha para imprimir.");
    } finally {
      setImprimiendoFichaRegistro(false);
    }
  }

  async function derivarACaja() {
    if (!inscripcion || derivandoCaja) return;

    setDerivandoCaja(true);
    setMensaje("");
    try {
      const inscripcionActualizada = await buscarInscripcionEstudiante(estudiante, periodo);
      const registroCompleto = await completarInscripcionConProgramaActual(inscripcionActualizada || inscripcion);
      const derivada = await derivarInscripcionCaja(registroCompleto.id, {
        ...registroCompleto,
        dniEstudiante: registroCompleto.dniEstudiante || estudiante?.dni,
        nombresEstudiante: registroCompleto.nombresEstudiante || estudiante?.nombres,
        codigoEstudiante: registroCompleto.codigoEstudiante || estudiante?.codigoEstudiante,
        gradoEstudiante: registroCompleto.gradoEstudiante || estudiante?.grado,
        seccionEstudiante: registroCompleto.seccionEstudiante || estudiante?.seccion,
      });
      setInscripción(derivada);
      mostrarMensaje("Inscripcion derivada a Caja. Ya puede validarse el pago en el modulo de Caja.", "success");
    } catch (err) {
      mostrarMensaje(err.message || "No se pudo derivar la inscripcion a Caja.");
    } finally {
      setDerivandoCaja(false);
    }
  }

  async function completarInscripcionConProgramaActual(registro) {
    const programaId = registro.programaId || estudiante?.programaAsignado || programaParaRegistro?.id;
    let programaActual = null;

    if (programaId) {
      programaActual = await obtenerProgramaPorId(programaId, periodo).catch(() => null);
    }

    if (!programaActual) {
      programaActual = programas.find((programa) =>
        normalizarComparacion(programa.nombre) === normalizarComparacion(registro.programa)
      ) || programaParaRegistro;
    }

    if (!programaActual) return registro;

    return {
      ...registro,
      programaId: programaActual.id || registro.programaId,
      programa: programaActual.nombre || registro.programa,
      horario: resolverHorarioPorGradoLocal(programaActual, registro.gradoEstudiante || registro.grado || estudiante?.grado) || registro.horario || programaActual.horario,
      docente: programaActual.docente || registro.docente,
      costo: programaActual.costo ?? registro.costo,
      modalidadCobro: programaActual.modalidadCobro || registro.modalidadCobro,
      fechaInicio: programaActual.fechaInicio || registro.fechaInicio,
      fechaFin: programaActual.fechaFin || registro.fechaFin,
      requisitos: programaActual.requisitos || registro.requisitos,
      plantilla: programaActual.plantilla || registro.plantilla,
      plantillaBase64: programaActual.plantillaBase64 || registro.plantillaBase64,
      plantillaVariables: programaActual.plantillaVariables || registro.plantillaVariables || [],
      requiereUniforme: programaActual.requiereUniforme ?? registro.requiereUniforme,
    };
  }

  return (
    <div className="secretaria-layout">
      <aside className="secretaria-sidebar">
        <div className="secretaria-sidebar-brand" aria-label="Colegio San Rafael">
          <img src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
          <div>
            <span>Secretaria</span>
          </div>
        </div>

        <nav className="secretaria-nav" aria-label="Menu del modulo secretaria">
          <button className="secretaria-nav-item secretaria-nav-item-active" type="button">
            <Search size={18} />
            <span>Inscripción presencial</span>
          </button>
        </nav>

        <div className="secretaria-sidebar-footer">
          <button className="secretaria-logout" onClick={onLogout}>
            <LogOut size={18} />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>

      <main className="secretaria-main">
        <section className="secretaria-workspace secretaria-workspace-system">
          <article className="secretaria-card secretaria-search-card">
            <div className="secretaria-card-title">
              <span className="secretaria-title-icon">
                <IdCard size={21} />
              </span>
              <div>
                <h2>Buscar estudiante</h2>
                <p>Ingrese DNI o nombre para iniciar la atencion.</p>
              </div>
            </div>

            <form onSubmit={buscarEstudiante} className="secretaria-form secretaria-search-form-compact">
              <div className="secretaria-field">
                <label htmlFor="periodo">
                  <CalendarDays size={15} />
                  Periodo
                </label>
                <select
                  id="periodo"
                  value={periodo}
                  onChange={(event) => setPeriodo(event.target.value)}
                >
                  <option value="escolar">Año escolar</option>
                  <option value="verano">Ciclo verano</option>
                </select>
              </div>

              <div className="secretaria-search-row">
                <div className="secretaria-input-wrap">
                  <Search size={18} />
                  <input
                    aria-label="DNI o nombre del estudiante"
                    placeholder="Ingrese DNI o nombre del estudiante"
                    value={dni}
                    onChange={(event) => setDni(event.target.value)}
                  />
                </div>
                <button
                  className="secretaria-primary-button"
                  type="submit"
                  disabled={buscando}
                >
                  {buscando ? (
                    <Loader2 className="secretaria-spin" size={17} />
                  ) : (
                    <Search size={17} />
                  )}
                  <span>{buscando ? "Buscando" : "Buscar"}</span>
                </button>
                {periodo === "verano" ? (
                  <button
                    className="secretaria-secondary-button secretaria-new-summer-student"
                    type="button"
                    onClick={() => abrirRegistroAlumnoExterno()}
                  >
                    <UserPlus size={17} />
                    <span>Nuevo estudiante de verano</span>
                  </button>
                ) : null}

              </div>
            </form>

            {resultadosNombre.length ? (
              <div className="secretaria-name-results">
                {resultadosNombre.map((item) => (
                  <button
                    type="button"
                    key={`${item.dni || item.codigoEstudiante || item.nombres}-${item.programaAsignado || "base"}`}
                    onClick={async () => {
                      setDni(item.dni || item.nombres);
                      await aplicarEstudianteEncontrado(item);
                    }}
                  >
                    <strong>{item.nombres}</strong>
                    <span>{item.dni ? `DNI ${item.dni}` : "Sin DNI"} · {item.codigoEstudiante || "Sin código"} · {item.grado} {item.seccion} · {item.programaNombre || "Sin programa"}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {mensaje ? (
              <MantineAlert className="secretaria-message" color="orange" radius="md" icon={<AlertCircle size={18} />}>
                {mensaje}
              </MantineAlert>
            ) : null}

            {!estudiante && !mensaje && !resultadosNombre.length ? (
              <div className="secretaria-search-empty">
                <div className="secretaria-search-empty-icon">
                  <Search size={28} />
                </div>
                <div>
                  <strong>Lista para iniciar</strong>
                  <span>Seleccione el periodo y busque al estudiante para continuar con el registro.</span>
                </div>
              </div>
            ) : null}

            {estudiante ? (
              <section className="secretaria-student-panel">
                <div className="secretaria-student-summary">
                  <div className="secretaria-avatar">
                    {estudiante.nombres
                      .split(" ")
                      .slice(0, 2)
                      .map((name) => name[0])
                      .join("")}
                  </div>
                  <div>
                    <span className="secretaria-overline">Estudiante encontrado</span>
                    <strong>{estudiante.nombres}</strong>
                    <span>{estudiante.dni ? `DNI ${estudiante.dni}` : "Sin DNI registrado"} · {estudiante.codigoEstudiante || "Sin código"}</span>
                  </div>
                  <button className="secretaria-secondary-button secretaria-new-search-button" type="button" onClick={limpiarBusquedaEstudiante}>
                    <Search size={15} />
                    Buscar otro estudiante
                  </button>
                </div>

                <dl className="secretaria-student-data" aria-label="Datos del estudiante">
                  <div className="secretaria-data-compact secretaria-data-identity">
                    <dt>Código</dt>
                    <dd>{estudiante.codigoEstudiante || "No registrado"}</dd>
                  </div>
                  <div className="secretaria-data-compact secretaria-data-identity">
                    <dt>Grado</dt>
                    <dd>{estudiante.grado}</dd>
                  </div>
                  <div className="secretaria-data-compact secretaria-data-identity">
                    <dt>Sección</dt>
                    <dd>{estudiante.seccion}</dd>
                  </div>
                  <div className="secretaria-data-compact secretaria-data-identity">
                    <dt>Tipo de alumno</dt>
                    <dd>{estudiante.tipoAlumno}</dd>
                  </div>
                  <div className="secretaria-data-status secretaria-data-process">
                    <dt>Periodo</dt>
                    <dd>{estudiante.periodo}</dd>
                  </div>
                  <div className="secretaria-data-status secretaria-data-process">
                    <dt>Invitacion</dt>
                    <dd>
                      <span className={`secretaria-pill ${estudiante.tieneInvitacion ? "secretaria-pill-success" : "secretaria-pill-warning"}`}>
                        <CheckCircle2 size={13} />
                        {estudiante.tieneInvitacion ? "Registrada" : "Sin invitación"}
                      </span>
                    </dd>
                  </div>
                  <div className="secretaria-data-status secretaria-data-process">
                    <dt>Estado inscripción</dt>
                    <dd>
                      <span className="secretaria-pill secretaria-pill-info">
                        {estudiante.estadoInscripción}
                      </span>
                    </dd>
                  </div>
                  <div className="secretaria-data-status secretaria-data-process">
                    <dt>Estado pago</dt>
                    <dd>{estudiante.estadoPago || "Sin pago"}</dd>
                  </div>
                  <div className="secretaria-data-wide secretaria-data-program">
                    <dt>{estudiante.tieneInvitacion ? "Programa asignado" : "Programa"}</dt>
                    <dd>{nombreProgramaAMostrar || "Se seleccionara al registrar"}</dd>
                  </div>
                  {inscripcion ? (
                    <>
                      <div className="secretaria-data-program">
                        <dt>Horario</dt>
                        <dd>{resumirClaseSecretaria(inscripcion.horario)}</dd>
                      </div>
                      <div className="secretaria-data-program">
                        <dt>Costo referencial</dt>
                        <dd>S/ {Number(inscripcion.costo).toFixed(2)}</dd>
                      </div>
                      <div className="secretaria-data-program">
                        <dt>Uniforme requerido</dt>
                        <dd>{inscripcion.requiereUniforme ? "Sí" : "No"}</dd>
                      </div>
                      <div className="secretaria-data-contact">
                        <dt>Nombre del padre</dt>
                        <dd>{inscripcion.apoderado}</dd>
                      </div>
                      <div className="secretaria-data-contact">
                        <dt>Teléfono</dt>
                        <dd>{inscripcion.telefono}</dd>
                      </div>
                      <div className="secretaria-data-contact">
                        <dt>Estado pago</dt>
                        <dd>{inscripcion.estadoPago}</dd>
                      </div>
                    </>
                  ) : null}
                </dl>

                <div className="secretaria-info-box">
                  <CheckCircle2 size={19} />
                  {inscripcion ? (
                    <p>
                      Inscripcion registrada. Derivar a Caja para validar el pago.
                    </p>
                  ) : estudiante.tieneInvitacion ? (
                    <p>
                      El estudiante tiene invitación registrada. Secretaria solo
                      podrá inscribirlo en el programa asignado por Coordinación.
                    </p>
                  ) : (
                    <p>
                      No tiene invitación registrada. En año escolar solo procede
                      como inscripcion excepcional con observacion obligatoria.
                    </p>
                  )}
                </div>

                {!inscripcion ? (
                  <button
                    className="secretaria-register-button"
                    type="button"
                    onClick={abrirRegistro}
                  >
                    <ClipboardCheck size={17} />
                    <span>Registrar inscripcion</span>
                  </button>
                ) : (
                  <div className="secretaria-final-actions">
                    <button
                      className="secretaria-primary-button"
                      type="button"
                      onClick={abrirFichaGenerada}
                      disabled={imprimiendoFichaRegistro}
                    >
                      {imprimiendoFichaRegistro ? <Loader2 className="secretaria-spin" size={17} /> : <Printer size={17} />}
                      <span>{imprimiendoFichaRegistro ? "Preparando ficha" : "Imprimir ficha de registro"}</span>
                    </button>
                    <button
                      className="secretaria-register-button"
                      type="button"
                      onClick={derivarACaja}
                      disabled={derivandoCaja || inscripcion.derivadoCaja}
                    >
                      {derivandoCaja ? <Loader2 className="secretaria-spin" size={17} /> : <Send size={17} />}
                      <span>
                        {inscripcion.derivadoCaja
                          ? "Derivado a Caja"
                          : derivandoCaja
                            ? "Derivando"
                            : "Derivar a Caja"}
                      </span>
                    </button>
                  </div>
                )}
              </section>
            ) : null}
          </article>

        </section>

        {modoRegistro && estudiante ? (
          <div
            className="secretaria-modal-overlay"
            role="presentation"
            onClick={() => setModoRegistro(false)}
          >
            <section
              className="secretaria-card secretaria-registration-card secretaria-registration-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="secretaria-registration-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="secretaria-modal-header">
                <div className="secretaria-card-title">
                  <span className="secretaria-title-icon">
                    <ClipboardCheck size={21} />
                  </span>
                  <div>
                    <h2 id="secretaria-registration-title">Registrar inscripcion</h2>
                    <p>Revise la información enviada por Coordinación antes de confirmar.</p>
                  </div>
                </div>
                <button
                  className="secretaria-modal-close"
                  type="button"
                  aria-label="Cerrar formulario de inscripcion"
                  onClick={() => setModoRegistro(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form className="secretaria-registration-form" onSubmit={guardarInscripción}>
                <div className="secretaria-modal-student secretaria-field-full">
                  <p><strong>Nombre y apellido:</strong> {estudiante.nombres}</p>
                  <p><strong>DNI:</strong> {estudiante.dni || "Sin DNI"}</p>
                  <p><strong>Grado:</strong> {estudiante.grado}</p>
                  {!estudiante.esExterno ? (
                    <p><strong>Sección:</strong> {estudiante.seccion || "Sin sección"}</p>
                  ) : null}
                </div>

                {mensaje ? (
                  <MantineAlert
                    className="secretaria-message secretaria-modal-message secretaria-field-full"
                    color="orange"
                    radius="md"
                    icon={<AlertCircle size={18} />}
                  >
                    {mensaje}
                  </MantineAlert>
                ) : null}

                {estudiante.esExterno ? (
                  <div className="secretaria-registration-section secretaria-registration-minor secretaria-field-full">
                    <div className="secretaria-registration-section-head">
                      <strong>Datos del menor</strong>
                      <span>Solo se registra como alumno externo en ciclo verano</span>
                    </div>

                    <CampoTexto
                      label="DNI del alumno"
                      value={formulario.dniExterno}
                      onChange={(value) => actualizarFormulario("dniExterno", value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="DNI de 8 numeros"
                      maxLength="8"
                    />
                    <CampoTexto
                      label="Nombre y apellidos del estudiante"
                      value={formulario.nombresExterno}
                      onChange={(value) => actualizarFormulario("nombresExterno", value)}
                      placeholder="Nombre completo del estudiante"
                    />
                    <CampoTexto
                      label="Edad"
                      className="secretaria-field-short secretaria-age-field"
                      value={formulario.edadExterno}
                      onChange={(value) => actualizarFormulario("edadExterno", value.replace(/\D/g, "").slice(0, 2))}
                      placeholder="Ej: 9"
                      maxLength="2"
                    />
                    <CampoTexto
                      label="Domicilio"
                      className="secretaria-field-wide"
                      value={formulario.domicilioExterno}
                      onChange={(value) => actualizarFormulario("domicilioExterno", value)}
                      placeholder="Dirección del estudiante"
                    />
                    <div className="secretaria-field secretaria-field-short">
                      <label htmlFor="sexoExterno">Sexo</label>
                      <select
                        id="sexoExterno"
                        value={formulario.sexoExterno}
                        onChange={(event) => actualizarFormulario("sexoExterno", event.target.value)}
                      >
                        <option value="">Seleccione</option>
                        <option value="F">Femenino</option>
                        <option value="M">Masculino</option>
                      </select>
                    </div>
                    <div className="secretaria-field secretaria-field-medium">
                      <label htmlFor="tipoAlumnoVerano">Interno o externo</label>
                      <select
                        id="tipoAlumnoVerano"
                        value={formulario.tipoAlumnoVerano}
                        onChange={(event) => actualizarFormulario("tipoAlumnoVerano", event.target.value)}
                      >
                        <option value="Alumno externo">Externo</option>
                        <option value="Alumno interno">Interno</option>
                      </select>
                    </div>
                    <CampoTexto
                      label="Grado"
                      value={formulario.gradoExterno}
                      onChange={(value) => actualizarFormulario("gradoExterno", value)}
                      placeholder="Ej: 4 Primaria"
                    />
                  </div>
                ) : null}

                <div className="secretaria-registration-section secretaria-registration-program secretaria-field-full">
                  <div className="secretaria-registration-section-head">
                    <strong>Programa</strong>
                    <span>Datos necesarios para confirmar la inscripción</span>
                  </div>

                {(periodo === "verano" || !estudiante.tieneInvitacion) ? (
                  <div className="secretaria-field secretaria-program-select-field">
                    <label htmlFor="programa">Programa o taller</label>
                    <select
                      id="programa"
                      value={formulario.programa}
                      disabled={programas.length === 0}
                      onChange={(event) =>
                        actualizarFormulario("programa", event.target.value)
                      }
                    >
                      <option value="">
                        {programas.length ? "Seleccione programa" : "No hay programas habilitados"}
                      </option>
                      {programas.map((programa) => (
                        <option key={programa.id} value={programa.id}>
                          {programa.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <CampoLectura label="Programa / taller" value={programaParaRegistro?.nombre || estudiante.programaNombre || ""} />
                )}

                {programas.length === 0 && (periodo === "verano" || !estudiante.tieneInvitacion) ? (
                  <MantineAlert
                    className="secretaria-message secretaria-modal-message secretaria-field-full"
                    color="orange"
                    radius="md"
                    icon={<AlertCircle size={18} />}
                  >
                    Coordinación debe registrar y habilitar un programa para este periodo antes de inscribir.
                  </MantineAlert>
                ) : null}

                <div className="secretaria-schedule-summary secretaria-field-full">
                  <DatoHorario label="Día" value={horarioResumenRegistro.dia} />
                  <DatoHorario label="Clase" value={horarioResumenRegistro.clase} />
                  <DatoHorario label="Almuerzo" value={horarioResumenRegistro.almuerzo} />
                </div>
                <div className="secretaria-program-cost-row secretaria-field-full">
                  <CampoLectura label="Costo referencial" value={programaParaRegistro ? `S/ ${Number(programaParaRegistro.costo).toFixed(2)}` : ""} />
                  <CampoLectura label="Cupos disponibles" value={formatearCuposSecretaria(programaParaRegistro)} />
                </div>
                </div>

                {periodo === "verano" ? (
                  <CampoTexto
                    label="Colegio de procedencia"
                    value={formulario.colegioProcedencia}
                    onChange={(value) => actualizarFormulario("colegioProcedencia", value)}
                    placeholder="Ej: Colegio San Rafael"
                  />
                ) : null}

                <div className="secretaria-registration-section secretaria-registration-contact secretaria-field-full">
                  <div className="secretaria-registration-section-head">
                    <strong>Padre o apoderado</strong>
                    <span>Información de contacto para el registro</span>
                  </div>

                <CampoTexto
                  label="Nombre del padre / apoderado"
                  value={formulario.apoderado}
                  onChange={(value) => actualizarFormulario("apoderado", value)}
                  placeholder="Nombre completo del apoderado"
                />

                <CampoTexto
                  label="Teléfono del padre"
                  icon={<Phone size={15} />}
                  value={formulario.telefono}
                  onChange={(value) =>
                    actualizarFormulario("telefono", value.replace(/\D/g, ""))
                  }
                  placeholder="987654321"
                  maxLength="9"
                />

                {programaParaRegistro?.requiereUniforme ? (
                  <div className="secretaria-field">
                    <label htmlFor="talla">Talla de uniforme</label>
                    <select
                      id="talla"
                      value={formulario.tallaUniforme}
                      onChange={(event) =>
                        actualizarFormulario("tallaUniforme", event.target.value)
                      }
                    >
                      <option value="">Seleccione talla</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                    </select>
                  </div>
                ) : null}

                </div>

                <div className="secretaria-field secretaria-field-full">
                  <label htmlFor="observacion">Observación</label>
                  <textarea
                    id="observacion"
                    rows="3"
                    placeholder="Observación opcional para el registro"
                    value={formulario.observacion}
                    onChange={(event) =>
                      actualizarFormulario("observacion", event.target.value)
                    }
                  />
                </div>

                <label className="secretaria-check secretaria-field-full">
                  <input
                    type="checkbox"
                    checked={formulario.aceptaCondiciones}
                    onChange={(event) =>
                      actualizarFormulario("aceptaCondiciones", event.target.checked)
                    }
                  />
                  <span>El padre/apoderado acepta las condiciones del programa.</span>
                </label>

                <div className="secretaria-form-actions">
                  <button
                    className="secretaria-secondary-button"
                    type="button"
                    onClick={() => setModoRegistro(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="secretaria-register-button"
                    type="submit"
                    disabled={guardando}
                  >
                    {guardando ? (
                      <Loader2 className="secretaria-spin" size={17} />
                    ) : (
                      <ClipboardCheck size={17} />
                    )}
                    <span>{guardando ? "Guardando" : "Confirmar inscripcion"}</span>
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {modalExito && inscripcion ? (
          <div className="secretaria-modal-overlay" role="presentation">
            <section className="secretaria-success-modal" role="dialog" aria-modal="true">
              <div className="secretaria-success-icon">
                <CheckCircle2 size={44} />
              </div>
              <h2>Inscripción registrada</h2>
              <p>La inscripcion fue registrada correctamente.</p>
              <div className="secretaria-success-summary">
                <p><strong>Estudiante:</strong> {inscripcion.nombresEstudiante}</p>
                <p><strong>Programa:</strong> {inscripcion.programa}</p>
                <p><strong>Horario:</strong> {inscripcion.horario}</p>
                {inscripcion.colegioProcedencia ? (
                  <p><strong>Colegio:</strong> {inscripcion.colegioProcedencia}</p>
                ) : null}
                <p><strong>Padre/apoderado:</strong> {inscripcion.apoderado}</p>
                <p><strong>Estado:</strong> {inscripcion.estadoInscripción}</p>
              </div>
              <button
                className="secretaria-register-button"
                type="button"
                onClick={() => setModalExito(false)}
              >
                Aceptar
              </button>
            </section>
          </div>
        ) : null}

      </main>
    </div>
  );
}

export default Secretaria;

