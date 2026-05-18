import { useEffect, useState } from "react";
import JSZip from "jszip";
import { Alert as MantineAlert, Table, Badge, Group, ActionIcon, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { jsPDF } from "jspdf";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCalendar as CalendarDays,
  IconChevronRight as ChevronRight,
  IconCircleCheck as CheckCircle2,
  IconCurrencyDollar as DollarSign,
  IconEdit as Edit3,
  IconEye as Eye,
  IconFileDownload as FileDown,
  IconFileText as FileText,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconPlus as Plus,
  IconSearch as Search,
  IconToggleLeft as ToggleLeft,
  IconToggleRight as ToggleRight,
  IconTrash as Trash2,
  IconUpload as Upload,
  IconUsers as Users,
  IconX as X,
} from "@tabler/icons-react";
import {
  listarProgramas, crearPrograma, crearProgramaDesdeDocumento, editarPrograma, cambiarEstadoPrograma,
  eliminarPrograma,
  listarCategorias, crearCategoria, eliminarCategoria, listarInvitados,
  previsualizarCargaAlumnosMasiva, confirmarCargaAlumnos, obtenerActividadPrograma,
} from "./services/coordinacionService";
import { fechaActualIso } from "../../services/dateService";
import GradeSelector from "./components/GradeSelector";
import { HorarioTabla, GradosTabla, VigenciaTabla, CuposTabla } from "./components/ProgramTableCells";
import SummaryBox from "./components/SummaryBox";
import TemplateUploadField from "./components/TemplateUploadField";
import "./Coordinacion.css";

const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";

const formInicial = {
  nombre: "", periodo: "escolar", categoria: "", grupo: "", horario: "",
  gradosAplicables: [], dias: [], horaInicio: "", horaFin: "",
  almuerzoInicio: "", almuerzoFin: "",
  horariosPorGrupo: [],
  fechaInicio: "", fechaFin: "", cupos: "", costo: "", modalidadCobro: "Mensual",
  responsable: "", tutora: "", plantilla: "", plantillaBase64: "", plantillaVariables: [],
  plantillaValidada: false, plantillaActualizadaEn: "", requisitos: "",
  comunicado: "", detalleCosto: "", detalleAlmuerzo: "", concesionarios: "",
  requiereUniforme: false,
};

const horarioGrupoInicial = {
  grados: [],
  dia: "Jueves",
  almuerzoInicio: "14:20",
  almuerzoFin: "15:10",
  horaInicio: "15:20",
  horaFin: "17:20",
  aula: "",
};

const variablesPlantillaRequeridas = [
  { id: "n_com", label: "N_COM", aliases: ["N_COM"] },
  { id: "titulo", label: "TITULO", aliases: ["TITULO", "TÍTULO"] },
  { id: "fecha", label: "FECHA", aliases: ["FECHA"] },
  { id: "area", label: "AREA", aliases: ["AREA", "ÁREA"] },
  { id: "prog", label: "PROG", aliases: ["PROG", "PROGRAMA"] },
  { id: "ciclo", label: "CICLO", aliases: ["CICLO"] },
  { id: "ini", label: "INI", aliases: ["INI", "INICIO"] },
  { id: "fin", label: "FIN", aliases: ["FIN"] },
  { id: "dur", label: "DUR", aliases: ["DUR", "DURACION", "DURACIÓN"] },
  { id: "n1", label: "N1", aliases: ["N1"] },
  { id: "n2", label: "N2", aliases: ["N2"] },
  { id: "n3", label: "N3", aliases: ["N3"] },
  { id: "n4", label: "N4", aliases: ["N4"] },
  { id: "dia", label: "DIA", aliases: ["DIA", "DÍA"] },
  { id: "alm", label: "ALM", aliases: ["ALM", "ALMUERZO"] },
  { id: "clase", label: "CLASE", aliases: ["CLASE"] },
  { id: "pago", label: "PAGO", aliases: ["PAGO"] },
  { id: "costo", label: "COSTO", aliases: ["COSTO"] },
  { id: "hor_alm", label: "HOR_ALM", aliases: ["HOR_ALM"] },
  { id: "alumno", label: "ALUMNO", aliases: ["ALUMNO", "NOMBRE_ALUMNO", "NOMBRE DEL ALUMNO", "ESTUDIANTE"] },
  { id: "gr_sec", label: "GR_SEC", aliases: ["GR_SEC", "GRADO_SECCION", "GRADO SECCION"] },
  { id: "apod", label: "APOD", aliases: ["APOD", "APODERADO", "NOMBRE_APODERADO"] },
  { id: "cel", label: "CEL", aliases: ["CEL", "CELULAR", "TELEFONO", "TELÉFONO"] },
];

const nivelesGrados = [
  { nivel: "Inicial", grados: ["3 años", "4 años", "5 años"] },
  { nivel: "Primaria", grados: ["1", "2", "3", "4", "5", "6"] },
  { nivel: "Secundaria", grados: ["1", "2", "3", "4", "5"] },
];

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const vistasNav = [
  { id: "programas", label: "Gestion de Programas", icon: BookOpen },
  { id: "carga", label: "Carga Excel", icon: Upload },
  { id: "documentos", label: "Plantillas / Documentos", icon: FileText },
];

