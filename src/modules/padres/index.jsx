import { Alert, Group, Stack, Card, Badge, Text, Center, Loader } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconBook as BookOpen,
  IconCalendar as CalendarDays,
  IconCircleCheck as CheckCircle2,
  IconCreditCard as CreditCard,
  IconInfoCircle as Info,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconUserCircle as UserRound,
  IconX as X,
} from "@tabler/icons-react";
import { formatearFechaPeru } from "../../services/dateService";
import AsistentePadres from "./components/AsistentePadres";
import Campo from "./components/Campo";
import Dato from "./components/Dato";
import ProgramaDato from "./components/ProgramaDato";
import usePadres, { formatearSoles } from "./hooks/usePadres";
import "./Padres.css";

export default function Padres({ user, onLogout }) {
  const {
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
  } = usePadres(user);
  const comunicadoPadres = prepararComunicadoPadres(programa, estudiante);
  const invitacionPendiente = Boolean(invitacion && !inscripcion);
  const montoVisible = Boolean(inscripcion && infoProgramaAceptada);
  const debeRevisarAntesDePagar = Boolean(inscripcion && !infoProgramaAceptada);
  const pasoVisible = debeRevisarAntesDePagar
    ? {
        titulo: "Informacion pendiente",
        detalle: "Revise y acepte el comunicado del programa antes de mostrar el monto de pago.",
      }
    : siguientePaso;

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
              <span>Cerrar sesion</span>
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
              {bannerEstudiante ? (
                <div className="padres-hero-art" aria-hidden="true">
                  <img src={bannerEstudiante} alt="" />
                </div>
              ) : null}
            </article>

            <section className="padres-left-column">
              <article className="padres-panel padres-payment-panel">
                <div className="padres-payment-icon">
                  <CreditCard size={24} />
                </div>
                <div className="padres-payment-status">
                  <span>Estado actual</span>
                  <h2>{pasoVisible.titulo}</h2>
                  <p>{pasoVisible.detalle}</p>
                  <button className="padres-outline-button" type="button" onClick={() => consultarRafael("Que debo hacer ahora")}>
                    Ver detalles del estado
                  </button>
                </div>
                <div className="padres-payment-amount">
                  <span>Monto pendiente</span>
                  <strong>{montoVisible && programa ? formatearSoles(programa.costo) : "S/ 0.00"}</strong>
                  <button
                    className="padres-orange-button"
                    type="button"
                    disabled={guardando}
                    onClick={invitacionPendiente && infoProgramaAceptada ? () => solicitarInscripcionPadres() : abrirPago}
                  >
                    {guardando ? <Loader2 className="padres-spin" size={15} /> : <CreditCard size={15} />}
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
                      <ProgramaDato icon={<CalendarDays size={16} />} label="Vigencia" value={formatearRangoFechasPadres(programa.fechaInicio, programa.fechaFin)} />
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
                        <span>{invitacionPendiente ? "Comunicado" : "Más Informacion"}</span>
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
                            <HorarioProgramaPadres horario={prog.horario} />
                          </div>
                        </Group>

                        <Group justify="space-between" grow>
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
                      <Text c="dimmed" size="sm">No hay cursos disponibles para el grado del estudiante en este momento.</Text>
                    </div>
                  </Stack>
                </Center>
              )}
            </article>
            ) : null}

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
                    label="N. del padre o madre"
                    value={form.apoderado}
                    onChange={(value) => actualizar("apoderado", value)}
                    placeholder="Nombre completo"
                    disabled={apoderadoBloqueado}
                  />
                  <Campo
                    label="Telefono de contacto"
                    value={form.telefono}
                    onChange={(value) => actualizar("telefono", value.replace(/\D/g, "").slice(0, 9))}
                    placeholder="987654321"
                    inputMode="numeric"
                  />
                  <Campo
                    label="Correo para recibir el PDF (Opcional)"
                    value={form.correo}
                    onChange={(value) => actualizar("correo", value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <label className="padres-check">
                  <input
                    type="checkbox"
                    checked={form.acepta}
                    onChange={(event) => actualizar("acepta", event.target.checked)}
                  />
                  Confirmo que los datos son correctos.
                </label>

                <label className="padres-check">
                  <input
                    type="checkbox"
                    checked={Boolean(form.correo.trim()) && form.enviarPdfCorreo}
                    disabled={!form.correo.trim()}
                    onChange={(event) => actualizar("enviarPdfCorreo", event.target.checked)}
                  />
                  {form.correo.trim()
                    ? "Enviar al correo cuando el pago sea confirmado."
                    : "Sin correo registrado: podra descargar el PDF despues del pago."}
                </label>

                <button className="padres-primary-button" type="submit" disabled={guardando}>
                  {guardando ? <Loader2 className="padres-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Guardar datos
                </button>
              </form>
            </article>


          </section>
        )}
      </main>

      {infoProgramaAbierta && programa ? (
        <div className="padres-modal-backdrop" role="presentation">
          <section className="padres-info-modal" role="dialog" aria-modal="true" aria-labelledby="padres-info-title">
            <header className="padres-info-modal-head">
              <div>
                <span>Comunicado para el apoderado</span>
                <h2 id="padres-info-title">{programa.programa}</h2>
              </div>
              <button type="button" onClick={() => setInfoProgramaAbierta(false)} aria-label="Cerrar informacion">
                <X size={18} />
              </button>
            </header>

            <div className="padres-comunicado-box">
              <div className="padres-comunicado-letter">
                <span>Comunicado</span>
                {comunicadoPadres.fecha ? <p>{comunicadoPadres.fecha}</p> : null}
                {comunicadoPadres.parrafos.map((parrafo) => (
                  <p key={parrafo}>{parrafo}</p>
                ))}
              </div>

              <div className="padres-comunicado-section">
                <div className="padres-comunicado-section-title">
                  <strong>Indicaciones para la familia</strong>
                  <span>Lo necesario antes de confirmar.</span>
                </div>
                <ul className="padres-info-list">
                  <li>El estudiante debe asistir de forma continua y puntual al horario indicado.</li>
                  <li>Debe mantener el orden y la disciplina durante el programa.</li>
                  <li>Debe llevar los materiales solicitados por el docente.</li>
                  <li>Si lleva almuerzo, la lonchera debe estar rotulada con nombre, grado y seccion.</li>
                </ul>
              </div>

              <div className="padres-comunicado-section padres-lunch-section">
                <div className="padres-comunicado-section-title">
                  <strong>Almuerzo</strong>
                  <span>Recepcion y concesionarios autorizados.</span>
                </div>
                <p>
                  El colegio cuenta con un area para recibir almuerzos. Deben dejarse de 01:20 a 01:45 p.m.
                  La lonchera debe tener una etiqueta grande con nombre del alumno, grado y seccion.
                </p>
                <div className="padres-lunch-vendors">
                  <div>
                    <span>Cafetin Los Amigos del recreo</span>
                    <strong>Sra. Rocio</strong>
                    <p>976280197</p>
                  </div>
                  <div>
                    <span>Cafetin Edith</span>
                    <strong>Sra. Deysli</strong>
                    <p>960897529</p>
                  </div>
                </div>
                <p>
                  Estos concesionarios estan autorizados por la institucion y cumplen con los protocolos correspondientes
                  segun las disposiciones del MINSA.
                </p>
              </div>

              <div className="padres-comunicado-steps" aria-label="Proceso del programa">
                
              </div>
            </div>

            <label className="padres-info-accept">
              <input
                type="checkbox"
                checked={infoProgramaAceptada}
                onChange={(event) => setInfoProgramaAceptada(event.target.checked)}
              />
              <span>
                {invitacionPendiente
                  ? "He leido y acepto la informacion del programa antes de registrar la inscripcion."
                  : "He leido y acepto la informacion del programa antes de continuar con el pago."}
              </span>
            </label>

            <footer className="padres-info-modal-actions">
              <button className="padres-outline-button" type="button" onClick={() => setInfoProgramaAbierta(false)}>
                Revisar luego
              </button>
              <button className="padres-orange-button" type="button" onClick={continuarPago} disabled={!infoProgramaAceptada || guardando}>
                {guardando ? <Loader2 className="padres-spin" size={15} /> : invitacionPendiente ? <CheckCircle2 size={15} /> : <CreditCard size={15} />}
                {invitacionPendiente ? "Registrar inscripcion" : "Continuar al pago"}
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

function HorarioProgramaPadres({ horario }) {
  const datos = dividirHorarioPadres(horario);
  if (!datos) return <Text size="sm" fw={600}>{horario || "Por confirmar"}</Text>;

  return (
    <div className="padres-schedule-box">
      <strong>{datos.grados}</strong>
      <div className="padres-schedule-pills">
        <span>{datos.dia}</span>
        <span>Almuerzo: {datos.almuerzo}</span>
        <span>Clase: {datos.clase}</span>
      </div>
    </div>
  );
}

function prepararComunicadoPadres(programa, estudiante) {
  const titulo = programa?.programa || programa?.nombre || "Comunicado del programa";
  const fecha = programa?.fechaInicio
    ? `Carabayllo, ${formatearFechaPeru(programa.fechaInicio, "Por definir")}`
    : "";
  const area = obtenerAreaPrograma(programa?.area || titulo);
  const alumno = estudiante?.nombres || "el estudiante";
  const textoWord = limpiarComunicadoWord(programa?.comunicado || "", { area, programa: titulo, alumno });
  const parrafos = textoWord
    ? textoWord.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean)
    : [`Coordinacion aun no registro un comunicado en la plantilla Word para ${alumno}.`];

  return { titulo, fecha, parrafos };
}

function formatearRangoFechasPadres(inicio, fin) {
  const fechaInicio = crearFechaLocal(inicio);
  const fechaFin = crearFechaLocal(fin);
  if (!fechaInicio && !fechaFin) return "Por definir";
  if (!fechaInicio) return formatearFechaLetrasPadres(fechaFin, { incluirAnio: true });
  if (!fechaFin) return formatearFechaLetrasPadres(fechaInicio, { incluirAnio: true });

  const mismoAnio = fechaInicio.getFullYear() === fechaFin.getFullYear();
  const inicioTexto = formatearFechaLetrasPadres(fechaInicio, { incluirAnio: !mismoAnio });
  const finTexto = formatearFechaLetrasPadres(fechaFin, { incluirAnio: true, usarDeAnio: mismoAnio });
  return `Del ${inicioTexto} al ${finTexto}`;
}

function formatearFechaLetrasPadres(fecha, { incluirAnio = true, usarDeAnio = true } = {}) {
  if (!fecha) return "";
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const base = `${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
  if (!incluirAnio) return base;
  return `${base}${usarDeAnio ? " de" : ""} ${fecha.getFullYear()}`;
}

function crearFechaLocal(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;

  const texto = String(valor);
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (partes) {
    const fecha = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function dividirHorarioPadres(horario) {
  const texto = String(horario || "").trim();
  const partes = texto.match(/^(.+?):\s*([^,]+?)\s+almuerzo\s+([^,]+),\s*clase\s+(.+)$/i);
  if (!partes) return null;
  return {
    grados: partes[1].trim(),
    dia: partes[2].trim(),
    almuerzo: partes[3].trim(),
    clase: partes[4].trim(),
  };
}

function obtenerAreaPrograma(valor) {
  const texto = repararTexto(String(valor || "").trim());
  if (!texto) return "reforzamiento";
  const sinClub = texto.replace(/^club\s+de\s+tareas\s*/i, "").trim();
  return sinClub || texto;
}

function limpiarComunicadoWord(texto, datos) {
  return repararTexto(texto)
    .replace(/\{\{\s*TITULO\s*\}\}/gi, datos.programa)
    .replace(/\{\{\s*FECHA\s*\}\}/gi, "")
    .replace(/\{\{\s*AREA\s*\}\}/gi, datos.area)
    .replace(/\{\{\s*PROG\s*\}\}/gi, datos.programa)
    .replace(/\barea de\s*,/gi, `area de ${datos.area},`)
    .replace(/\barea de\s+hemos/gi, `area de ${datos.area}, hemos`)
    .replace(/\baula\s*,/gi, `aula ${datos.programa},`)
    .replace(/\baula\s+la cual/gi, `aula ${datos.programa}, la cual`)
    .replace(/\d{10,}\s*:\s*Del\s+al\s*\./gi, "")
    .replace(/\s+([,.])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function repararTexto(texto) {
  return String(texto || "")
    .replace(/MatemÃ¡tico/g, "Matematico")
    .replace(/DirecciÃ³n/g, "Direccion")
    .replace(/estÃ¡/g, "esta")
    .replace(/aquÃ­/g, "aqui")
    .replace(/explicaciÃ³n/g, "explicacion")
    .replace(/resoluciÃ³n/g, "resolucion")
    .replace(/Ã¡rea/g, "area")
    .replace(/distribuciÃ³n/g, "distribucion")
    .replace(/InstituciÃ³n/g, "Institucion")
    .replace(/CoordinaciÃ³n/g, "Coordinacion");
}
