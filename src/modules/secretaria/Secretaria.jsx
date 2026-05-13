import { useEffect, useRef, useState } from "react";
import { Alert as MantineAlert } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { renderAsync } from "docx-preview";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
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
} from "./secretariaService";
import {
  validarCorreoPadre,
  validarDni,
  validarTelefono,
  validarTextoSeguro,
} from "../../services/validators";
import {
  calcularDuracionTexto as calcularDuracionFechas,
  formatearFechaPeru,
  normalizarFecha,
} from "../../services/dateService";
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
    const estadoRegistro = registroExistente?.estadoInscripción || registroExistente?.["estadoInscripciÃ³n"];
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
      horario: programaActual.horario || registro.horario,
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
                  <p><strong>Código:</strong> {estudiante.codigoEstudiante || "No registrado"}</p>
                  <p><strong>Grado:</strong> {estudiante.grado}</p>
                  <p><strong>Sección:</strong> {estudiante.seccion}</p>
                  <p><strong>Tipo:</strong> {estudiante.tipoAlumno}</p>
                  <p><strong>Periodo:</strong> {estudiante.periodo}</p>
                  <p><strong>Estado inicial:</strong> {estudiante.estadoInscripción}</p>
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

                {(periodo === "verano" || !estudiante.tieneInvitacion) ? (
                  <div className="secretaria-field">
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
                          {programa.nombre} - {programa.cupos}
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

                <CampoLectura label="Periodo" value={programaParaRegistro?.periodo || estudiante.periodo || ""} />
                <CampoLectura label="Horario disponible" value={programaParaRegistro?.horario || ""} />
                <CampoLectura label="Docente / entrenador / tutor referencial" value={programaParaRegistro?.docente || ""} />
                <CampoLectura label="Costo referencial" value={programaParaRegistro ? `S/ ${Number(programaParaRegistro.costo).toFixed(2)}` : ""} />
                <CampoLectura label="Modalidad de cobro" value={programaParaRegistro?.modalidadCobro || ""} />
                <CampoLectura label="Cupos" value={programaParaRegistro?.cupos || ""} />
                <CampoLectura label="Requiere uniforme" value={programaParaRegistro?.requiereUniforme ? "Sí" : "No"} />
                <CampoLectura label="Plantilla asociada" value={programaParaRegistro?.plantilla || "Sin plantilla"} />
                <CampoLectura label="Requisitos" value={programaParaRegistro?.requisitos || (programaParaRegistro?.requiereUniforme ? "Uniforme requerido" : "Sin requisitos adicionales")} />

                {periodo === "verano" ? (
                  <CampoTexto
                    label="Colegio de procedencia"
                    value={formulario.colegioProcedencia}
                    onChange={(value) => actualizarFormulario("colegioProcedencia", value)}
                    placeholder="Ej: Colegio San Rafael"
                  />
                ) : null}

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

function ProcesoItem({ activo, completado, texto }) {
  return (
    <div className={`secretaria-process-item ${activo ? "is-active" : ""}`}>
      <span>{completado ? <CheckCircle2 size={15} /> : null}</span>
      <p>{texto}</p>
    </div>
  );
}

function CampoTexto({ label, icon, value, onChange, placeholder, maxLength }) {
  return (
    <div className="secretaria-field">
      <label>
        {icon}
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );
}

function CampoLectura({ label, value }) {
  return (
    <div className="secretaria-field">
      <label>{label}</label>
      <div className="secretaria-readonly-field">{value || "No definido"}</div>
    </div>
  );
}

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

      generarComunicadoWordBlob({ estudiante, inscripcion })
        .then(async (blob) => {
          if (!activo || !wordPreviewRef.current) return;
          const blobVista = await crearWordVistaUnaHoja(blob);
          wordPreviewRef.current.innerHTML = "";
          await renderAsync(blobVista, wordPreviewRef.current, null, {
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
          compactarVistaDocxEnUnaHoja(wordPreviewRef.current);
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
        const word = await generarComunicadoWordBlob({ estudiante, inscripcion });
        const pdf = await convertirWordOriginalAPdf(word);
        imprimirPdfBlob(pdf);
      } catch (err) {
        setWordPreview((actual) => ({
          ...actual,
          cargando: false,
          error: err.message || "No se pudo preparar la ficha para impresión.",
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
    const word = await generarComunicadoWordBlob({ estudiante, inscripcion });
    const pdf = await convertirWordOriginalAPdf(word);
    imprimirPdfBlob(pdf);
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
    `Para la comunicación se utilizará el medio ${ficha.apoderado.medioEnvio}, con celular ${ficha.apoderado.telefono}.`,
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

async function generarComunicadoWordBlob({ estudiante, inscripcion }) {
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
    return doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  } catch {
    return generarComunicadoWordBlobLegacy({ datos, inscripcion });
  }
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

async function crearWordVistaUnaHoja(blob) {
  try {
    const zip = await JSZip.loadAsync(blob);
    const documento = zip.file("word/document.xml");
    if (!documento) return blob;

    const xml = await documento.async("text");
    zip.file("word/document.xml", limpiarSaltosWordParaVista(xml));

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  } catch {
    return blob;
  }
}

function limpiarSaltosWordParaVista(xml) {
  let limpio = String(xml || "")
    .replace(/<w:lastRenderedPageBreak\s*\/>/gi, "")
    .replace(/<w:br\b(?=[^>]*w:type="page")[^>]*\/>/gi, "")
    .replace(/<w:pageBreakBefore\b[^>]*(?:\/>|>[\s\S]*?<\/w:pageBreakBefore>)/gi, "");

  const secciones = limpio.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/gi) || [];
  if (secciones.length > 1) {
    let indice = 0;
    limpio = limpio.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/gi, (coincidencia) => {
      indice += 1;
      return indice === secciones.length ? coincidencia : "";
    });
  }

  return limpio;
}

function compactarVistaDocxEnUnaHoja(contenedor) {
  const paginas = Array.from(contenedor?.querySelectorAll(".docx") || []);
  if (!paginas.length) return;

  const paginasConContenido = paginas.filter(paginaTieneContenidoDocx);
  paginas
    .filter((pagina) => !paginasConContenido.includes(pagina))
    .forEach((pagina) => pagina.remove());

  const principal = paginasConContenido[0];
  if (!principal) return;

  const destino = principal.querySelector("article") || principal;
  paginasConContenido.slice(1).forEach((pagina) => {
    const origen = pagina.querySelector("article") || pagina;
    Array.from(origen.childNodes).forEach((nodo) => destino.appendChild(nodo));
    pagina.remove();
  });

  principal.style.overflow = "visible";
  principal.style.height = "auto";
  principal.style.minHeight = principal.style.minHeight || "297mm";
}

function paginaTieneContenidoDocx(pagina) {
  const texto = pagina.textContent.replace(/\s+/g, "").trim();
  const visuales = Array.from(pagina.querySelectorAll("img, svg, canvas, picture"));
  const tablasConContenido = Array.from(pagina.querySelectorAll("table")).some((tabla) =>
    tabla.textContent.replace(/\s+/g, "").trim().length > 0
  );

  return texto.length > 2 || tablasConContenido || visuales.length > 0;
}

async function generarComunicadoWordBlobLegacy({ datos, inscripcion }) {
  const zip = await JSZip.loadAsync(base64ToArrayBuffer(inscripcion.plantillaBase64));
  const archivosXml = Object.values(zip.files).filter((file) =>
    /^word\/(document|header|footer)\d*\.xml$/i.test(file.name)
  );

  await Promise.all(archivosXml.map(async (file) => {
    const xml = await file.async("text");
    zip.file(file.name, reemplazarVariablesXml(xml, datos));
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
  const fechaInicio = formatearFechaValor(inscripcion.fechaInicio);
  const fechaFin = formatearFechaValor(inscripcion.fechaFin);
  const duracion = calcularDuracionTexto(inscripcion.fechaInicio, inscripcion.fechaFin);
  const dias = extraerDiasHorario(inscripcion.horario);
  const horas = extraerHorasHorario(inscripcion.horario);
  const alumno = inscripcion.nombresEstudiante || estudiante?.nombres || "";
  const apoderado = inscripcion.apoderado || "";
  const telefono = inscripcion.telefono || "";
  const grado = estudiante?.grado || "";
  const seccion = estudiante?.seccion || "";
  return {
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
    grado_seccion: `${estudiante?.grado || ""} ${estudiante?.seccion || ""}`.trim(),
    periodo: estudiante?.periodo || obtenerNombrePeriodo(inscripcion.periodo),
    ciclo: estudiante?.periodo || obtenerNombrePeriodo(inscripcion.periodo),
    horario: inscripcion.horario || "",
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
    almuerzo: "No aplica",
    alm1: "No aplica",
    costo,
    modalidad_cobro: inscripcion.modalidadCobro || "",
    requisitos: inscripcion.requisitos || "",
    observacion: inscripcion.observacion || "",
    inicio: fechaInicio,
    fecha_inicio: fechaInicio,
    fin: fechaFin,
    fecha_fin: fechaFin,
    duracion,
    duración: duracion,
    fecha: formatearFechaFicha(new Date()),
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

function extraerDiasHorario(horario) {
  const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const texto = normalizarComparacion(horario);
  return dias
    .filter((dia) => texto.includes(normalizarComparacion(dia)))
    .join(", ");
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
          body { margin: 0; color: #253244; font-family: Arial, sans-serif; background: #fff; }
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
      ["Correo", ficha.apoderado.correo],
      ["Medio de envio", ficha.apoderado.medioEnvio],
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
          body { margin: 0; color: #253244; font-family: Arial, sans-serif; background: #fff; }
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
    ["Correo", ficha.apoderado.correo],
    ["Medio de envio", ficha.apoderado.medioEnvio],
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

export default Secretaria;
