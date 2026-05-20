import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Badge, Button, Group, Modal, Select, Table, Tooltip } from "@mantine/core";
import { toast } from "sonner";
import {
  IconChartBar as ChartBar,
  IconCheck as Check,
  IconCircleCheck as CheckCircle,
  IconClock as Clock,
  IconDownload as Download,
  IconEdit as Edit,
  IconLogout as LogOut,
  IconReceipt2 as Receipt,
  IconSearch as Search,
  IconX as X,
} from "@tabler/icons-react";
import {
  actualizarPago,
  generarReporteCaja,
  listarPagos,
  obtenerEstudiantePorDni,
  obtenerOpcionesReporteCaja,
  obtenerResumenCaja,
  registrarPago,
} from "./cajaService";
import { fechaActualInput, formatearFechaPeru } from "../../services/dateService";
import { validarDni } from "../../services/validators";
import "./Caja.css";

const formularioInicial = {
  inscripcionId: "",
  estudianteDni: "",
  estudianteNombre: "",
  programaId: "",
  programaNombre: "",
  monto: "",
  concepto: "Inscripcion",
  formaPago: "Efectivo",
  estado: "completado",
  fechaPago: fechaActualInput(),
  observaciones: "",
};

const estadoLabels = {
  completado: "Pagado",
  pendiente: "Pendiente",
  cancelado: "Anulado",
};

const estadoColors = {
  completado: "green",
  pendiente: "yellow",
  cancelado: "red",
};

const tiposReporte = [
  { value: "pagos_registrados", label: "Pagos registrados en Caja" },
  { value: "por_cobrar", label: "Por cobrar" },
  { value: "inscripciones", label: "Inscripciones registradas" },
  { value: "registro_web", label: "Registro por web / Padres" },
];

const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";

function formatearSoles(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

function limpiarDni(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 8);
}

function obtenerIniciales(estudiante) {
  const texto = `${estudiante?.nombres || ""} ${estudiante?.apellidos || ""}`.trim();
  return texto
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase() || "SR";
}

function ResumenCaja({ resumen }) {
  const items = [
    {
      label: "Cobrado",
      value: resumen.totalIngreso,
      detail: `${resumen.cantidadPagos} pagos validados`,
      icon: CheckCircle,
      tone: "success",
    },
    {
      label: "Por cobrar",
      value: resumen.totalPendiente,
      detail: `${resumen.cantidadPendientes} pagos pendientes`,
      icon: Clock,
      tone: "warning",
    },
    {
      label: "Anulado",
      value: resumen.totalCancelado,
      detail: "Pagos cancelados",
      icon: X,
      tone: "danger",
    },
  ];

  return (
    <section className="caja-summary" aria-label="Resumen de caja">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <article className="caja-summary-card" data-tone={item.tone} key={item.label}>
            <div>
              <span>{item.label}</span>
              <strong>{formatearSoles(item.value)}</strong>
              <small>{item.detail}</small>
            </div>
            <Icon size={22} />
          </article>
        );
      })}
    </section>
  );
}