function Coordinacion({ user, onLogout }) {
  const esProfesor = user?.username === "profe" || user?.name === "Profesor";
  const [vista, setVista] = useState("programas");
  const [programas, setProgramas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [mensaje, setMensaje] = useState("");
  const [tipoMsg, setTipoMsg] = useState("error");
  const [cargando, setCargando] = useState(false);


  // Modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [guardando, setGuardando] = useState(false);
  const [nuevaCat, setNuevaCat] = useState("");
  const [catAEliminar, setCatAEliminar] = useState("");
  const [plantillaInputKey, setPlantillaInputKey] = useState(0);
  const [programaDocsId, setProgramaDocsId] = useState("");
  const [lecturaDocumento, setLecturaDocumento] = useState(null);
  const [sidebarAbierta, setSidebarAbierta] = useState(true);

  // Modal invitados
  const [showInvitados, setShowInvitados] = useState(false);
  const [invitados, setInvitados] = useState([]);
  const [progSeleccionado, setProgSeleccionado] = useState(null);

  // Carga Excel
  const cargaPeriodo = "escolar";
  const [archivosExcel, setArchivosExcel] = useState([]);
  const [archivoInputKey, setArchivoInputKey] = useState(0);
  const [previewCarga, setPreviewCarga] = useState(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [progresoCarga, setProgresoCarga] = useState(null);
  const [confirmandoCarga, setConfirmandoCarga] = useState(false);

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    const [progs, cats] = await Promise.all([
      listarProgramas(),
      listarCategorias(),
    ]);
    setProgramas(progs);
    setCategorias(cats);
    setCargando(false);
  }



  function mostrarMsg(texto, tipo = "error") {
    setMensaje(texto);
    setTipoMsg(tipo);
    notifications.show({
      color: tipo === "success" ? "sanrafael" : "orange",
      title: tipo === "success" ? "Coordinación" : "Revisar datos",
      message: texto,
    });
    if (tipo === "success") setTimeout(() => setMensaje(""), 4000);
  }

  // ── Filtrar programas ──
  const programasFiltrados = programas.filter(p => {
    const coincide = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.id.toLowerCase().includes(busqueda.toLowerCase());
    const filtra = filtroPeriodo === "todos" || normalizarPeriodoVista(p.periodo) === filtroPeriodo;
    return coincide && filtra;
  });
  const programaDocs = programas.find((item) => item.id === programaDocsId);
  const historialPlantillas = programas.filter((programa) => programa.plantilla && programa.plantillaBase64);

  // ── Abrir modal crear ──
  function abrirCrear() {
    setForm(formInicial);
    setModoEditar(false);
    setProgramaDocsId("");
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);
    setShowModal(true);
    setMensaje("");
  }

  function datosProgramaAFormulario(prog) {
    return {
      nombre: prog.nombre, periodo: normalizarPeriodoVista(prog.periodo), categoria: prog.categoria,
      grupo: prog.grupo, horario: prog.horario, fechaInicio: prog.fechaInicio,
      gradosAplicables: prog.gradosAplicables || [],
      dias: prog.dias || [],
      horaInicio: prog.horaInicio || "",
      horaFin: prog.horaFin || "",
      almuerzoInicio: prog.almuerzoInicio || "",
      almuerzoFin: prog.almuerzoFin || "",
      horariosPorGrupo: prog.horariosPorGrupo || [],
      fechaFin: prog.fechaFin, cupos: String(prog.cupos), costo: String(prog.costo),
      modalidadCobro: prog.modalidadCobro, responsable: prog.responsable,
      tutora: prog.tutora, plantilla: prog.plantilla || "",
      plantillaBase64: prog.plantillaBase64 || "",
      plantillaVariables: prog.plantillaVariables || [],
      plantillaValidada: Boolean(prog.plantillaValidada),
      plantillaActualizadaEn: prog.plantillaActualizadaEn || "",
      requisitos: prog.requisitos || "",
      comunicado: prog.comunicado || "",
      detalleCosto: prog.detalleCosto || "",
      detalleAlmuerzo: prog.detalleAlmuerzo || "",
      concesionarios: prog.concesionarios || "",
      requiereUniforme: prog.requiereUniforme, id: prog.id,
    };
  }

  // ── Abrir modal editar ──
  function abrirEditar(prog) {
    setForm(datosProgramaAFormulario(prog));
    setModoEditar(true);
    setProgramaDocsId("");
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);
    setShowModal(true);
    setMensaje("");
  }

  // ── Validar y guardar ──
  async function guardar(e) {
    e.preventDefault();
    if (!form.nombre.trim()) return mostrarMsg("El nombre del programa es obligatorio.");
    if (!form.categoria) return mostrarMsg("Seleccione una categoría.");
    const gruposHorario = normalizarHorariosPorGrupo(form.horariosPorGrupo);
    const gradosFinales = obtenerGradosFinales(form.gradosAplicables, gruposHorario);
    if (gradosFinales.length === 0) return mostrarMsg("Seleccione al menos un grado aplicable.");
    if (gruposHorario.length === 0) {
      if (form.dias.length === 0) return mostrarMsg("Seleccione los días del programa.");
      if (!form.horaInicio || !form.horaFin) return mostrarMsg("Seleccione hora de inicio y fin del programa.");
      if (form.horaInicio >= form.horaFin) return mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
      if ((form.almuerzoInicio && !form.almuerzoFin) || (!form.almuerzoInicio && form.almuerzoFin)) {
        return mostrarMsg("Complete hora de inicio y fin del almuerzo.");
      }
      if (form.almuerzoInicio && form.almuerzoFin && form.almuerzoInicio >= form.almuerzoFin) {
        return mostrarMsg("La hora de inicio del almuerzo debe ser menor a la hora de fin.");
      }
    }
    const grupoInvalido = gruposHorario.find((grupo) =>
      grupo.grados.length === 0 || !grupo.dia || !grupo.horaInicio || !grupo.horaFin || grupo.horaInicio >= grupo.horaFin
    );
    if (grupoInvalido) return mostrarMsg("Revise los grupos por día: cada grupo debe tener grados, día y hora válida.");
    if (!form.fechaInicio || !form.fechaFin) return mostrarMsg("Las fechas de inicio y fin son obligatorias.");
    if (form.fechaInicio > form.fechaFin) return mostrarMsg("La fecha de inicio no puede ser mayor a la de fin.");
    if (!form.cupos || Number(form.cupos) <= 0) return mostrarMsg("Los cupos deben ser un número positivo.");
    if (!esCostoValido(form.costo)) return mostrarMsg("Ingrese un costo válido en soles, con máximo dos decimales.");
    if (!form.modalidadCobro) return mostrarMsg("Seleccione la modalidad de cobro.");
    if (form.plantilla && !form.plantillaValidada) return mostrarMsg("La plantilla Word debe estar validada antes de guardar.");

    setGuardando(true);
    const datosGuardar = {
      ...form,
      costo: Number(form.costo).toFixed(2),
      gradosAplicables: gradosFinales,
      horariosPorGrupo: gruposHorario,
      grupo: resumenGrados(gradosFinales),
      horario: gruposHorario.length
        ? resumenHorariosPorGrupo(gruposHorario)
        : resumenHorario(form.dias, form.horaInicio, form.horaFin, form.almuerzoInicio, form.almuerzoFin),
    };
    try {
      if (modoEditar) {
        await editarPrograma(form.id, datosGuardar);
        mostrarMsg("Programa actualizado correctamente.", "success");
      } else {
        await crearPrograma(datosGuardar);
        mostrarMsg("Programa creado correctamente.", "success");
      }
      await cargarDatos();
      setShowModal(false);
    } catch (err) {
      mostrarMsg(err.message);
    }
    setGuardando(false);
  }

  // ── Cambiar estado ──
  async function toggleEstado(prog) {
    const nuevo = prog.estado === "Habilitado" ? "Deshabilitado" : "Habilitado";
    await cambiarEstadoPrograma(prog.id, nuevo);
    mostrarMsg(`Programa ${nuevo.toLowerCase()}.`, "success");
    await cargarDatos();
  }

  async function finalizarPrograma(prog) {
    const confirmado = window.confirm(`Finalizar ${prog.nombre}? Secretaria ya no podrá registrar nuevas inscripciones.`);
    if (!confirmado) return;

    await cambiarEstadoPrograma(prog.id, "Finalizado");
    mostrarMsg("Programa finalizado correctamente.", "success");
    await cargarDatos();
  }

  // ── Ver invitados ──
  async function eliminarCurso(prog) {
    const confirmado = window.confirm(`Eliminar ${prog.nombre}? Tambien se retirara su lista de invitados cargada.`);
    if (!confirmado) return;

    try {
      await eliminarPrograma(prog.id);
      mostrarMsg("Programa eliminado correctamente.", "success");
      await cargarDatos();
    } catch (err) {
      mostrarMsg(err.message);
    }
  }

  async function verInvitados(prog) {
    setProgSeleccionado(prog);
    const lista = await listarInvitados(prog.id);
    setInvitados(lista);
    setShowInvitados(true);
  }

  function descargarPdfInvitados() {
    if (!progSeleccionado) return;
    if (!invitados.length) {
      mostrarMsg("No hay alumnos registrados para descargar.");
      return;
    }

    descargarListaAlumnosPdf(progSeleccionado, invitados);
    mostrarMsg("Lista de alumnos descargada en PDF.", "success");
  }

  function abrirDocumentosPrograma(prog) {
    setForm(datosProgramaAFormulario(prog));
    setModoEditar(true);
    setProgramaDocsId(prog.id);
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);
    setMensaje("");
  }

  async function guardarDocumentoComoPrograma() {
    if (!form.plantillaBase64) return mostrarMsg("Primero suba el documento Word.");
    if (!form.plantillaValidada) return mostrarMsg("El Word debe tener variables editables antes de guardarlo.");
    if (!form.nombre.trim()) return mostrarMsg("Ingrese el nombre del programa.");

    setGuardando(true);
    try {
      const creado = await crearProgramaDesdeDocumento({
        ...form,
        nombre: form.nombre.trim(),
      });
      await cargarDatos();
      setProgramaDocsId("");
      setForm(formInicial);
      setLecturaDocumento(null);
      setPlantillaInputKey((actual) => actual + 1);
      mostrarMsg(`Plantilla de ${creado.nombre} guardada en el historial.`, "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setGuardando(false);
  }

  async function guardarDocumentosPrograma() {
    if (!form.id) return mostrarMsg("Seleccione un programa para gestionar sus documentos.");
    if (form.plantilla && !form.plantillaValidada) return mostrarMsg("La plantilla Word debe estar validada antes de guardar.");

    setGuardando(true);
    try {
      await editarPrograma(form.id, form);
      await cargarDatos();
      mostrarMsg("Documentos del programa actualizados correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setGuardando(false);
  }

  // ── Agregar categoría ──
  async function agregarCategoria() {
    if (!nuevaCat.trim()) return;
    try {
      await crearCategoria(nuevaCat.trim());
      const cats = await listarCategorias();
      setCategorias(cats);
      setForm(f => ({ ...f, categoria: nuevaCat.trim() }));
      setNuevaCat("");
    } catch (err) {
      mostrarMsg(err.message);
    }
  }

  async function quitarCategoria() {
    if (!catAEliminar) return mostrarMsg("Seleccione una categoría para quitar.");
    const confirmado = window.confirm(`Quitar la categoría "${catAEliminar}"?`);
    if (!confirmado) return;

    try {
      await eliminarCategoria(catAEliminar);
      const cats = await listarCategorias();
      setCategorias(cats);
      setForm(f => ({ ...f, categoria: f.categoria === catAEliminar ? "" : f.categoria }));
      setCatAEliminar("");
      mostrarMsg("Categoría quitada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
  }

  function actualizarForm(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  function actualizarCosto(valor) {
    const limpio = valor.replace(",", ".").replace(/[^\d.]/g, "");
    const partes = limpio.split(".");
    const normalizado = partes.length > 1
      ? `${partes[0]}.${partes.slice(1).join("").slice(0, 2)}`
      : partes[0];

    setForm(f => ({ ...f, costo: normalizado }));
  }

  function formatearCostoFormulario() {
    if (form.costo === "") return;
    const numero = Number(form.costo);
    setForm(f => ({ ...f, costo: Number.isFinite(numero) ? numero.toFixed(2) : "" }));
  }

  async function seleccionarPlantilla(event) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    if (!/\.docx$/i.test(archivo.name)) {
      setPlantillaInputKey((actual) => actual + 1);
      return mostrarMsg("Solo se permiten plantillas Word en formato .docx.");
    }

    if (modoEditar && form.id && form.plantilla) {
      const actividad = await obtenerActividadPrograma(form.id);
      if (actividad.tieneActividad) {
        const confirmado = window.confirm(
          `Este programa ya tiene ${actividad.alumnos} alumno(s), ${actividad.inscripciones} inscripción(es) y ${actividad.documentos} documento(s). ¿Desea reemplazar la plantilla?`
        );
        if (!confirmado) {
          setPlantillaInputKey((actual) => actual + 1);
          return;
        }
      }
    }

    try {
      const lectura = await leerPlantillaWord(archivo);
      const { variablesDetectadas, textoPlano } = lectura;
      const plantillaBase64 = await leerArchivoBase64(archivo);
      const datosDetectados = extraerDatosProgramaDesdeWord(textoPlano, archivo.name, categorias);
      const datosAplicables = vista === "documentos" ? filtrarDatosDocumento(datosDetectados) : datosDetectados;
      const totalDetectados = contarDatosDetectados(datosAplicables);
      if (vista === "documentos") {
        setLecturaDocumento({
          archivo: archivo.name,
          texto: textoPlano,
          datos: datosAplicables,
          variables: variablesDetectadas,
        });
      }
      setForm((actual) => ({
        ...actual,
        ...datosAplicables,
        plantilla: archivo.name,
        plantillaBase64,
        plantillaVariables: variablesDetectadas,
        plantillaValidada: lectura.plantillaValida,
        plantillaActualizadaEn: fechaActualIso(),
      }));
      mostrarMsg(
        totalDetectados > 0
          ? `Plantilla validada. Se autocompletaron ${totalDetectados} dato(s) del programa.`
          : "Plantilla validada. No se encontraron datos del programa para autocompletar.",
        "success"
      );
    } catch (err) {
      setLecturaDocumento(null);
      setForm((actual) => ({
        ...actual,
        plantilla: archivo.name,
        plantillaBase64: "",
        plantillaVariables: [],
        plantillaValidada: false,
        plantillaActualizadaEn: "",
      }));
      mostrarMsg(err.message || "No se pudo validar la plantilla Word.");
    }
  }

  async function autocompletarDesdePlantilla() {
    if (!form.plantillaBase64) {
      return mostrarMsg(vista === "documentos" ? "Primero suba un documento Word." : "Primero suba y valide una plantilla Word.");
    }

    try {
      const lectura = await leerDocumentoWordDesdeBase64(form.plantillaBase64);
      const { textoPlano, variablesDetectadas } = lectura;
      const datosDetectados = extraerDatosProgramaDesdeWord(textoPlano, form.plantilla, categorias);
      const datosAplicables = vista === "documentos" ? filtrarDatosDocumento(datosDetectados) : datosDetectados;
      const totalDetectados = contarDatosDetectados(datosAplicables);
      if (vista === "documentos") {
        setLecturaDocumento({
          archivo: form.plantilla,
          texto: textoPlano,
          datos: datosAplicables,
          variables: variablesDetectadas,
        });
      }

      if (totalDetectados === 0) {
        return mostrarMsg(vista === "documentos"
          ? "Documento leído. No se detectaron secciones automáticas para guardar."
          : "No se encontraron datos del programa dentro del Word. Complete los campos manualmente.");
      }

      setForm((actual) => ({
        ...actual,
        ...datosAplicables,
      }));
      return mostrarMsg(`Se autocompletaron ${totalDetectados} dato(s) del programa.`, "success");
    } catch (err) {
      return mostrarMsg(err.message || "No se pudo leer la plantilla guardada.");
    }
  }

  async function quitarPlantilla() {
    if (vista === "documentos" && form.id && form.plantilla) {
      const confirmado = window.confirm(`¿Está seguro que desea eliminar esta plantilla?\n\n${form.plantilla}`);
      if (!confirmado) return;
    }

    const datosLimpios = {
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      plantillaActualizadaEn: "",
      requisitos: "",
      comunicado: "",
      detalleCosto: "",
      detalleAlmuerzo: "",
      concesionarios: "",
    };

    const siguienteForm = {
      ...form,
      ...datosLimpios,
    };

    setForm((actual) => ({
      ...actual,
      ...datosLimpios,
    }));
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);

    if (vista !== "documentos" || !form.id) return;

    setGuardando(true);
    try {
      await editarPrograma(form.id, siguienteForm);
      await cargarDatos();
      mostrarMsg("Documento eliminado del programa.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setGuardando(false);
  }

  async function eliminarPlantillaHistorial(programa) {
    const confirmado = window.confirm(`¿Está seguro que desea eliminar esta plantilla?\n\n${programa.plantilla}`);
    if (!confirmado) return;

    const datosLimpios = {
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      plantillaActualizadaEn: "",
      requisitos: "",
      comunicado: "",
      detalleCosto: "",
      detalleAlmuerzo: "",
      concesionarios: "",
    };

    setGuardando(true);
    try {
      await editarPrograma(programa.id, {
        ...datosProgramaAFormulario(programa),
        ...datosLimpios,
      });
      if (programaDocsId === programa.id) {
        setProgramaDocsId("");
        setForm(formInicial);
        setLecturaDocumento(null);
      }
      await cargarDatos();
      mostrarMsg("Plantilla eliminada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setGuardando(false);
  }

  async function usarPlantillaExistente(programaId) {
    const programa = programas.find((item) => item.id === programaId);
    if (!programa || !programa.plantillaBase64) {
      return mostrarMsg("Seleccione un programa con plantilla validada.");
    }

    if (modoEditar && form.id && form.plantilla) {
      const actividad = await obtenerActividadPrograma(form.id);
      if (actividad.alumnos || actividad.inscripciones || actividad.documentos) {
        const confirmado = window.confirm(
          `Este programa ya tiene ${actividad.alumnos} alumno(s), ${actividad.inscripciones} inscripción(es) y ${actividad.documentos} documento(s). ¿Desea reemplazar la plantilla?`
        );
        if (!confirmado) return;
      }
    }

    setForm((actual) => ({
      ...actual,
      plantilla: programa.plantilla || "",
      plantillaBase64: programa.plantillaBase64 || "",
      plantillaVariables: programa.plantillaVariables || [],
      plantillaValidada: Boolean(programa.plantillaValidada),
      plantillaActualizadaEn: fechaActualIso(),
    }));
    setPlantillaInputKey((actual) => actual + 1);
    mostrarMsg(`Se usará la plantilla de ${programa.nombre}.`, "success");
  }

  function cambiarPeriodoFormulario(valor) {
    setForm(f => ({ ...f, periodo: normalizarPeriodoVista(valor) }));
  }

  function toggleGrado(valor) {
    setForm(f => ({
      ...f,
      gradosAplicables: f.gradosAplicables.includes(valor)
        ? f.gradosAplicables.filter(item => item !== valor)
        : [...f.gradosAplicables, valor],
    }));
  }

  function toggleDia(valor) {
    setForm(f => ({
      ...f,
      dias: f.dias.includes(valor)
        ? f.dias.filter(item => item !== valor)
        : [...f.dias, valor],
    }));
  }

  function agregarGrupoHorario() {
    setForm((actual) => ({
      ...actual,
      horariosPorGrupo: [
        ...actual.horariosPorGrupo,
        { ...horarioGrupoInicial, id: `grupo-${Date.now()}` },
      ],
    }));
  }

  function quitarGrupoHorario(index) {
    setForm((actual) => ({
      ...actual,
      horariosPorGrupo: actual.horariosPorGrupo.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function actualizarGrupoHorario(index, campo, valor) {
    setForm((actual) => ({
      ...actual,
      horariosPorGrupo: actual.horariosPorGrupo.map((grupo, itemIndex) =>
        itemIndex === index ? { ...grupo, [campo]: valor } : grupo
      ),
    }));
  }

  function toggleGradoGrupo(index, valor) {
    setForm((actual) => ({
      ...actual,
      horariosPorGrupo: actual.horariosPorGrupo.map((grupo, itemIndex) => {
        if (itemIndex !== index) return grupo;
        const grados = grupo.grados || [];
        return {
          ...grupo,
          grados: grados.includes(valor)
            ? grados.filter((item) => item !== valor)
            : [...grados, valor],
        };
      }),
    }));
  }

  function resumenGrados(grados) {
    if (!grados.length) return "";
    return nivelesGrados
      .map(({ nivel }) => {
        const items = grados
          .filter(item => item.startsWith(`${nivel}:`))
          .map(item => etiquetaGradoCorta(item.split(":")[1]));
        return items.length ? `${nivel}: ${items.join(", ")}` : "";
      })
      .filter(Boolean)
      .join(" / ");
  }

  function resumenHorario(dias, inicio, fin, almuerzoInicio = "", almuerzoFin = "") {
    if (!dias.length || !inicio || !fin) return "";
    const clase = `${formatearHora12(inicio)} - ${formatearHora12(fin)}`;
    const almuerzo = almuerzoInicio && almuerzoFin
      ? ` · almuerzo ${formatearHora12(almuerzoInicio)} - ${formatearHora12(almuerzoFin)}`
      : "";
    return `${dias.join(", ")} clase ${clase}${almuerzo}`;
  }

  function normalizarHorariosPorGrupo(grupos) {
    return (grupos || []).map((grupo, index) => ({
      id: grupo.id || `grupo-${index + 1}`,
      grados: grupo.grados || [],
      dia: grupo.dia || "",
      almuerzoInicio: grupo.almuerzoInicio || "14:20",
      almuerzoFin: grupo.almuerzoFin || "15:10",
      horaInicio: grupo.horaInicio || "",
      horaFin: grupo.horaFin || "",
      aula: String(grupo.aula || "").trim(),
    })).filter((grupo) =>
      grupo.grados.length || grupo.dia || grupo.horaInicio || grupo.horaFin || grupo.aula
    );
  }

  function obtenerGradosFinales(gradosBase, gruposHorario) {
    return [...new Set([
      ...(gradosBase || []),
      ...gruposHorario.flatMap((grupo) => grupo.grados || []),
    ])];
  }

  function resumenHorariosPorGrupo(gruposHorario) {
    return gruposHorario
      .map((grupo) => {
        const grados = resumenGrados(grupo.grados);
        const aula = grupo.aula ? ` · Aula ${grupo.aula}` : "";
        return `${grados}: ${grupo.dia} almuerzo ${formatearHora12(grupo.almuerzoInicio)}-${formatearHora12(grupo.almuerzoFin)}, clase ${formatearHora12(grupo.horaInicio)}-${formatearHora12(grupo.horaFin)}${aula}`;
      })
      .join(" / ");
  }

  function normalizarPeriodoVista(valor) {
    return String(valor || "").toLowerCase().includes("verano") ? "verano" : "escolar";
  }

  async function generarPreviewExcel() {
    setMensaje("");
    setPreviewCarga(null);
    setProgresoCarga(null);

    if (!archivosExcel.length) return mostrarMsg("Seleccione al menos un archivo Excel.");
    if (archivosExcel.length > 6) return mostrarMsg("Puede subir hasta 6 archivos Excel por carga.");

    const invalido = archivosExcel.find((archivo) => !/\.(xlsx|xls)$/i.test(archivo.name));
    const pesado = archivosExcel.find((archivo) => archivo.size > 5 * 1024 * 1024);
    const totalBytes = archivosExcel.reduce((total, archivo) => total + Number(archivo.size || 0), 0);
    const extensionValida = !invalido;
    if (!extensionValida) return mostrarMsg("Solo se permiten archivos .xlsx o .xls.");
    if (pesado) return mostrarMsg("Cada archivo no debe superar 5 MB.");
    if (totalBytes > 25 * 1024 * 1024) return mostrarMsg("La carga masiva no debe superar 25 MB en total.");

    setCargandoPreview(true);
    setProgresoCarga({
      actual: 0,
      total: archivosExcel.length,
      porcentaje: 0,
      archivo: "",
      estado: "preparando",
    });
    try {
      const preview = await previsualizarCargaAlumnosMasiva({
        periodo: cargaPeriodo,
        archivos: archivosExcel,
        onProgress: setProgresoCarga,
      });
      setPreviewCarga(preview);
      setProgresoCarga({
        actual: archivosExcel.length,
        total: archivosExcel.length,
        porcentaje: 100,
        archivo: "",
        estado: "listo",
      });
      if (preview.resumen.validos === 0) {
        mostrarMsg("La vista previa no tiene alumnos listos para guardar. Revise la columna Detalle y confirme que curso_programa coincida con un programa habilitado de Año escolar.");
      } else {
        mostrarMsg(`Vista previa generada: ${preview.resumen.validos} alumno(s) listos para guardar.`, "success");
      }
    } catch (err) {
      mostrarMsg(err.message || "No se pudo leer el archivo Excel.");
      setProgresoCarga(null);
    }
    setCargandoPreview(false);
  }

  async function confirmarCargaExcel() {
    if (!previewCarga || previewCarga.resumen.validos === 0) {
      return mostrarMsg("No hay registros válidos para confirmar.");
    }

    setConfirmandoCarga(true);
    try {
      await confirmarCargaAlumnos(previewCarga);
      await cargarDatos();
      setPreviewCarga(null);
      setProgresoCarga(null);
      setArchivosExcel([]);
      setArchivoInputKey((actual) => actual + 1);
      mostrarMsg("Carga confirmada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setConfirmandoCarga(false);
  }

  function cancelarCargaExcel() {
    setArchivosExcel([]);
    setPreviewCarga(null);
    setProgresoCarga(null);
    setMensaje("");
    setArchivoInputKey((actual) => actual + 1);
  }

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className={`coord-layout ${esProfesor ? "coord-layout-profesor" : ""} ${sidebarAbierta ? "" : "coord-layout-collapsed"}`}>
      {/* ── SIDEBAR ── */}
      <aside className="coord-sidebar">
        <button
          className="coord-sidebar-toggle"
          type="button"
          onClick={() => setSidebarAbierta((abierta) => !abierta)}
          aria-label={sidebarAbierta ? "Cerrar menu lateral" : "Abrir menu lateral"}
          title={sidebarAbierta ? "Cerrar menú" : "Abrir menú"}
        >
          <ChevronRight size={18} />
        </button>
        <div className="coord-brand" aria-label="Colegio San Rafael">
          <img className="coord-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
        </div>
        <p className="coord-module-label">{esProfesor ? "Módulo Profesores" : "Módulo Coordinación"}</p>
        <nav className="coord-nav">
          {vistasNav.map(({ id, label, icon: Icon }) => (
            <button key={id}
              className={`coord-nav-item ${vista === id ? "coord-nav-item-active" : ""}`}
              onClick={() => { setVista(id); setMensaje(""); }}
              title={label}>
              <Icon size={18} /><span>{label}</span><ChevronRight className="coord-nav-arrow" size={16} />
            </button>
          ))}
        </nav>
        <button className="coord-logout" onClick={onLogout} title="Cerrar sesión">
          <LogOut size={18} /><span>Cerrar sesion</span>
        </button>
      </aside>

      {/* ── MAIN ── */}
      <main className="coord-main">
        {/* ─── VISTA: GESTIÓN DE PROGRAMAS ─── */}
        {vista === "programas" && (
          <>
            <header className="coord-topbar">
              <span className="coord-topbar-eyebrow">Gestion academica</span>
              <h1>Programas extracurriculares</h1>
            </header>
            <section className="coord-workspace coord-workspace-single">
              <article className="coord-card coord-search-card">
                <div className="coord-card-title">
                  <span className="coord-title-icon"><BookOpen size={21} /></span>
                  <div><h2>Programas registrados</h2>
                    <p>Consulte, cree o administre programas y talleres.</p></div>
                </div>

                <div className="coord-form">
                  <div className="coord-filtros-row">
                    <div className="coord-field">
                      <label><CalendarDays size={14} /> Periodo</label>
                      <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
                        <option value="todos">Todos</option>
                        <option value="escolar">Año escolar</option>
                        <option value="verano">Ciclo verano</option>
                      </select>
                    </div>

                    <button className="coord-register-button" type="button" onClick={abrirCrear}>
                      <Plus size={17} /><span>Nuevo programa</span>
                    </button>

                  </div>
                </div>

                {mensaje && (
                  <MantineAlert
                    className="coord-message"
                    color={tipoMsg === "success" ? "sanrafael" : "orange"}
                    radius="md"
                    icon={tipoMsg === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  >
                    {mensaje}
                  </MantineAlert>
                )}

                {cargando ? (
                  <div className="coord-loading"><Loader2 className="coord-spin" size={28} /> Cargando programas…</div>
                ) : programasFiltrados.length === 0 ? (
                  <div className="coord-empty"><AlertCircle size={18} /><p>No se encontraron programas.</p></div>
                ) : (
                  <div className="coord-table-responsive">
                    <Table striped highlightOnHover>
                      <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Programa / taller</Table.Th>
                            <Table.Th>Categoría</Table.Th>
                            <Table.Th>Grados</Table.Th>
                            <Table.Th>Días y horario</Table.Th>
                            <Table.Th>Vigencia</Table.Th>
                            <Table.Th>Cupos</Table.Th>
                            <Table.Th>Costo</Table.Th>
                            <Table.Th>Estado</Table.Th>
                            <Table.Th>Acciones</Table.Th>
                          </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {programasFiltrados.map(prog => (
                          <Table.Tr
                            key={prog.id}
                            className={`coord-program-row coord-program-row-${String(prog.estado || "").toLowerCase()}`}
                          >
                            <Table.Td data-label="Programa / taller">
                              <div className="coord-program-name">{prog.nombre}</div>
                              <span className="coord-program-subline">{prog.id || "Sin código"}</span>
                              <span className="coord-program-tutor">Tutor: {prog.responsable || "No asignado"}</span>
                            </Table.Td>
                            <Table.Td data-label="Categoría">{prog.categoria}</Table.Td>
                            <Table.Td data-label="Grados"><GradosTabla programa={prog} /></Table.Td>
                            <Table.Td data-label="Días y horario">
                              <HorarioTabla programa={prog} />
                            </Table.Td>
                            <Table.Td data-label="Vigencia"><VigenciaTabla inicio={prog.fechaInicio} fin={prog.fechaFin} /></Table.Td>
                            <Table.Td data-label="Cupos">
                              <CuposTabla programa={prog} />
                            </Table.Td>
                            <Table.Td data-label="Costo">{formatearSoles(prog.costo)}</Table.Td>
                            <Table.Td data-label="Estado">
                              <Badge
                                color={prog.estado === "Habilitado" ? "blue" : prog.estado === "Deshabilitado" ? "gray" : "yellow"}
                                variant="light"
                                size="sm"
                              >
                                {prog.estado}
                              </Badge>
                            </Table.Td>
                            <Table.Td data-label="Acciones">
                              <Group gap={4}>
                                <Tooltip label="Editar">
                                  <ActionIcon size="xs" color="blue" variant="light" onClick={() => abrirEditar(prog)}>
                                    <Edit3 size={14} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Ver alumnos">
                                  <ActionIcon size="xs" color="blue" variant="light" onClick={() => verInvitados(prog)}>
                                    <Eye size={14} />
                                  </ActionIcon>
                                </Tooltip>
                                {prog.estado !== "Finalizado" && (
                                  <Tooltip label={prog.estado === "Habilitado" ? "Deshabilitar" : "Habilitar"}>
                                    <ActionIcon size="xs" color="blue" variant="light" onClick={() => toggleEstado(prog)}>
                                      {prog.estado === "Habilitado" ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                    </ActionIcon>
                                  </Tooltip>
                                )}
                                {prog.estado !== "Finalizado" && (
                                  <Tooltip label="Finalizar">
                                    <ActionIcon size="xs" color="blue" variant="light" onClick={() => finalizarPrograma(prog)}>
                                      <CheckCircle2 size={14} />
                                    </ActionIcon>
                                  </Tooltip>
                                )}
                                <Tooltip label="Eliminar">
                                  <ActionIcon size="xs" color="red" variant="light" onClick={() => eliminarCurso(prog)}>
                                    <Trash2 size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </div>
                )}
              </article>


            </section>
          </>
        )}

        {vista === "carga" && (
          <>
            <header className="coord-topbar"><h1>CARGA MASIVA DE ALUMNOS DESDE EXCEL</h1></header>
            <section className="coord-workspace coord-workspace-single coord-workspace-upload">
              <article className="coord-card coord-search-card">
                <div className="coord-card-title">
                  <span className="coord-title-icon"><Upload size={21} /></span>
                  <div>
                    <h2>Importar alumnos invitados - Año escolar</h2>
                    <p>Suba el Excel con los alumnos invitados del periodo escolar. El sistema reconocerá automáticamente el programa mediante la columna curso_programa.</p>
                  </div>
                </div>

                <div className="coord-form">
                  <div className="coord-upload-grid">
                    <div className="coord-field">
                      <label>Periodo</label>
                      <div className="coord-readonly-field">Año escolar</div>
                    </div>
                    <div className="coord-field coord-field-full">
                      <label>Archivos Excel (.xlsx o .xls) - maximo 6</label>
                      <input
                        key={archivoInputKey}
                        type="file"
                        accept=".xlsx,.xls"
                        multiple
                        onChange={e => {
                          setArchivosExcel(Array.from(e.target.files || []));
                          setPreviewCarga(null);
                          setProgresoCarga(null);
                          setMensaje("");
                        }}
                      />
                      {archivosExcel.length ? (
                        <small>{archivosExcel.length} archivo(s) seleccionado(s)</small>
                      ) : null}
                    </div>
                  </div>
                  <div className="coord-upload-actions">
                    <button className="coord-primary-button" type="button" onClick={generarPreviewExcel} disabled={!archivosExcel.length || cargandoPreview}>
                      {cargandoPreview ? <Loader2 className="coord-spin" size={17} /> : <Eye size={17} />}
                      <span>{cargandoPreview ? "Validando" : "Vista previa"}</span>
                    </button>
                    {(archivosExcel.length > 0 || previewCarga) ? (
                      <button
                        className={previewCarga ? "coord-danger-button" : "coord-secondary-button"}
                        type="button"
                        onClick={cancelarCargaExcel}
                        disabled={cargandoPreview || confirmandoCarga}
                      >
                        <X size={17} />
                        <span>Cancelar carga</span>
                      </button>
                    ) : null}
                    <button className="coord-register-button" type="button" onClick={confirmarCargaExcel} disabled={!previewCarga || confirmandoCarga}>
                      {confirmandoCarga ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                      <span>{confirmandoCarga ? "Guardando" : "Guardar carga"}</span>
                    </button>
                  </div>
                </div>

                {mensaje && (
                  <MantineAlert
                    className="coord-message"
                    color={tipoMsg === "success" ? "sanrafael" : "orange"}
                    radius="md"
                    icon={tipoMsg === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  >
                    {mensaje}
                  </MantineAlert>
                )}

                {progresoCarga ? (
                  <div className="coord-upload-progress" aria-live="polite">
                    <div className="coord-upload-progress-header">
                      <strong>
                        {progresoCarga.estado === "listo"
                          ? "Vista previa lista"
                          : progresoCarga.actual > 0
                            ? `Validando archivo ${progresoCarga.actual} de ${progresoCarga.total}`
                            : "Preparando validacion"}
                      </strong>
                      <span>{progresoCarga.porcentaje}%</span>
                    </div>
                    <div className="coord-upload-progress-bar">
                      <span style={{ width: `${progresoCarga.porcentaje}%` }} />
                    </div>
                    {progresoCarga.archivo ? (
                      <p>{progresoCarga.archivo}</p>
                    ) : null}
                  </div>
                ) : null}

                {previewCarga ? (
                  <>
                    <div className="coord-load-summary">
                      <SummaryBox label="Leidos" value={previewCarga.resumen.total} />
                      <SummaryBox label="Válidos" value={previewCarga.resumen.validos} tone="success" />
                      <SummaryBox label="Errores" value={previewCarga.resumen.errores} tone="error" />
                      <SummaryBox label="Duplicados" value={previewCarga.resumen.duplicados} tone="warning" />
                    </div>
                    <div className="coord-table-wrap">
                      <table className="coord-table">
                        <thead>
                          <tr>
                            <th>Alumno</th><th>Grado</th><th>Sección</th><th>Curso solicitado</th><th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewCarga.registros.map(reg => (
                            <tr key={reg.fila}>
                              <td>{`${reg.nombres} ${reg.apellidos}`.trim() || "-"}</td>
                              <td>{reg.grado || "-"}</td>
                              <td>{reg.seccion || "-"}</td>
                              <td>{reg.curso || "-"}</td>
                              <td><span className={`coord-pill ${reg.estado === "Valido" ? "coord-pill-success" : reg.estado === "Duplicado" ? "coord-pill-warning" : "coord-pill-error"}`}>{textoEstadoCarga(reg.estado)}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="coord-empty">
                    <Upload size={18} />
                    <p>Suba un Excel con DNI, nombres, apellidos, grado, sección y curso_programa para generar la vista previa.</p>
                  </div>
                )}

              </article>

            </section>
          </>
        )}

        {vista === "documentos" && (
          <>
            <header className="coord-topbar"><h1>PLANTILLAS Y DOCUMENTOS</h1></header>
            <section className="coord-workspace coord-workspace-single">
              <article className="coord-card coord-search-card">
                <div className="coord-card-title">
                  <span className="coord-title-icon"><FileText size={21} /></span>
                  <div>
                    <h2>Plantillas Word por programa</h2>
                    <p>Suba primero el Word, valide sus variables y guarde el nombre para usarlo luego en Gestión de Programas.</p>
                  </div>
                </div>

                {mensaje && (
                  <MantineAlert
                    className="coord-message"
                    color={tipoMsg === "success" ? "sanrafael" : "orange"}
                    radius="md"
                    icon={tipoMsg === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  >
                    {mensaje}
                  </MantineAlert>
                )}

                <div className="coord-template-workspace">
                  <div className="coord-template-upload-row">
                    <TemplateUploadField
                      plantillaInputKey={plantillaInputKey}
                      form={form}
                      programas={programas}
                      variablesPlantillaRequeridas={variablesPlantillaRequeridas}
                      onSelect={seleccionarPlantilla}
                      onRemove={quitarPlantilla}
                      onAutoFill={autocompletarDesdePlantilla}
                      onUseExisting={usarPlantillaExistente}
                      modoDocumentos
                    />
                    <div className="coord-upload-actions">
                      <button
                        className="coord-register-button"
                        type="button"
                        onClick={programaDocs ? guardarDocumentosPrograma : guardarDocumentoComoPrograma}
                        disabled={guardando || !form.plantillaValidada}
                      >
                        {guardando ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                        <span>{guardando ? "Guardando" : programaDocs ? "Actualizar documento" : "Guardar plantilla"}</span>
                      </button>
                      {programaDocs ? (
                        <button className="coord-secondary-button" type="button" onClick={() => abrirEditar(programaDocs)}>
                          <Edit3 size={17} />
                          <span>Editar datos del programa</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                    {form.plantillaValidada ? (
                      <div className="coord-section-grid">
                        <div className="coord-field coord-field-full">
                          <label>Nombre del programa</label>
                          <input
                            value={form.nombre}
                            onChange={(event) => setForm((actual) => ({ ...actual, nombre: event.target.value }))}
                            placeholder="Ejemplo: Taller de danza primaria"
                          />
                        </div>
                      </div>
                    ) : null}
                    {lecturaDocumento ? (
                      <div className="coord-document-read">
                        <div className="coord-document-read-head">
                          <div>
                            <strong>Documento validado</strong>
                            <span>{lecturaDocumento.archivo}</span>
                          </div>
                          <span>Word apto para completar datos</span>
                        </div>
                        <div className="coord-document-detected">
                          <SummaryBox label="Datos interpretados" value={Object.keys(lecturaDocumento.datos || {}).length} />
                          <SummaryBox label="Variables listas" value={`${(lecturaDocumento.variables || []).length}/${variablesPlantillaRequeridas.length}`} tone={(lecturaDocumento.variables || []).length ? "success" : "warning"} />
                        </div>
                        {Object.keys(lecturaDocumento.datos || {}).length ? (
                          <dl className="coord-document-fields coord-document-preview-fields">
                            {Object.entries(lecturaDocumento.datos).map(([campo, valor]) => (
                              <div key={campo}>
                                <dt>{etiquetaCampoDocumento(campo)}</dt>
                                <dd>{resumirTextoDocumento(valor)}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="coord-process-note">El Word conserva su diseño original; aquí solo se muestran los datos que el sistema pudo interpretar.</p>
                        )}
                      </div>
                    ) : null}
                    <div className="coord-template-history">
                      <div className="coord-document-read-head">
                        <div>
                          <strong>Historial de plantillas subidas</strong>
                          <span>Plantillas disponibles para Gestión de Programas</span>
                        </div>
                      </div>
                      {historialPlantillas.length ? (
                        <div className="coord-template-history-list">
                          {historialPlantillas.map((programa) => (
                            <div className="coord-template-history-item" key={programa.id}>
                              <div className="coord-template-history-main">
                                <FileText size={17} />
                                <div>
                                  <strong>{programa.nombre}</strong>
                                  <span>{programa.plantilla}</span>
                                </div>
                              </div>
                              <span className={`coord-pill ${programa.plantillaValidada ? "coord-pill-success" : "coord-pill-error"}`}>
                                {programa.plantillaValidada ? "Validada" : "Pendiente"}
                              </span>
                              <button
                                className="coord-danger-button coord-template-history-delete"
                                type="button"
                                onClick={() => eliminarPlantillaHistorial(programa)}
                                disabled={guardando}
                              >
                                <Trash2 size={16} />
                                <span>Eliminar plantilla</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="coord-empty coord-template-history-empty">
                          <FileText size={18} />
                          <p>Aún no hay plantillas guardadas.</p>
                        </div>
                      )}
                    </div>
                  </div>
              </article>
            </section>
          </>
        )}

        {/* ─── MODAL: CREAR / EDITAR PROGRAMA ─── */}
        {showModal && (
          <div className="coord-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="coord-modal" onClick={e => e.stopPropagation()}>
              <div className="coord-modal-header">
                <div className="coord-modal-title">
                  <span className="coord-modal-icon"><Plus size={20} /></span>
                  <div>
                    <h2>{modoEditar ? "Editar programa" : "Registrar programa"}</h2>
                    <p>Complete la configuracion del taller antes de habilitarlo.</p>
                  </div>
                </div>
                <button className="coord-modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form className="coord-program-form" id="form-programa" onSubmit={guardar}>
                <div className="coord-program-form-main">
                  <section className="coord-form-section">
                    <div className="coord-section-heading">
                      <BookOpen size={18} />
                      <div>
                        <h3>Datos generales</h3>
                        <p>Nombre, periodo, categoría y grupo del programa.</p>
                      </div>
                    </div>
                    <div className="coord-section-grid coord-general-grid">
                      <div className="coord-field coord-program-name-field"><label>Nombre del programa *</label>
                        <input value={form.nombre} onChange={e => actualizarForm("nombre", e.target.value)} placeholder="Ej: Reforzamiento y nivelacion" />
                      </div>
                      <div className="coord-field"><label>Periodo *</label>
                        <select value={normalizarPeriodoVista(form.periodo)} onChange={e => cambiarPeriodoFormulario(e.target.value)}>
                          <option value="escolar">Año escolar</option><option value="verano">Ciclo verano</option>
                        </select>
                      </div>
                      <div className="coord-field coord-category-main"><label>Categoría *</label>
                        <select value={form.categoria} onChange={e => actualizarForm("categoria", e.target.value)}>
                          <option value="">Seleccione</option>
                          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="coord-field coord-new-category-field">
                        <label>Nueva categoría</label>
                        <div className="coord-inline-field">
                          <input placeholder="Ej: Arte, verano, alto rendimiento" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} />
                          <button type="button" className="coord-mini-btn" onClick={agregarCategoria}><Plus size={14} /></button>
                        </div>
                      </div>
                      <div className="coord-field coord-remove-category-field">
                        <label>Quitar categoría</label>
                        <div className="coord-inline-field">
                          <select value={catAEliminar} onChange={e => setCatAEliminar(e.target.value)}>
                            <option value="">Seleccione</option>
                            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button type="button" className="coord-mini-btn coord-mini-danger-btn" onClick={quitarCategoria}><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <div className="coord-field coord-field-full">
                        <label>Grados aplicables *</label>
                        <GradeSelector
                          niveles={nivelesGrados}
                          seleccionados={form.gradosAplicables}
                          onToggle={toggleGrado}
                        />
                        <p className="coord-field-hint">
                          {form.gradosAplicables.length
                            ? resumenGrados(form.gradosAplicables)
                            : "Seleccione nivel y grados del programa."}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="coord-form-section">
                    <div className="coord-section-heading">
                      <CalendarDays size={18} />
                      <div>
                        <h3>Horario y grupos de atención</h3>
                        <p>Use un horario general o agregue grupos para habilitar otro día con la misma hoja de invitación.</p>
                      </div>
                    </div>
                    <div className="coord-section-grid">
                      <div className="coord-field coord-field-full">
                        <label>Dias del programa / taller *</label>
                        <div className="coord-day-list">
                          {diasSemana.map(dia => (
                            <label
                              className={`coord-day-chip ${form.dias.includes(dia) ? "is-selected" : ""}`}
                              key={dia}
                            >
                              <input
                                type="checkbox"
                                checked={form.dias.includes(dia)}
                                onChange={() => toggleDia(dia)}
                              />
                              {dia}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="coord-compact-schedule-row coord-field-full">
                        <div className="coord-field"><label>Hora inicio *</label>
                          <input type="time" value={form.horaInicio} onChange={e => actualizarForm("horaInicio", e.target.value)} />
                        </div>
                        <div className="coord-field"><label>Hora fin *</label>
                          <input type="time" value={form.horaFin} onChange={e => actualizarForm("horaFin", e.target.value)} />
                        </div>
                        <div className="coord-field"><label>Almuerzo inicio</label>
                          <input type="time" value={form.almuerzoInicio} onChange={e => actualizarForm("almuerzoInicio", e.target.value)} />
                        </div>
                        <div className="coord-field"><label>Almuerzo fin</label>
                          <input type="time" value={form.almuerzoFin} onChange={e => actualizarForm("almuerzoFin", e.target.value)} />
                        </div>
                        <div className="coord-field"><label>Fecha inicio *</label>
                          <input type="date" value={form.fechaInicio} onChange={e => actualizarForm("fechaInicio", e.target.value)} />
                        </div>
                        <div className="coord-field"><label>Fecha fin *</label>
                          <input type="date" value={form.fechaFin} onChange={e => actualizarForm("fechaFin", e.target.value)} />
                        </div>
                      </div>
                      <div className="coord-field coord-field-full">
                        <p className="coord-field-hint">
                          Horario general: {resumenHorario(form.dias, form.horaInicio, form.horaFin, form.almuerzoInicio, form.almuerzoFin) || "Opcional si registra grupos por día."}
                        </p>
                      </div>
                      <div className="coord-field coord-field-full">
                        <div className="coord-group-schedule-head">
                          <div>
                            <strong>Turnos del mismo curso</strong>
                            <p>Separe los grados por día sin crear otro curso. Ejemplo: 4to, 5to y 1ro secundaria el jueves; 6to grado el viernes.</p>
                          </div>
                          <button type="button" className="coord-template-autofill" onClick={agregarGrupoHorario}>
                            <Plus size={14} />
                            Añadir día para otros grados
                          </button>
                        </div>
                        {form.horariosPorGrupo.length ? (
                          <div className="coord-group-schedule-list">
                            {form.horariosPorGrupo.map((grupo, index) => (
                              <div className="coord-group-schedule" key={grupo.id || index}>
                                <div className="coord-group-schedule-title">
                                  <strong>Grupo {index + 1}</strong>
                                  <button type="button" onClick={() => quitarGrupoHorario(index)} aria-label="Quitar grupo">
                                    <X size={14} />
                                  </button>
                                </div>
                                <GradeSelector
                                  niveles={nivelesGrados}
                                  seleccionados={grupo.grados || []}
                                  onToggle={(valor) => toggleGradoGrupo(index, valor)}
                                />
                                <div className="coord-group-schedule-grid">
                                  <div className="coord-field">
                                    <label>Día</label>
                                    <select value={grupo.dia || ""} onChange={(event) => actualizarGrupoHorario(index, "dia", event.target.value)}>
                                      {diasSemana.map((dia) => <option key={dia} value={dia}>{dia}</option>)}
                                    </select>
                                  </div>
                                  <div className="coord-field">
                                    <label>Aula</label>
                                    <input value={grupo.aula || ""} onChange={(event) => actualizarGrupoHorario(index, "aula", event.target.value)} placeholder="Ej: A-204" />
                                  </div>
                                  <div className="coord-field">
                                    <label>Almuerzo inicio</label>
                                    <input type="time" value={grupo.almuerzoInicio || "14:20"} onChange={(event) => actualizarGrupoHorario(index, "almuerzoInicio", event.target.value)} />
                                  </div>
                                  <div className="coord-field">
                                    <label>Almuerzo fin</label>
                                    <input type="time" value={grupo.almuerzoFin || "15:10"} onChange={(event) => actualizarGrupoHorario(index, "almuerzoFin", event.target.value)} />
                                  </div>
                                  <div className="coord-field">
                                    <label>Clase inicio</label>
                                    <input type="time" value={grupo.horaInicio || "15:20"} onChange={(event) => actualizarGrupoHorario(index, "horaInicio", event.target.value)} />
                                  </div>
                                  <div className="coord-field">
                                    <label>Clase fin</label>
                                    <input type="time" value={grupo.horaFin || "17:20"} onChange={(event) => actualizarGrupoHorario(index, "horaFin", event.target.value)} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="coord-field-hint">Si todos los grados van el mismo día, puede usar solo el horario general.</p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="coord-form-section">
                    <div className="coord-section-heading">
                      <DollarSign size={18} />
                      <div>
                        <h3>Cupos y cobro</h3>
                        <p>Control de disponibilidad y costo referencial.</p>
                      </div>
                    </div>
                    <div className="coord-section-grid coord-payment-grid">
                      <div className="coord-field"><label>Cupos</label>
                        <input type="number" min="1" value={form.cupos} onChange={e => actualizarForm("cupos", e.target.value)} placeholder="20" />
                      </div>
                      <div className="coord-field"><label>Costo (S/)</label>
                        <input inputMode="decimal" value={form.costo} onChange={e => actualizarCosto(e.target.value)} onBlur={formatearCostoFormulario} placeholder="70.00" />
                      </div>
                      <div className="coord-field"><label>Modalidad de cobro</label>
                        <select value={form.modalidadCobro} onChange={e => actualizarForm("modalidadCobro", e.target.value)}>
                          <option value="Mensual">Cuota mensual</option><option value="Unico">Pago unico</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section className="coord-form-section">
                    <div className="coord-section-heading">
                      <Users size={18} />
                      <div>
                        <h3>Responsables</h3>
                        <p>Personal a cargo y condiciones del taller.</p>
                      </div>
                    </div>
                    <div className="coord-section-grid">
                      <div className="coord-field"><label>Responsable</label>
                        <input value={form.responsable} onChange={e => actualizarForm("responsable", e.target.value)} placeholder="Prof. Ana Torres" />
                      </div>
                      <div className="coord-field"><label>Tutora / apoyo</label>
                        <input value={form.tutora} onChange={e => actualizarForm("tutora", e.target.value)} placeholder="Srta. Lucia Vega" />
                      </div>
                      <div className="coord-field coord-field-full">
                        <label className="coord-check-label">
                          <input type="checkbox" checked={form.requiereUniforme} onChange={e => actualizarForm("requiereUniforme", e.target.checked)} />
                          Requiere uniforme para el taller
                        </label>
                      </div>
                    </div>
                  </section>
                </div>

              </form>

              <div className="coord-modal-actions">
                <button type="button" className="coord-secondary-button" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" form="form-programa" className="coord-register-button" disabled={guardando}>
                  {guardando ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                  <span>{guardando ? "Guardando" : modoEditar ? "Actualizar" : "Crear programa"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL: INVITADOS ─── */}
        {showInvitados && (
          <div className="coord-modal-overlay" onClick={() => setShowInvitados(false)}>
            <div className="coord-modal" onClick={e => e.stopPropagation()}>
              <div className="coord-modal-header">
                <h2>Invitados – {progSeleccionado?.nombre}</h2>
                <button className="coord-modal-close" onClick={() => setShowInvitados(false)}><X size={20} /></button>
              </div>
              <div className="coord-modal-body">
                <div className="coord-invitados-actions">
                  <button
                    className="coord-primary-button"
                    type="button"
                    onClick={descargarPdfInvitados}
                    disabled={!invitados.length}
                  >
                    <FileDown size={15} />
                    <span>Descargar PDF</span>
                  </button>
                </div>
                {invitados.length === 0 ? (
                  <p className="coord-process-note">No hay invitados registrados para este programa.</p>
                ) : (
                  <div className="coord-table-wrap">
                    <table className="coord-table">
                      <thead><tr><th>DNI</th><th>Código</th><th>Estudiante</th><th>Grado</th><th>Sección</th></tr></thead>
                      <tbody>
                        {invitados.map((inv, index) => (
                          <tr key={`${inv.dni || inv.codigoEstudiante || inv.nombres}-${index}`}>
                            <td>{inv.dni || "Sin DNI"}</td>
                            <td>{inv.codigoEstudiante || "—"}</td>
                            <td>{inv.nombres}</td>
                            <td>{inv.grado}</td>
                            <td>{inv.seccion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

async function leerPlantillaWord(archivo) {
  const zip = await JSZip.loadAsync(archivo);
  return analizarZipPlantilla(zip);
}

async function leerDocumentoWord(archivo) {
  const zip = await JSZip.loadAsync(archivo);
  return analizarZipPlantilla(zip, { validarVariables: false });
}

async function leerPlantillaWordDesdeBase64(base64) {
  const zip = await JSZip.loadAsync(base64ToArrayBuffer(base64));
  return analizarZipPlantilla(zip);
}

async function leerDocumentoWordDesdeBase64(base64) {
  const zip = await JSZip.loadAsync(base64ToArrayBuffer(base64));
  return analizarZipPlantilla(zip, { validarVariables: false });
}

async function analizarZipPlantilla(zip, opciones = {}) {
  const validarVariables = opciones.validarVariables !== false;
  const archivosXml = Object.values(zip.files).filter((file) =>
    /^word\/(document|header|footer)\d*\.xml$/i.test(file.name)
  );

  if (!archivosXml.length) {
    throw new Error("La plantilla no parece ser un documento Word válido.");
  }

  const contenidos = await Promise.all(archivosXml.map((file) => file.async("text")));
  const contenido = contenidos.join(" ");
  const texto = normalizarVariable(contenido.replace(/<[^>]+>/g, " "));
  const presentes = variablesPlantillaRequeridas
    .filter((variable) => variable.aliases.some((alias) => texto.includes(normalizarVariable(alias))))
    .map((variable) => variable.id);
  const faltantes = variablesPlantillaRequeridas.filter((variable) => !presentes.includes(variable.id));

  if (validarVariables && faltantes.length) {
    throw new Error(`La plantilla no contiene variables requeridas: ${faltantes.map((item) => item.label).join(", ")}.`);
  }

  return {
    variablesDetectadas: presentes,
    variablesFaltantes: faltantes.map((item) => item.id),
    plantillaValida: faltantes.length === 0,
    textoPlano: contenidos.map(extraerTextoPlanoXml).join("\n"),
  };
}

function extraerDatosProgramaDesdeWord(textoPlano, nombreArchivo, categorias = []) {
  const texto = normalizarSaltos(textoPlano);
  const nombreDetectado = extraerValorEtiqueta(texto, [
    "nombre del programa",
    "programa",
    "curso",
    "taller",
    "actividad",
  ]) || nombreDesdeArchivo(nombreArchivo);
  const categoriaDetectada = extraerCategoria(texto, categorias);
  const horarioDetectado = extraerValorEtiqueta(texto, ["horario", "dias y horario", "día y hora", "dia y hora"]);
  const horas = extraerHoras(horarioDetectado || texto);
  const fechas = extraerFechas(texto);
  const grados = extraerGrados(texto);
  const costo = extraerCosto(texto);
  const cupos = extraerNumeroEtiqueta(texto, ["cupos", "vacantes"]);
  const requisitos = extraerValorEtiqueta(texto, ["requisitos", "materiales", "consideraciones"]);
  const comunicado = extraerComunicadoPrincipal(texto);
  const detalleCosto = extraerBloqueSeccion(texto, ["costo"], ["el almuerzo", "almuerzo", "requisitos", "entregar este formato", "acepto"]);
  const detalleAlmuerzo = extraerBloqueSeccion(texto, ["el almuerzo", "almuerzo"], ["entregar este formato", "acepto", "datos del alumno"]);
  const concesionarios = extraerConcesionarios(texto);
  const modalidadCobro = extraerModalidad(texto);
  const datos = {};

  if (nombreDetectado) datos.nombre = capitalizarTexto(nombreDetectado);
  if (categoriaDetectada) datos.categoria = categoriaDetectada;
  if (grados.length) datos.gradosAplicables = grados;
  if (horarioDetectado) datos.dias = extraerDias(horarioDetectado);
  if (!datos.dias?.length) datos.dias = extraerDias(texto);
  if (horas.horaInicio) datos.horaInicio = horas.horaInicio;
  if (horas.horaFin) datos.horaFin = horas.horaFin;
  if (fechas.fechaInicio) datos.fechaInicio = fechas.fechaInicio;
  if (fechas.fechaFin) datos.fechaFin = fechas.fechaFin;
  if (cupos) datos.cupos = cupos;
  if (costo) datos.costo = costo;
  if (modalidadCobro) datos.modalidadCobro = modalidadCobro;
  if (requisitos) datos.requisitos = requisitos;
  if (comunicado) datos.comunicado = comunicado;
  if (detalleCosto) datos.detalleCosto = detalleCosto;
  if (detalleAlmuerzo) datos.detalleAlmuerzo = detalleAlmuerzo;
  if (concesionarios) datos.concesionarios = concesionarios;

  const responsable = extraerValorEtiqueta(texto, ["responsable", "docente", "profesor", "profesora"]);
  if (responsable) datos.responsable = responsable;

  const tutora = extraerValorEtiqueta(texto, ["tutora", "apoyo", "auxiliar"]);
  if (tutora) datos.tutora = tutora;

  const uniforme = extraerUniforme(texto);
  if (uniforme !== null) datos.requiereUniforme = uniforme;

  if (datos.dias?.length && datos.horaInicio && datos.horaFin) {
    datos.horario = `${datos.dias.join(", ")} ${datos.horaInicio} - ${datos.horaFin}`;
  }
  if (datos.gradosAplicables?.length) {
    datos.grupo = resumenGradosDesdeValores(datos.gradosAplicables);
  }

  return limpiarDatosVacios(datos);
}

function extraerTextoPlanoXml(xml) {
  return decodificarXml(xml)
    .replace(/<\/w:p>/gi, "\n")
    .replace(/<w:tab[^>]*\/>/gi, " ")
    .replace(/<w:br[^>]*\/>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function decodificarXml(valor) {
  return String(valor || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizarSaltos(texto) {
  return String(texto || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function extraerValorEtiqueta(texto, etiquetas) {
  const lineas = normalizarSaltos(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  for (const linea of lineas) {
    for (const etiqueta of etiquetas) {
      const patron = new RegExp(`^\\s*${escaparRegExp(etiqueta)}\\s*[:\\-–]\\s*(.+)$`, "i");
      const match = linea.match(patron);
      if (match?.[1]) return limpiarValorDetectado(match[1]);
    }
  }
  return "";
}

function extraerComunicadoPrincipal(texto) {
  const normal = normalizarSaltos(texto);
  const lineas = normal.split("\n").map((linea) => linea.trim()).filter(Boolean);
  const indiceInicio = lineas.findIndex((linea) =>
    /^reciba\b/i.test(linea) ||
    /^nos dirigimos\b/i.test(linea) ||
    normalizarComparacion(linea).startsWith("reciba un cordial saludo")
  );
  if (indiceInicio === -1) return "";

  const indiceFinRelativo = lineas.slice(indiceInicio + 1).findIndex((linea) => {
    const comparacion = normalizarComparacion(linea);
    return /^(club|ciclo|duracion|a continuacion|requisitos|costo|el almuerzo|entregar este formato)\b/.test(comparacion);
  });
  const indiceFin = indiceFinRelativo === -1 ? Math.min(lineas.length, indiceInicio + 8) : indiceInicio + 1 + indiceFinRelativo;
  return limpiarBloqueDetectado(lineas.slice(indiceInicio, indiceFin).join(" "));
}

function extraerBloqueSeccion(texto, etiquetasInicio, etiquetasFin = []) {
  const lineas = normalizarSaltos(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  const inicio = lineas.findIndex((linea) => {
    const comparacion = normalizarComparacion(linea).replace(/[:.]+$/g, "");
    return etiquetasInicio.some((etiqueta) => comparacion.startsWith(normalizarComparacion(etiqueta)));
  });
  if (inicio === -1) return "";

  const finRelativo = lineas.slice(inicio + 1).findIndex((linea) => {
    const comparacion = normalizarComparacion(linea).replace(/[:.]+$/g, "");
    return etiquetasFin.some((etiqueta) => comparacion.startsWith(normalizarComparacion(etiqueta)));
  });
  const fin = finRelativo === -1 ? Math.min(lineas.length, inicio + 8) : inicio + 1 + finRelativo;
  return limpiarBloqueDetectado(lineas.slice(inicio, fin).join("\n"));
}

function extraerConcesionarios(texto) {
  const bloque = extraerBloqueSeccion(
    texto,
    ["si deseara coordinar el servicio de delivery"],
    ["que son concesionarias", "entregar este formato", "acepto"]
  );
  if (bloque) return bloque;
  const coincidencias = [...String(texto || "").matchAll(/Cafet[ií]n\s+[^0-9\n]+(?:\n|\s)+(\d{9})/gi)]
    .map((match) => limpiarBloqueDetectado(match[0]));
  return coincidencias.join("\n");
}

function limpiarBloqueDetectado(valor) {
  return String(valor || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function limpiarValorDetectado(valor) {
  return String(valor || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;]$/, "");
}

function nombreDesdeArchivo(nombreArchivo) {
  return String(nombreArchivo || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b(carta|plantilla|comunicado|ficha|original|mismo|final|word|docx)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerCategoria(texto, categorias) {
  const detectada = extraerValorEtiqueta(texto, ["categoria", "categoría", "tipo"]);
  const normalizada = normalizarComparacion(detectada);
  const match = categorias.find((categoria) => normalizarComparacion(categoria) === normalizada);
  if (match) return match;
  if (detectada && categorias.includes("Otro")) return "Otro";
  return "";
}

function extraerDias(texto) {
  return diasSemana.filter((dia) => normalizarComparacion(texto).includes(normalizarComparacion(dia)));
}

function extraerHoras(texto) {
  const matches = [...String(texto || "").matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/gi)]
    .map((match) => formatearHoraDetectada(match[1], match[2], match[3]))
    .filter(Boolean);

  return {
    horaInicio: matches[0] || "",
    horaFin: matches[1] || "",
  };
}

function formatearHoraDetectada(horaTexto, minutoTexto = "00", periodo = "") {
  let hora = Number(horaTexto);
  const minuto = Number(minutoTexto || "00");
  if (!Number.isFinite(hora) || !Number.isFinite(minuto) || hora > 23 || minuto > 59) return "";

  const normalPeriodo = normalizarComparacion(periodo);
  if (normalPeriodo.includes("p") && hora < 12) hora += 12;
  if (normalPeriodo.includes("a") && hora === 12) hora = 0;

  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

function extraerFechas(texto) {
  const fechas = [...String(texto || "").matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g)]
    .map((match) => `${match[3]}-${String(match[2]).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`);

  return {
    fechaInicio: fechas[0] || "",
    fechaFin: fechas[1] || "",
  };
}

function extraerCosto(texto) {
  const costoLinea = extraerValorEtiqueta(texto, ["costo", "inversion", "inversión", "pago"]);
  const pagoUnico = String(texto || "").match(/pago\s+[úu]nico\s*[:\-–]?\s*(?:S\/\.?\s*)?(\d+(?:[.,]\d{1,2})?)/i);
  if (pagoUnico?.[1]) return Number(pagoUnico[1].replace(",", ".")).toFixed(2);
  const bloqueCosto = extraerBloqueSeccion(texto, ["costo"], ["el almuerzo", "almuerzo", "requisitos", "entregar este formato", "acepto"]);
  const fuente = costoLinea || bloqueCosto || texto;
  const match = String(fuente).match(/(?:S\/\s*)?(\d+(?:[.,]\d{1,2})?)/i);
  if (!match) return "";
  return Number(match[1].replace(",", ".")).toFixed(2);
}

function extraerNumeroEtiqueta(texto, etiquetas) {
  const valor = extraerValorEtiqueta(texto, etiquetas);
  const match = String(valor).match(/\d+/);
  return match?.[0] || "";
}

function extraerModalidad(texto) {
  const normal = normalizarComparacion(texto);
  if (normal.includes("pago unico") || normal.includes("unico")) return "Unico";
  if (normal.includes("mensual") || normal.includes("cuota")) return "Mensual";
  return "";
}

function extraerUniforme(texto) {
  const linea = extraerValorEtiqueta(texto, ["uniforme", "requiere uniforme"]);
  const normal = normalizarComparacion(linea || texto);
  if (normal.includes("no requiere uniforme") || /^no\b/.test(normal)) return false;
  if (normal.includes("requiere uniforme") || /^si\b/.test(normal) || normal.includes(" si ")) return true;
  return null;
}

function extraerGrados(texto) {
  const fuente = extraerValorEtiqueta(texto, ["grados", "grados aplicables", "dirigido a", "grado"]) || texto;
  const normal = normalizarComparacion(fuente);
  const seleccionados = [];

  nivelesGrados.forEach(({ nivel, grados }) => {
    const nivelNormal = normalizarComparacion(nivel);
    if (!normal.includes(nivelNormal)) return;

    grados.forEach((grado) => {
      const gradoNormal = normalizarComparacion(grado);
      const numero = gradoNormal.match(/\d+/)?.[0];
      const coincideNumero = numero && new RegExp(`\\b${numero}\\b`).test(normal);
      if (normal.includes(gradoNormal) || coincideNumero || normal.includes("todos")) {
        seleccionados.push(`${nivel}:${grado}`);
      }
    });
  });

  return [...new Set(seleccionados)];
}

function resumenGradosDesdeValores(grados) {
  if (!grados.length) return "";
  return nivelesGrados
    .map(({ nivel }) => {
      const items = grados
        .filter(item => item.startsWith(`${nivel}:`))
        .map(item => etiquetaGradoCorta(item.split(":")[1]));
      return items.length ? `${nivel}: ${items.join(", ")}` : "";
    })
    .filter(Boolean)
    .join(" / ");
}

function etiquetaGradoCorta(grado) {
  return String(grado || "").replace(/\s*años?/i, "").trim();
}

function limpiarDatosVacios(datos) {
  return Object.fromEntries(Object.entries(datos).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "boolean") return true;
    return String(value ?? "").trim() !== "";
  }));
}

function contarDatosDetectados(datos) {
  return Object.keys(datos).filter((key) => !["grupo", "horario"].includes(key)).length;
}

function filtrarDatosDocumento(datos) {
  const camposDocumento = ["requisitos", "comunicado", "detalleCosto", "detalleAlmuerzo", "concesionarios"];
  return Object.fromEntries(Object.entries(datos).filter(([key]) => camposDocumento.includes(key)));
}

function etiquetaCampoDocumento(campo) {
  const etiquetas = {
    requisitos: "Requisitos",
    comunicado: "Comunicado",
    detalleCosto: "Detalle de costo",
    detalleAlmuerzo: "Almuerzo",
    concesionarios: "Concesionarios",
  };
  return etiquetas[campo] || campo;
}

function resumirTextoDocumento(valor) {
  const texto = String(valor || "").replace(/\s+/g, " ").trim();
  if (!texto) return "Sin contenido";
  return texto.length > 240 ? `${texto.slice(0, 240).trim()}...` : texto;
}

function formatearHora12(valor) {
  const match = String(valor || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return valor || "";
  const horas24 = Number(match[1]);
  const minutos = match[2];
  const periodo = horas24 >= 12 ? "PM" : "AM";
  const horas12 = horas24 % 12 || 12;
  return `${horas12}:${minutos} ${periodo}`;
}

function capitalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letra) => letra.toUpperCase());
}

function leerArchivoBase64(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = String(reader.result || "");
      resolve(resultado.includes(",") ? resultado.split(",")[1] : resultado);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo Word."));
    reader.readAsDataURL(archivo);
  });
}

function normalizarVariable(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarComparacion(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escaparRegExp(valor) {
  return String(valor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function base64ToArrayBuffer(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let index = 0; index < binario.length; index += 1) {
    bytes[index] = binario.charCodeAt(index);
  }
  return bytes.buffer;
}

function esCostoValido(valor) {
  const texto = String(valor || "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return false;
  return Number(texto) > 0;
}

function formatearSoles(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

function descargarListaAlumnosPdf(programa, alumnos) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margen = 14;
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const fecha = formatearFechaPdf(fechaActualIso());
  let y = 16;

  doc.setTextColor(7, 17, 31);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Lista de alumnos registrados", anchoPagina / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(82, 97, 115);
  doc.text(`Generado: ${fecha}`, anchoPagina / 2, y, { align: "center" });
  y += 10;

  const datosPrograma = [
    ["Programa", programa?.nombre || "Sin nombre"],
    ["Codigo", programa?.id || "Sin codigo"],
    ["Categoria", programa?.categoria || "No definida"],
    ["Responsable", programa?.responsable || "No asignado"],
    ["Horario", programa?.horario || "Por definir"],
    ["Vigencia", `${formatearFechaPdf(programa?.fechaInicio)} al ${formatearFechaPdf(programa?.fechaFin)}`],
    ["Cupos", `${programa?.cuposOcupados || alumnos.length}/${programa?.cupos || alumnos.length}`],
  ];

  doc.setDrawColor(216, 229, 226);
  doc.setFillColor(248, 252, 251);
  doc.roundedRect(margen, y, anchoPagina - margen * 2, 39, 3, 3, "FD");
  y += 6;

  datosPrograma.forEach(([label, value], index) => {
    const columna = index % 2;
    const fila = Math.floor(index / 2);
    const x = margen + 5 + columna * 91;
    const yy = y + fila * 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(82, 97, 115);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(7, 17, 31);
    doc.text(doc.splitTextToSize(String(value || "-"), columna === 0 ? 76 : 70), x, yy + 3.8);
  });

  y += 45;
  y = dibujarEncabezadoTablaPdf(doc, margen, y);

  alumnos.forEach((alumno, index) => {
    if (y > altoPagina - 18) {
      doc.addPage();
      y = 16;
      y = dibujarEncabezadoTablaPdf(doc, margen, y);
    }

    const nombre = String(alumno.nombres || alumno.nombre || "").trim() || "-";
    const fila = [
      String(index + 1),
      alumno.dni || "Sin DNI",
      alumno.codigoEstudiante || "-",
      nombre,
      alumno.grado || "-",
      alumno.seccion || "-",
    ];

    const altoFila = Math.max(8, doc.splitTextToSize(nombre, 67).length * 4.2 + 4);
    doc.setDrawColor(237, 242, 245);
    doc.line(margen, y - 2, anchoPagina - margen, y - 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(24, 33, 47);
    doc.text(fila[0], margen + 1, y + 3);
    doc.text(fila[1], margen + 10, y + 3);
    doc.text(fila[2], margen + 35, y + 3);
    doc.text(doc.splitTextToSize(fila[3], 67), margen + 62, y + 3);
    doc.text(fila[4], margen + 134, y + 3);
    doc.text(fila[5], margen + 161, y + 3);
    y += altoFila;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(82, 97, 115);
  doc.text(`Total de alumnos: ${alumnos.length}`, margen, altoPagina - 10);
  doc.save(`lista-alumnos-${normalizarNombreArchivoPdf(programa?.nombre || programa?.id || "programa")}-${fechaActualIso()}.pdf`);
}

function dibujarEncabezadoTablaPdf(doc, margen, y) {
  doc.setFillColor(234, 246, 242);
  doc.setDrawColor(216, 229, 226);
  doc.roundedRect(margen, y, 182, 8, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(39, 124, 105);
  doc.text("#", margen + 1, y + 5.3);
  doc.text("DNI", margen + 10, y + 5.3);
  doc.text("CODIGO", margen + 35, y + 5.3);
  doc.text("ESTUDIANTE", margen + 62, y + 5.3);
  doc.text("GRADO", margen + 134, y + 5.3);
  doc.text("SECCION", margen + 161, y + 5.3);
  return y + 12;
}

function formatearFechaPdf(valor) {
  if (!valor) return "Sin fecha";
  const partes = String(valor).split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return String(valor);
}

function normalizarNombreArchivoPdf(valor) {
  return String(valor || "archivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "archivo";
}

function textoEstadoCarga(estado) {
  if (estado === "Valido") return "Listo";
  if (estado === "Duplicado") return "Duplicado";
  return "Con error";
}

export default Coordinacion;
