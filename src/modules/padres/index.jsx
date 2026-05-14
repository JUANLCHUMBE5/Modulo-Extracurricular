import { Alert, Group, Stack, Card, Badge, Text, Center, Loader } from "@mantine/core";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Info,
  Loader2,
  LogOut,
  UserRound,
  X,
} from "lucide-react";
import { formatearFechaPeru } from "../../services/dateService";
import AsistentePadres from "./components/AsistentePadres";
import Campo from "./components/Campo";
import Dato from "./components/Dato";
import ProgramaDato from "./components/ProgramaDato";
import TextoBloque from "./components/TextoBloque";
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
                <Dato label="Estado" value={inscripcion?.estadoInscripcion || (invitacion ? "InvitaciÃ³n pendiente" : "Sin registro")} />
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



