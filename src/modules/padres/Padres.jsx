import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Group, Stack, Card, Badge, Text, Center, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Info,
  Loader2,
  LogOut,
  MessageCircle,
  UserRound,
  Send,
  X,
} from "lucide-react";
import { formatearFechaPeru } from "../../services/dateService";
import { guardarDatosApoderadoPadres, obtenerResumenPadre, obtenerProgramasCoordinacion, registrarInscripcionPadres } from "./padresService";
import "./Padres.css";

const mensajesIniciales = [
  {
    autor: "bot",
    texto: "Hola, soy el asistente del portal de padres. Puedo ayudarte con el programa, horario, monto, ficha y estado de pago.",
  },
];

export default function Padres({ user, onLogout }) {
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

  return (
    <div className="padres-layout">
      <main className="padres-main">
        <header className="padres-header">
          <div className="padres-brand">
            <span className="padres-brand-mark">SR</span>
            <div>
              <strong>Colegio San Rafael</strong>
              <p>Portal de Apoderados</p>
            </div>
          </div>
          <div className="padres-header-actions">
            <div className="padres-family-chip">
              <span>Familia de</span>
              <strong>{nombreCorto}</strong>
            </div>
            <div className="padres-family-avatar">{iniciales}</div>
            <button className="padres-logout-top" type="button" onClick={onLogout}>
              <LogOut size={16} />
              Cerrar sesion
            </button>
          </div>
        </header>

        {cargando ? (
          <section className="padres-loading">
            <Loader2 className="padres-spin" size={30} />
            <p>Cargando informacion del estudiante...</p>
          </section>
        ) : error ? (
          <Alert className="padres-alert" color="orange" radius="md" icon={<AlertCircle size={18} />}>
            {error}
          </Alert>
        ) : (
          <section className="padres-enrollment">
            <article
              className={`padres-hero ${bannerEstudiante ? "padres-hero-with-banner" : ""}`}
              style={bannerEstudiante ? { "--padres-banner": `url("${bannerEstudiante}")` } : undefined}
            >
              <div className="padres-hero-copy">
                <span className="padres-eyebrow">Familia San Rafael</span>
                <h2>Hola, familia de {nombreCorto}</h2>
                <p>
                  Nos alegra tenerlos en la comunidad San Rafael.
                </p>
                <div className="padres-hero-actions">
                  <button className="padres-hero-primary" type="button" onClick={() => consultarRafael("Que programa tiene disponible mi hijo")}>
                    Consultar programa
                  </button>
                  <button className="padres-hero-secondary" type="button" onClick={() => consultarRafael("Que debo hacer ahora")}>
                    Siguiente paso
                  </button>
                </div>
              </div>
            </article>

            <section className="padres-left-column">
              <article className="padres-panel padres-payment-panel">
                <div className="padres-payment-icon">
                  <CreditCard size={24} />
                </div>
                <div className="padres-payment-status">
                  <span>Estado actual</span>
                  <h2>{siguientePaso.titulo}</h2>
                  <p>{siguientePaso.detalle}</p>
                  <button className="padres-outline-button" type="button" onClick={() => consultarRafael("Que debo hacer ahora")}>
                    Ver detalles del estado
                  </button>
                </div>
                <div className="padres-payment-amount">
                  <span>Monto pendiente</span>
                  <strong>{programa ? formatearSoles(programa.costo) : "S/ 0.00"}</strong>
                  <button className="padres-orange-button" type="button" onClick={abrirPago}>
                    <CreditCard size={15} />
                    Pagar ahora
                  </button>
                </div>
              </article>

              <article className="padres-panel padres-program-panel">
                {programa ? (
                  <div className="padres-program-box">
                    <div className="padres-program-summary-head">
                      <span className="padres-program-icon"><BookOpen size={24} /></span>
                      <div className="padres-program-main">
                        <span>Programa asignado</span>
                        <h3>{programa.programa}</h3>
                      </div>
                      <span className="padres-state-pill">{inscripcion ? "Registrado" : "Invitado"}</span>
                    </div>

                    <dl className="padres-program-list">
                      <ProgramaDato icon={<UserRound size={16} />} label="Profesor(a)" value={programa.docente || programa.responsable || "Por definir"} />
                      <ProgramaDato icon={<CreditCard size={16} />} label="Horario" value={programa.horario || "Por confirmar"} />
                      <ProgramaDato icon={<CalendarDays size={16} />} label="Vigencia" value={`${formatearFechaPeru(programa.fechaInicio, "Por definir")} al ${formatearFechaPeru(programa.fechaFin, "Por definir")}`} />
                      <ProgramaDato icon={<UserRound size={16} />} label="Grupo" value={programa.periodo || "Escolar"} />
                    </dl>

                    <div className="padres-program-note">
                      <div>
                        <CalendarDays size={16} />
                        <span>El programa se desarrollara en las instalaciones del colegio.</span>
                      </div>
                      <button
                        className="padres-program-detail-button"
                        type="button"
                        onClick={() => setInfoProgramaAbierta(true)}
                      >
                        <Info size={14} />
                        <span>Informacion</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="padres-empty">
                    <AlertCircle size={22} />
                    <strong>Sin programa asignado</strong>
                    <p>Aun no hay invitacion ni inscripcion extracurricular vinculada a este estudiante.</p>
                  </div>
                )}
              </article>

            </section>

            <article className="padres-panel padres-student-panel">
              <div className="padres-student-head">
                <div className="padres-avatar">{iniciales}</div>
                <div>
                  <h2>{nombreCorto}</h2>
                  <p>{estudiante.grado} - {estudiante.seccion}</p>
                </div>
              </div>

              <div className="padres-info-grid">
                <Dato label="Grado y seccion" value={`${estudiante.grado} ${estudiante.seccion}`} />
                <Dato label="Codigo interno" value={estudiante.codigoEstudiante || "Registrado"} />
                <Dato label="Nombre del padre" value={form.apoderado || "Por registrar"} />
                <Dato label="Telefono" value={form.telefono || "Por registrar"} />
              </div>

              <form className="padres-confirm-card" onSubmit={guardarDatos}>
                <h3>Confirmacion de datos del apoderado</h3>

                <div className="padres-form-grid">
                  <Campo
                    label="N. del padre/apoderado"
                    value={form.apoderado}
                    onChange={(value) => actualizar("apoderado", value)}
                    placeholder="Nombre completo"
                  />
                  <Campo
                    label="Telefono WhatsApp"
                    value={form.telefono}
                    onChange={(value) => actualizar("telefono", value.replace(/\D/g, "").slice(0, 9))}
                    placeholder="987654321"
                    inputMode="numeric"
                  />
                  <Campo
                    label="Correo opcional"
                    value={form.correo}
                    onChange={(value) => actualizar("correo", value)}
                    placeholder="correo@ejemplo.com"
                  />
                  <label className="padres-field">
                    <span>Medio de envio</span>
                    <select value={form.medioEnvio} onChange={(event) => actualizar("medioEnvio", event.target.value)}>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Correo">Correo</option>
                      <option value="Presencial">Presencial</option>
                    </select>
                  </label>
                </div>

                <label className="padres-check">
                  <input
                    type="checkbox"
                    checked={form.acepta}
                    onChange={(event) => actualizar("acepta", event.target.checked)}
                  />
                  Confirmo que los datos son correctos y acepto recibir informacion del taller por el medio seleccionado.
                </label>

                <button className="padres-primary-button" type="submit" disabled={guardando}>
                  {guardando ? <Loader2 className="padres-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Guardar datos
                </button>
              </form>
            </article>

            {mostrarCatalogoProgramas ? (
            <article className="padres-panel padres-programs-coordination-panel">
              <div className="padres-section-title">
                <div>
                  <h2>Cursos disponibles para solicitar</h2>
                  <p>Estos programas se muestran solo cuando el estudiante no tiene una invitacion asignada.</p>
                </div>
              </div>

              {cargandoProgramas ? (
                <div className="padres-inline-loading">
                  <Loader2 className="padres-spin" size={22} />
                  <span>Cargando programas...</span>
                </div>
              ) : programasDisponibles.length > 0 ? (
                <div className="padres-programs-list">
                  {programasDisponibles.map((prog) => (
                    <Card key={prog.id} className="padres-course-card" shadow="sm" padding="md" radius="md" withBorder>
                      <Card.Section withBorder inheritPadding py="md">
                        <Group justify="space-between">
                          <Text fw={700} size="sm">{prog.nombre}</Text>
                          <Badge color="green" variant="light" size="sm">Disponible</Badge>
                        </Group>
                      </Card.Section>

                      <Stack gap="xs">
                        <Group justify="space-between" grow>
                          <div>
                            <Text size="xs" c="dimmed">Categoria</Text>
                            <Text size="sm" fw={600}>{prog.categoria || "N/A"}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Horario</Text>
                            <Text size="sm" fw={600}>{prog.horario}</Text>
                          </div>
                        </Group>

                        <Group justify="space-between" grow>
                          <div>
                            <Text size="xs" c="dimmed">Periodo</Text>
                            <Text size="sm" fw={600}>{prog.periodo}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Cupos</Text>
                            <Text size="sm" fw={600}>{prog.cuposDisponibles} / {prog.cupos}</Text>
                          </div>
                        </Group>

                        <Group justify="space-between" grow>
                          <div>
                            <Text size="xs" c="dimmed">Monto</Text>
                            <Text size="sm" fw={600}>{formatearSoles(prog.costo)}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Responsable</Text>
                            <Text size="sm" fw={600}>{prog.responsable}</Text>
                          </div>
                        </Group>
                      </Stack>
                      <button
                        className="padres-primary-button padres-course-register"
                        type="button"
                        disabled={guardando && programaSeleccionadoId === prog.id}
                        onClick={() => solicitarInscripcionPadres(prog.id)}
                      >
                        {guardando && programaSeleccionadoId === prog.id ? <Loader2 className="padres-spin" size={16} /> : <CheckCircle2 size={16} />}
                        Registrarse
                      </button>
                    </Card>
                  ))}
                </div>
              ) : (
                <Center py={40}>
                  <Stack align="center" gap="md">
                    <AlertCircle size={32} color="#adb5bd" />
                    <div style={{ textAlign: "center" }}>
                      <Text fw={600} size="sm">Sin cursos disponibles</Text>
                      <Text c="dimmed" size="sm">No hay cursos habilitados con cupos para registro web en este momento.</Text>
                    </div>
                  </Stack>
                </Center>
              )}
            </article>
            ) : null}
          </section>
        )}
      </main>

      {infoProgramaAbierta && programa ? (
        <div className="padres-modal-backdrop" role="presentation">
          <section className="padres-info-modal" role="dialog" aria-modal="true" aria-labelledby="padres-info-title">
            <header className="padres-info-modal-head">
              <div>
                <span>Comunicado para el apoderado</span>
                <h2 id="padres-info-title">Informacion del programa</h2>
              </div>
              <button type="button" onClick={() => setInfoProgramaAbierta(false)} aria-label="Cerrar informacion">
                <X size={18} />
              </button>
            </header>

            <div className="padres-comunicado-box">
              <div className="padres-comunicado-intro">
                <strong>{programa.programa}</strong>
                <TextoBloque texto={programa.comunicado || `Invitacion dirigida a la familia de ${estudiante.nombres}. Revise los datos principales del taller antes de confirmar el pago.`} />
              </div>

              <div className="padres-comunicado-grid">
                <Dato label="Estudiante" value={`${estudiante.nombres} - ${estudiante.grado} ${estudiante.seccion}`} />
                <Dato label="Docente" value={programa.docente || programa.responsable || "Por definir"} />
                <Dato label="Horario" value={programa.horario || "Por confirmar"} />
                <Dato label="Vigencia" value={`${formatearFechaPeru(programa.fechaInicio, "Por definir")} al ${formatearFechaPeru(programa.fechaFin, "Por definir")}`} />
                <Dato label="Costo" value={formatearSoles(programa.costo)} />
                <Dato label="Estado" value={inscripcion?.estadoInscripcion || (invitacion ? "Invitacion pendiente" : "Sin registro")} />
              </div>

              <div className="padres-comunicado-section">
                <strong>Costo</strong>
                <TextoBloque texto={programa.detalleCosto || `Pago registrado: ${formatearSoles(programa.costo)}.`} />
              </div>

              <div className="padres-comunicado-section">
                <strong>Requisitos</strong>
                <TextoBloque texto={programa.requisitos || "Asistencia continua, puntualidad y materiales solicitados por el docente."} />
              </div>

              {programa.detalleAlmuerzo ? (
                <div className="padres-comunicado-section">
                  <strong>Almuerzo</strong>
                  <TextoBloque texto={programa.detalleAlmuerzo} />
                </div>
              ) : null}

              {programa.concesionarios ? (
                <div className="padres-comunicado-section">
                  <strong>Concesionarios autorizados</strong>
                  <TextoBloque texto={programa.concesionarios} />
                </div>
              ) : null}

              <div className="padres-comunicado-section">
                <strong>Despues del pago</strong>
                <TextoBloque texto={`Cuando Caja valide o cancele el pago, se enviara el comunicado y la confirmacion al WhatsApp del apoderado: ${form.telefono || "por registrar"}.`} />
              </div>
            </div>

            <label className="padres-info-accept">
              <input
                type="checkbox"
                checked={infoProgramaAceptada}
                onChange={(event) => setInfoProgramaAceptada(event.target.checked)}
              />
              <span>He leido y acepto la informacion del programa antes de continuar con el pago.</span>
            </label>

            <footer className="padres-info-modal-actions">
              <button className="padres-outline-button" type="button" onClick={() => setInfoProgramaAbierta(false)}>
                Revisar luego
              </button>
              <button className="padres-orange-button" type="button" onClick={continuarPago} disabled={!infoProgramaAceptada}>
                <CreditCard size={15} />
                Continuar al pago
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      <AsistentePadres
        abierto={asistenteAbierto}
        setAbierto={setAsistenteAbierto}
        mensajes={mensajes}
        consulta={consulta}
        setConsulta={setConsulta}
        preguntar={preguntar}
      />
    </div>
  );
}

function Dato({ label, value }) {
  return (
    <div className="padres-data-box">
      <span>{label}</span>
      <strong>{value || "No registrado"}</strong>
    </div>
  );
}

function TextoBloque({ texto }) {
  return (
    <>
      {String(texto || "")
        .split(/\n+/)
        .map((linea) => linea.trim())
        .filter(Boolean)
        .map((linea, index) => <p key={`${linea}-${index}`}>{linea}</p>)}
    </>
  );
}

function Campo({ label, value, onChange, placeholder, inputMode }) {
  return (
    <label className="padres-field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </label>
  );
}

function ProgramaDato({ icon, label, value, chip }) {
  return (
    <div>
      {icon ? <span className="padres-program-data-icon">{icon}</span> : null}
      <dt>{label}:</dt>
      <dd className={chip ? "padres-payment-chip" : ""}>{value || "No registrado"}</dd>
    </div>
  );
}

function AsistentePadres({ abierto, setAbierto, mensajes, consulta, setConsulta, preguntar }) {
  if (!abierto) {
    return (
      <button className="padres-assistant-fab" type="button" onClick={() => setAbierto(true)}>
        <MessageCircle size={20} />
        Rafael
      </button>
    );
  }

  const accesos = ["Ver programa", "Monto a pagar", "Ver horario", "Descargar ficha", "Estado del pago", "Ver QR"];

  return (
    <aside className="padres-assistant">
      <header>
        <div className="padres-rafael-header">
          <div className="padres-rafael-avatar">R</div>
          <div>
            <strong>Rafael</strong>
            <span>Asistente de San Rafael</span>
          </div>
        </div>
        <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar Rafael">
          <X size={18} />
        </button>
      </header>

      <div className="padres-assistant-body">
        {mensajes.map((mensaje, index) => (
          <div key={`${mensaje.autor}-${index}`} className={`padres-chat padres-chat-${mensaje.autor}`}>
            {mensaje.autor === "bot" ? <div className="padres-bot-avatar">R</div> : null}
            <p>{mensaje.texto}</p>
          </div>
        ))}
      </div>

      <div className="padres-assistant-shortcuts">
        {accesos.map((texto) => (
          <button key={texto} type="button" onClick={() => preguntar(texto)}>
            {texto}
          </button>
        ))}
      </div>

      <form className="padres-assistant-form" onSubmit={(event) => { event.preventDefault(); preguntar(); }}>
        <input
          value={consulta}
          onChange={(event) => setConsulta(event.target.value)}
          placeholder="Pregunta a Rafael..."
        />
        <button type="submit">
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
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
