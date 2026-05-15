import { useEffect, useState } from "react";
import { Alert as MantineAlert } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  IdCard,
  Loader2,
  LogOut,
  Mail,
  Phone,
  Printer,
  Search,
  UserRound,
  X,
} from "lucide-react";
import {
  buscarEstudiantePorDni,
  buscarEstudiantesPorNombre,
  buscarInscripcionEstudiante,
  listarProgramasPorPeriodo,
  obtenerProgramaPorId,
  registrarInscripcion,
  registrarDocumentoGenerado,
} from "./services/secretariaService";
import {
  validarCorreoPadre,
  validarDni,
  validarTelefono,
  validarTextoSeguro,
} from "../../services/validators";
import {
  formatearFechaPeru,
} from "../../services/dateService";
import { FichaAceptación, imprimirInscripcionDirecta } from "./components/SecretariaFicha";
import {
  CampoLectura,
  CampoTexto,
  DatoHorario,
  ProcesoItem,
  formatearCuposSecretaria,
  resumirHorarioSecretaria,
} from "./components/SecretariaFields";
import "./Secretaria.css";

const LOGO_COLEGIO_URL =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8ss429VynuUkBBQBrN6Up-lUBby7o0oqjvQ&s";

const formularioInicial = {
  nombresExterno: "",
  programa: "",
  colegioProcedencia: "",
  apoderado: "",
  telefono: "",
  correo: "",
  medioEnvio: "WhatsApp",
  tallaUniforme: "",
  observacion: "",
  aceptaCondiciones: false,
};

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
  const [resultadosNombre, setResultadosNombre] = useState([]);
  const [documentoGenerado, setDocumentoGenerado] = useState(false);

  function mostrarMensaje(texto, tipo = "error") {
    setMensaje(texto);
    notifications.show({
      color: tipo === "success" ? "sanrafael" : "orange",
      title: tipo === "success" ? "Secretaría" : "Revisar atención",
      message: texto,
    });
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
    setDocumentoGenerado(false);
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

      setEstudiante({
        dni,
        nombres: "Alumno externo por registrar",
        grado: "No aplica",
        seccion: "No aplica",
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
        programa: "",
      });
      setModoRegistro(true);
      setMensaje("");
      return;
    }

    await aplicarEstudianteEncontrado(encontrado);
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
    setDocumentoGenerado(false);
    setFormulario({
      ...formularioInicial,
      programa: encontrado.tieneInvitacion ? encontrado.programaAsignado : "",
      apoderado: registroExistente?.apoderado ?? encontrado.apoderado ?? "",
      telefono: registroExistente?.telefono ?? encontrado.telefonoApoderado ?? "",
      correo: registroExistente?.correo ?? "",
      medioEnvio: registroExistente?.medioEnvio ?? "WhatsApp",
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
    setDocumentoGenerado(false);
  }

  async function guardarInscripción(event) {
    event.preventDefault();
    setMensaje("");

    if (!estudiante) {
      mostrarMensaje("Primero busque un estudiante registrado.");
      return;
    }

    if (estudiante.esExterno && !validarTextoSeguro(formulario.nombresExterno)) {
      mostrarMensaje("Ingrese el nombre completo del alumno externo.");
      return;
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
      mostrarMensaje("Ingrese un telefono WhatsApp valido de 9 numeros.");
      return;
    }

    if (!validarCorreoPadre(formulario.correo)) {
      mostrarMensaje("Ingrese un correo valido o deje el campo vacio. No se aceptan correos temporales.");
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
      const registro = await registrarInscripcion({
        dniEstudiante: estudiante.dni,
        codigoEstudiante: estudiante.codigoEstudiante || "",
        gradoEstudiante: estudiante.grado || "",
        nombresEstudiante: estudiante.esExterno
          ? formulario.nombresExterno.trim()
          : estudiante.nombres,
        tipoInscripción:
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
        correo: formulario.correo.trim(),
        medioEnvio: formulario.medioEnvio,
        tallaUniforme: formulario.tallaUniforme,
        observacion: formulario.observacion.trim(),
        origenRegistro: estudiante.tieneInvitacion
          ? "Alumno invitado por Coordinación"
          : "Registro excepcional por Secretaría",
      });

      setInscripción(registro);
      setDocumentoGenerado(false);
      setEstudiante((actual) =>
        actual ? { ...actual, estadoInscripción: registro.estadoInscripción, estadoPago: registro.estadoPago } : actual
      );
      setModoRegistro(false);
      setModalExito(true);
      setMensaje("");
      notifications.show({
        color: "green",
        title: "Secretaría",
        message: "Inscripción registrada correctamente.",
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
      setDocumentoGenerado(true);
      await imprimirInscripcionDirecta(estudiante, fichaRegistro);
    } catch (err) {
      mostrarMensaje(err.message || "No se pudo preparar la ficha para imprimir.");
    } finally {
      setImprimiendoFichaRegistro(false);
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
        <div className="secretaria-brand" aria-label="Colegio San Rafael">
          <div className="secretaria-brand-mark secretaria-brand-logo-frame">
            <img src={LOGO_COLEGIO_URL} alt="Marca Colegio San Rafael" />
          </div>
        </div>

        <p className="secretaria-module-label">Secretaria</p>

        <nav className="secretaria-nav" aria-label="Menu del modulo secretaria">
          <button className="secretaria-nav-item secretaria-nav-item-active">
            <Search size={18} />
            <span>Inscripción presencial</span>
            <ChevronRight size={16} />
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
        <header className="secretaria-topbar">
          <div className="secretaria-topbar-brand">
            <div>
              <h1>Inscripcion extracurricular</h1>
            </div>
          </div>
        </header>

        <section className="secretaria-workspace secretaria-workspace-system">
          <article className="secretaria-card secretaria-search-card">
            <div className="secretaria-card-title">
              <span className="secretaria-title-icon">
                <IdCard size={21} />
              </span>
              <div>
                <h2>Buscar estudiante</h2>
              </div>
            </div>

            <form onSubmit={buscarEstudiante} className="secretaria-form">
              <div className="secretaria-field">
                <label htmlFor="periodo">
                  <CalendarDays size={15} />
                  Periodo de inscripcion
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
                        <dd>{inscripcion.horario}</dd>
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
                  <button
                    className="secretaria-primary-button"
                    type="button"
                    onClick={abrirFichaGenerada}
                    disabled={imprimiendoFichaRegistro}
                  >
                    {imprimiendoFichaRegistro ? <Loader2 className="secretaria-spin" size={17} /> : <Printer size={17} />}
                    <span>{imprimiendoFichaRegistro ? "Preparando ficha" : "Imprimir ficha de registro"}</span>
                  </button>
                )}
              </section>
            ) : null}
          </article>

          <aside className="secretaria-card secretaria-process-card">
            <div className="secretaria-process-heading">
              <h2>Proceso</h2>
              <span>{inscripcion ? "Derivar a Caja" : "En atencion"}</span>
            </div>

            <div className="secretaria-process-list">
              <ProcesoItem activo completado={Boolean(estudiante)} texto="Busqueda" />
              <ProcesoItem activo={Boolean(estudiante)} completado={modoRegistro || Boolean(inscripcion)} texto="Apoderado" />
              <ProcesoItem activo={Boolean(inscripcion)} completado={Boolean(inscripcion)} texto="Inscripcion" />
              <ProcesoItem activo={Boolean(inscripcion)} completado={documentoGenerado} texto="Ficha" />
            </div>

            {inscripcion ? (
              <div className="secretaria-ticket">
                <span>Codigo</span>
                <strong>{inscripcion.id}</strong>
                <p>Pago pendiente. Puede derivar a Caja.</p>
              </div>
            ) : (
              <p className="secretaria-process-note">
                Complete la busqueda y el registro para habilitar la derivacion.
              </p>
            )}
          </aside>

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
                  <p><strong>Sección:</strong> {estudiante.seccion || "Sin sección"}</p>
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
                  <CampoTexto
                    label="Nombre del alumno externo"
                    value={formulario.nombresExterno}
                    onChange={(value) => actualizarFormulario("nombresExterno", value)}
                    placeholder="Nombre completo del estudiante"
                  />
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
                <CampoLectura label="Costo referencial" value={programaParaRegistro ? `S/ ${Number(programaParaRegistro.costo).toFixed(2)}` : ""} />
                <CampoLectura label="Cupos disponibles" value={formatearCuposSecretaria(programaParaRegistro)} />
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

                <CampoTexto
                  label="Correo opcional"
                  icon={<Mail size={15} />}
                  value={formulario.correo}
                  onChange={(value) => actualizarFormulario("correo", value)}
                  placeholder="correo@ejemplo.com"
                />

                <div className="secretaria-field">
                  <label htmlFor="medio-envio">Medio de envio</label>
                  <select
                    id="medio-envio"
                    value={formulario.medioEnvio}
                    onChange={(event) => actualizarFormulario("medioEnvio", event.target.value)}
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Correo">Correo</option>
                    <option value="Impreso">Impreso</option>
                  </select>
                </div>
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

function resolverHorarioPorGradoLocal(programa, gradoAlumno = "") {
  const grupos = programa?.horariosPorGrupo || [];
  if (!Array.isArray(grupos) || grupos.length === 0) return "";

  const gradoNormalizado = descomponerGradoLocal(gradoAlumno);
  if (!gradoNormalizado.numero) return "";

  let gradoDelTurno = "";
  const grupo = grupos.find((item) => {
    gradoDelTurno = (item.grados || []).find((grado) => coincideGradoLocal(grado, gradoNormalizado)) || "";
    return Boolean(gradoDelTurno);
  });

  if (!grupo) return "";
  const grado = formatearGradoLocal(gradoDelTurno || gradoAlumno);
  const aula = grupo.aula ? ` · Aula ${grupo.aula}` : "";
  return `${grado ? `${grado}: ` : ""}${grupo.dia} almuerzo ${grupo.almuerzoInicio || "14:20"}-${grupo.almuerzoFin || "15:10"}, clase ${grupo.horaInicio || ""}-${grupo.horaFin || ""}${aula}`;
}

function coincideGradoLocal(gradoGrupo, gradoAlumnoNormalizado) {
  const grupo = descomponerGradoLocal(gradoGrupo);
  if (!grupo.numero || !gradoAlumnoNormalizado?.numero) return false;
  if (grupo.numero !== gradoAlumnoNormalizado.numero) return false;
  return !grupo.nivel || !gradoAlumnoNormalizado.nivel || grupo.nivel === gradoAlumnoNormalizado.nivel;
}

function formatearGradoLocal(valor) {
  const [nivel, grado] = String(valor || "").split(":");
  if (!nivel || !grado) return valor;
  return `${nivel} ${grado}`;
}

function descomponerGradoLocal(valor) {
  const texto = normalizarComparacion(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

function normalizarComparacion(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default Secretaria;