function CajaFields({
  buscando,
  dni,
  estudiante,
  formulario,
  modoEdicion,
  onBuscar,
  setDni,
  setFormulario,
}) {
  const pagoHabilitado = modoEdicion || Boolean(formulario.inscripcionId);

  function actualizar(campo, valor) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  const datosLectura = [
    ["DNI", formulario.estudianteDni || "Sin DNI"],
    ["Estudiante", formulario.estudianteNombre || "Sin estudiante"],
    ["Programa", formulario.programaNombre || "Sin programa"],
    ["Monto", formatearSoles(formulario.monto)],
    ["Concepto", formulario.concepto || "Inscripcion"],
    ["Estado", "Pagado"],
    ["Fecha", formatearFechaPeru(formulario.fechaPago)],
  ];

  return (
    <div className={`caja-form ${pagoHabilitado ? "has-payment" : "is-search-only"}`}>
      {!modoEdicion ? (
        <section className="caja-form-block">
          <div className="caja-form-title">
            <Search size={18} />
            <div>
              <h3>Buscar inscripción</h3>
            </div>
          </div>
          <form className="caja-search-form" onSubmit={onBuscar}>
            <input
              inputMode="numeric"
              maxLength={8}
              onChange={(event) => setDni(limpiarDni(event.currentTarget.value))}
              placeholder="DNI del estudiante"
              value={dni}
            />
            <Button leftSection={<Search size={16} />} loading={buscando} type="submit">
              Buscar
            </Button>
          </form>
          {estudiante ? (
            <div className="caja-student-card">
              <span>{obtenerIniciales(estudiante)}</span>
              <div>
                <strong>{`${estudiante.nombres || ""} ${estudiante.apellidos || ""}`.trim()}</strong>
                <small>
                  {estudiante.codigoEstudiante || "Sin codigo"} - {estudiante.grado || "Sin grado"}
                  {estudiante.seccion ? ` ${estudiante.seccion}` : ""}
                </small>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {pagoHabilitado ? (
        <section className="caja-form-block">
          <div className="caja-form-title">
            <Receipt size={18} />
            <div>
              <h3>Datos del pago</h3>
              <p>Información cargada desde la inscripción.</p>
            </div>
          </div>

          <div className="caja-payment-summary">
            {datosLectura.map(([etiqueta, valor]) => (
              <div className="caja-readonly-field" key={etiqueta}>
                <span>{etiqueta}</span>
                <strong>{valor}</strong>
              </div>
            ))}
            <label className="caja-payment-method">
              Forma de pago
              <select value={formulario.formaPago} onChange={(event) => actualizar("formaPago", event.currentTarget.value)}>
                <option value="Efectivo">Efectivo</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CajaPanelHeader({
  busqueda,
  cargando,
  filtroEstado,
  registros,
  setBusqueda,
  setFiltroEstado,
  titulo,
}) {
  return (
    <div className="caja-panel-header">
      <div>
        <h2>{titulo}</h2>
        <p>{registros} registros visibles{cargando ? " - Actualizando" : ""}</p>
      </div>
      <div className="caja-filters">
        <div className="caja-search">
          <Search size={17} />
          <input
            onChange={(event) => setBusqueda(event.currentTarget.value)}
            placeholder="Buscar DNI, estudiante o programa"
            value={busqueda}
          />
        </div>
        <Select
          aria-label="Estado"
          className="caja-state-filter"
          data={[
            { value: "todos", label: "Todos" },
            { value: "completado", label: "Pagados" },
            { value: "pendiente", label: "Pendientes" },
            { value: "cancelado", label: "Anulados" },
          ]}
          onChange={(valor) => setFiltroEstado(valor || "todos")}
          value={filtroEstado}
        />
      </div>
    </div>
  );
}

function PagosTabla({ mostrarAccion = false, onEditar, pagos, vacio }) {
  if (pagos.length === 0) {
    return (
      <div className="caja-empty">
        <Receipt size={28} />
        <strong>No hay pagos para mostrar</strong>
        <span>{vacio}</span>
      </div>
    );
  }

  return (
    <div className="caja-table-wrap">
      <Table className="caja-table" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Estudiante</Table.Th>
            <Table.Th>Programa</Table.Th>
            <Table.Th>Concepto</Table.Th>
            <Table.Th>Monto</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th>Fecha</Table.Th>
            {mostrarAccion ? <Table.Th>Accion</Table.Th> : null}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {pagos.map((pago) => (
            <Table.Tr key={pago.id}>
              <Table.Td>
                <div className="caja-student-cell">
                  <strong>{pago.estudianteNombre || pago.nombresEstudiante || "Sin nombre"}</strong>
                  <span>DNI {pago.estudianteDni || pago.dniEstudiante || "Sin DNI"}</span>
                </div>
              </Table.Td>
              <Table.Td>{pago.programaNombre || pago.programa || "Sin programa"}</Table.Td>
              <Table.Td>{pago.concepto || "Inscripcion"}</Table.Td>
              <Table.Td className="caja-amount">{formatearSoles(pago.monto)}</Table.Td>
              <Table.Td>
                <Badge color={estadoColors[pago.estado] || "gray"} variant="light">
                  {estadoLabels[pago.estado] || pago.estado || "Sin estado"}
                </Badge>
              </Table.Td>
              <Table.Td>{formatearFechaPeru(pago.fechaPago || pago.fecha)}</Table.Td>
              {mostrarAccion ? (
                <Table.Td>
                  <Tooltip label="Editar pago">
                    <ActionIcon onClick={() => onEditar(pago)} variant="light">
                      <Edit size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              ) : null}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}

function ReporteFiltros({ filtros, mediosPago, onChange, programas }) {
  return (
    <section className="caja-report-filters">
      <label>
        Tipo de reporte
        <select value={filtros.tipoReporte} onChange={(event) => onChange("tipoReporte", event.currentTarget.value)}>
          {tiposReporte.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
          ))}
        </select>
      </label>
      <label>
        Fechas
        <select value={filtros.rango} onChange={(event) => onChange("rango", event.currentTarget.value)}>
          <option value="personalizado">Rango personalizado</option>
          <option value="todo">Todo el periodo</option>
        </select>
      </label>
      <label>
        Desde
        <input
          disabled={filtros.rango === "todo"}
          onChange={(event) => onChange("desde", event.currentTarget.value)}
          type="date"
          value={filtros.desde}
        />
      </label>
      <label>
        Hasta
        <input
          disabled={filtros.rango === "todo"}
          onChange={(event) => onChange("hasta", event.currentTarget.value)}
          type="date"
          value={filtros.hasta}
        />
      </label>
      <label>
        Programa
        <select value={filtros.programa} onChange={(event) => onChange("programa", event.currentTarget.value)}>
          <option value="todos">Todos</option>
          {programas.map((programa) => (
            <option key={programa.value} value={programa.value}>{programa.label}</option>
          ))}
        </select>
      </label>
      <label>
        Medio de pago
        <select value={filtros.medioPago} onChange={(event) => onChange("medioPago", event.currentTarget.value)}>
          <option value="todos">Todos</option>
          {mediosPago.map((medio) => (
            <option key={medio.value} value={medio.value}>{medio.label}</option>
          ))}
        </select>
      </label>
    </section>
  );
}

function ReporteTabla({ filas }) {
  if (filas.length === 0) {
    return (
      <div className="caja-empty">
        <ChartBar size={28} />
        <strong>No hay datos para este reporte</strong>
        <span>Ajuste los filtros o revise si existen matriculas en Secretaria/Padres.</span>
      </div>
    );
  }

  return (
    <div className="caja-table-wrap">
      <Table className="caja-table caja-report-table" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Estudiante</Table.Th>
            <Table.Th>Programa</Table.Th>
            <Table.Th>Monto</Table.Th>
            <Table.Th>Pago</Table.Th>
            <Table.Th>Medio</Table.Th>
            <Table.Th>Origen</Table.Th>
            <Table.Th>Fecha</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filas.map((fila) => (
            <Table.Tr key={`${fila.id || fila.inscripcionId || fila.pagoId}-${fila.dniEstudiante}`}>
              <Table.Td>
                <div className="caja-student-cell">
                  <strong>{fila.estudiante || "Sin nombre"}</strong>
                  <span>DNI {fila.dniEstudiante || "Sin DNI"}</span>
                </div>
              </Table.Td>
              <Table.Td>{fila.programa || "Sin programa"}</Table.Td>
              <Table.Td className="caja-amount">{formatearSoles(fila.monto)}</Table.Td>
              <Table.Td>
                <Badge color={fila.estadoPago === "pagado" ? "green" : fila.estadoPago === "anulado" ? "red" : "yellow"} variant="light">
                  {fila.estadoPago === "pagado" ? "Pagado" : fila.estadoPago === "anulado" ? "Anulado" : "Pendiente"}
                </Badge>
              </Table.Td>
              <Table.Td>{fila.formaPago || "Sin pago"}</Table.Td>
              <Table.Td>{fila.origen || "Sin origen"}</Table.Td>
              <Table.Td>{formatearFechaPeru(fila.fecha || fila.fechaRegistro)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}

export default function Caja({ onLogout }) {
  const [vista, setVista] = useState("pagos");
  const [periodo, setPeriodo] = useState("escolar");
  const [formulario, setFormulario] = useState(formularioInicial);
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estudiante, setEstudiante] = useState(null);
  const [dni, setDni] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [reporteCaja, setReporteCaja] = useState([]);
  const [opcionesReporte, setOpcionesReporte] = useState({ programas: [], mediosPago: [] });
  const [filtrosReporte, setFiltrosReporte] = useState({
    tipoReporte: "pagos_registrados",
    rango: "personalizado",
    desde: "",
    hasta: "",
    programa: "todos",
    medioPago: "todos",
  });

  useEffect(() => {
    cargarDatos();
  }, [periodo]);

  useEffect(() => {
    cargarReporteCaja();
  }, [periodo, filtrosReporte]);

  const pagosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return pagos.filter((pago) => {
      const coincideEstado = filtroEstado === "todos" || pago.estado === filtroEstado;
      const coincideTexto = !texto || [
        pago.estudianteDni,
        pago.dniEstudiante,
        pago.estudianteNombre,
        pago.nombresEstudiante,
        pago.programaNombre,
        pago.programa,
        pago.concepto,
      ].some((valor) => String(valor || "").toLowerCase().includes(texto));
      return coincideEstado && coincideTexto;
    });
  }, [busqueda, filtroEstado, pagos]);

  const reporte = useMemo(() => {
    const totalVisible = reporteCaja.reduce((sum, fila) => sum + Number(fila.monto || 0), 0);
    const pagados = reporteCaja.filter((fila) => fila.estadoPago === "pagado");
    const pendientes = reporteCaja.filter((fila) => fila.estadoPago === "pendiente");
    return {
      totalVisible,
      totalPagado: pagados.reduce((sum, pago) => sum + Number(pago.monto || 0), 0),
      totalPendiente: pendientes.reduce((sum, pago) => sum + Number(pago.monto || 0), 0),
      cantidadPagada: pagados.length,
      cantidadPendiente: pendientes.length,
    };
  }, [reporteCaja]);

  async function cargarDatos() {
    setCargando(true);
    try {
      const [datosPagos, datosResumen] = await Promise.all([
        listarPagos(periodo),
        obtenerResumenCaja(periodo),
      ]);
      setPagos(datosPagos);
      setResumen(datosResumen);
    } catch (error) {
      toast.error("Caja", { description: error.message || "No se pudo cargar la informacion." });
    } finally {
      setCargando(false);
    }
  }

  async function cargarReporteCaja() {
    try {
      const [opciones, filas] = await Promise.all([
        obtenerOpcionesReporteCaja(periodo),
        generarReporteCaja({
          periodo,
          tipoReporte: filtrosReporte.tipoReporte,
          desde: filtrosReporte.rango === "todo" ? "" : filtrosReporte.desde,
          hasta: filtrosReporte.rango === "todo" ? "" : filtrosReporte.hasta,
          programa: filtrosReporte.programa,
          medioPago: filtrosReporte.medioPago,
        }),
      ]);
      setOpcionesReporte(opciones);
      setReporteCaja(filas);
    } catch (error) {
      toast.error("Reporte de caja", { description: error.message || "No se pudo generar el reporte." });
    }
  }

  async function buscarEstudiante(event) {
    event?.preventDefault();
    setMensaje("");
    if (!validarDni(dni)) {
      setMensaje("Ingrese un DNI valido de 8 digitos.");
      return;
    }

    setBuscando(true);
    try {
      const encontrado = await obtenerEstudiantePorDni(dni, periodo);
      if (!encontrado) {
        setEstudiante(null);
        setMensaje("No se encontro un estudiante con ese DNI.");
        return;
      }
      if (encontrado.sinInscripcionCaja) {
        setEstudiante(null);
        setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
        setMensaje("El estudiante aun no paso por Secretaria. Primero debe existir una inscripcion registrada.");
        return;
      }
      const inscripcion = encontrado.inscripcionCaja;
      const nombre = `${encontrado.nombres || ""} ${encontrado.apellidos || ""}`.trim();
      setEstudiante(encontrado);
      setFormulario((actual) => ({
        ...actual,
        inscripcionId: inscripcion?.id || "",
        estudianteDni: dni,
        estudianteNombre: inscripcion?.nombresEstudiante || nombre,
        programaId: inscripcion?.programaId || encontrado.programaAsignado || actual.programaId || "",
        programaNombre: inscripcion?.programa || encontrado.programaNombre || actual.programaNombre || "",
        monto: inscripcion?.costo ? String(inscripcion.costo) : encontrado.programaCosto ? String(encontrado.programaCosto) : actual.monto,
      }));
    } catch (error) {
      setMensaje(error.message || "No se pudo buscar el estudiante.");
    } finally {
      setBuscando(false);
    }
  }

  async function guardarPago() {
    const error = validarPago();
    if (error) {
      setMensaje(error);
      return;
    }

    setGuardando(true);
    setMensaje("");
    const payload = {
      ...formulario,
      periodo,
      concepto: "Inscripcion",
      estado: "completado",
      observaciones: "",
      inscripcionId: formulario.inscripcionId,
      monto: Number(formulario.monto),
      dniEstudiante: formulario.estudianteDni,
      nombresEstudiante: formulario.estudianteNombre,
      programa: formulario.programaNombre,
      fecha: formulario.fechaPago,
    };

    try {
      if (modoEdicion) {
        await actualizarPago(pagoSeleccionado.id, payload);
        toast.success("Pago actualizado", { description: "El registro quedo actualizado correctamente." });
        cerrarModal();
      } else {
        await registrarPago(payload);
        toast.success("Pago registrado", { description: "El pago quedo guardado en Caja." });
        limpiarPagoActual();
      }
      await cargarDatos();
      await cargarReporteCaja();
    } catch (err) {
      toast.error("No se pudo guardar", { description: err.message || "Revise los datos del pago." });
    } finally {
      setGuardando(false);
    }
  }

  function validarPago() {
    if (!modoEdicion && !formulario.inscripcionId) return "Primero busque un estudiante con inscripcion registrada por Secretaria.";
    if (!validarDni(formulario.estudianteDni)) return "Seleccione o ingrese un DNI valido.";
    if (!formulario.estudianteNombre.trim()) return "Ingrese el nombre del estudiante.";
    if (!Number.isFinite(Number(formulario.monto)) || Number(formulario.monto) <= 0) return "Ingrese un monto mayor a cero.";
    if (!formulario.fechaPago) return "Seleccione la fecha de pago.";
    return "";
  }

  function abrirModalNuevo() {
    limpiarPagoActual();
  }

  function abrirModalEdicion(pago) {
    setPagoSeleccionado(pago);
    setFormulario({
      ...formularioInicial,
      ...pago,
      estudianteDni: pago.estudianteDni || pago.dniEstudiante || "",
      estudianteNombre: pago.estudianteNombre || pago.nombresEstudiante || "",
      programaNombre: pago.programaNombre || pago.programa || "",
      fechaPago: String(pago.fechaPago || pago.fecha || fechaActualInput()).slice(0, 10),
      monto: String(pago.monto || ""),
    });
    setDni(pago.estudianteDni || pago.dniEstudiante || "");
    setEstudiante(null);
    setMensaje("");
    setModoEdicion(true);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setModoEdicion(false);
    setPagoSeleccionado(null);
  }

  function limpiarPagoActual() {
    setFormulario({ ...formularioInicial, fechaPago: fechaActualInput() });
    setEstudiante(null);
    setDni("");
    setMensaje("");
    setModoEdicion(false);
    setPagoSeleccionado(null);
  }

  async function descargarReporte() {
    try {
      const datos = await generarReporteCaja({
        periodo,
        tipoReporte: filtrosReporte.tipoReporte,
        desde: filtrosReporte.rango === "todo" ? "" : filtrosReporte.desde,
        hasta: filtrosReporte.rango === "todo" ? "" : filtrosReporte.hasta,
        programa: filtrosReporte.programa,
        medioPago: filtrosReporte.medioPago,
      });
      const csv = generarCSVReporte(datos);
      const nombre = `reporte-caja-${periodo}-${fechaActualInput()}.csv`;
      descargarArchivo(csv, nombre);
      toast.success("Reporte descargado", { description: "El archivo CSV se genero correctamente." });
    } catch (error) {
      toast.error("No se pudo descargar", { description: error.message || "Intente nuevamente." });
    }
  }

  function actualizarFiltroReporte(campo, valor) {
    setFiltrosReporte((actual) => ({ ...actual, [campo]: valor || "" }));
  }

  function generarCSVReporte(datos) {
    const encabezados = ["DNI", "Estudiante", "Programa", "Monto", "Estado pago", "Medio pago", "Origen", "Fecha registro", "Fecha pago", "Apoderado", "Telefono"];
    const filas = datos.map((fila) => [
      fila.dniEstudiante,
      fila.estudiante,
      fila.programa,
      Number(fila.monto || 0).toFixed(2),
      fila.estadoPago,
      fila.formaPago,
      fila.origen,
      formatearFechaPeru(fila.fechaRegistro),
      formatearFechaPeru(fila.fechaPago),
      fila.apoderado,
      fila.telefono,
    ]);
    return [encabezados, ...filas]
      .map((fila) => fila.map((valor) => `"${String(valor || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
  }

  function descargarArchivo(contenido, nombreArchivo) {
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreArchivo;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  return (
    <main className="caja-page">
      <aside className="caja-sidebar">
        <div className="caja-brand" aria-label="Colegio San Rafael">
          <img className="caja-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
        </div>
        <p className="caja-module-label">Modulo Caja</p>
        <nav className="caja-nav" aria-label="Modulo de caja">
          <button className={vista === "pagos" ? "is-active" : ""} onClick={() => setVista("pagos")} type="button">
            <Receipt size={17} /> Realizar pago
          </button>
          <button className={vista === "reportes" ? "is-active" : ""} onClick={() => setVista("reportes")} type="button">
            <ChartBar size={17} /> Reporte de pagos
          </button>
        </nav>
        <button className="caja-logout" onClick={onLogout} type="button">
          <LogOut size={17} /> Cerrar sesion
        </button>
      </aside>

      <section className="caja-main">
        <header className="caja-header">
          <div>
            <h1>{vista === "pagos" ? "Gestion de pagos" : "Reporte de pagos"}</h1>
          </div>
          <div className="caja-header-actions">
            <Select
              aria-label="Periodo"
              className="caja-period"
              data={[
                { value: "escolar", label: "Año escolar" },
                { value: "verano", label: "Ciclo verano" },
              ]}
              onChange={(valor) => setPeriodo(valor || "escolar")}
              value={periodo}
            />
            {vista === "reportes" ? (
              <Button leftSection={<Download size={17} />} onClick={descargarReporte}>
                Descargar CSV
              </Button>
            ) : null}
          </div>
        </header>

        {vista === "pagos" ? (
          <>
            <section className="caja-payment-workspace">
              {mensaje ? <div className="caja-alert">{mensaje}</div> : null}
              <CajaFields
                buscando={buscando}
                dni={dni}
                estudiante={estudiante}
                formulario={formulario}
                modoEdicion={false}
                onBuscar={buscarEstudiante}
                setDni={setDni}
                setFormulario={setFormulario}
              />
              {formulario.inscripcionId ? (
                <Group className="caja-payment-actions" justify="flex-end">
                  <Button onClick={limpiarPagoActual} variant="default">
                    Limpiar
                  </Button>
                  <Button leftSection={<Check size={17} />} loading={guardando} onClick={guardarPago}>
                    Registrar pago
                  </Button>
                </Group>
              ) : null}
            </section>
          </>
        ) : (
          <section className="caja-report-layout">
            <div className="caja-report-grid">
              <article>
                <span>Total filtrado</span>
                <strong>{formatearSoles(reporte.totalVisible)}</strong>
                <small>{reporteCaja.length} registros</small>
              </article>
              <article>
                <span>Pagado</span>
                <strong>{formatearSoles(reporte.totalPagado)}</strong>
                <small>{reporte.cantidadPagada} pagos validados</small>
              </article>
              <article>
                <span>Pendiente</span>
                <strong>{formatearSoles(reporte.totalPendiente)}</strong>
                <small>{reporte.cantidadPendiente} pagos por cobrar</small>
              </article>
            </div>
            <ReporteFiltros
              filtros={filtrosReporte}
              mediosPago={opcionesReporte.mediosPago}
              onChange={actualizarFiltroReporte}
              programas={opcionesReporte.programas}
            />
            <section className="caja-panel">
              <div className="caja-panel-header">
                <div>
                  <h2>Resultado del reporte</h2>
                  <p>{reporteCaja.length} registros encontrados</p>
                </div>
              </div>
              <ReporteTabla filas={reporteCaja} />
            </section>
          </section>
        )}
      </section>

      <Modal
        centered
        classNames={{ body: "caja-modal-body", header: "caja-modal-header", title: "caja-modal-title" }}
        onClose={cerrarModal}
        opened={modalAbierto}
        size="xl"
        title={modoEdicion ? "Editar pago" : "Registrar pago"}
      >
        {mensaje ? <div className="caja-alert">{mensaje}</div> : null}
        <CajaFields
          buscando={buscando}
          dni={dni}
          estudiante={estudiante}
          formulario={formulario}
          modoEdicion={modoEdicion}
          onBuscar={buscarEstudiante}
          setDni={setDni}
          setFormulario={setFormulario}
        />
        <Group justify="flex-end" mt="lg">
          <Button onClick={cerrarModal} variant="default">
            Cancelar
          </Button>
          <Button leftSection={<Check size={17} />} loading={guardando} onClick={guardarPago}>
            {modoEdicion ? "Actualizar" : "Registrar"}
          </Button>
        </Group>
      </Modal>
    </main>
  );
}
