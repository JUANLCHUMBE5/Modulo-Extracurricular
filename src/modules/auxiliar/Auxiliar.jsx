import { useState } from "react";
import { 
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconQrcode as QrCode,
  IconSearch as Search,
  IconShieldExclamation as ShieldAlert,
  IconUserCheck as UserCheck,
  IconXboxX as XCircle,
} from "@tabler/icons-react";
import { Alert as MantineAlert } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { validarDni, validarQR, registrarAsistencia } from "./auxiliarService";
import "./Auxiliar.css";

export default function Auxiliar({ onLogout }) {
  const [modo, setModo] = useState("DNI"); // "DNI" o "QR"
  const [inputValue, setInputValue] = useState("");
  const [cargando, setCargando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [estudiante, setEstudiante] = useState(null);
  const [observacion, setObservacion] = useState("");

  const mostrarMsg = (texto, tipo = "error") => {
    notifications.show({
      color: tipo === "success" ? "teal" : "orange",
      title: tipo === "success" ? "Asistencia" : "Atención",
      message: texto,
    });
  };

  const handleBuscar = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      return mostrarMsg(`Ingrese un ${modo === "DNI" ? "DNI" : "Código QR"} válido.`);
    }
    if (modo === "DNI" && !/^\d{8}$/.test(inputValue)) {
      return mostrarMsg("Por seguridad, el DNI debe contener exactamente 8 números.");
    }

    setCargando(true);
    setEstudiante(null);
    setObservacion("");
    
    try {
      const data = modo === "DNI" 
        ? await validarDni(inputValue) 
        : await validarQR(inputValue);
      setEstudiante(data);
      mostrarMsg("Datos del estudiante recuperados.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setCargando(false);
  };

  const handleRegistrar = async () => {
    if (!estudiante) return;
    
    // Seguridad: No registrar asistencia sin pago validado
    if (estudiante.estadoPago !== "Validado") {
      return mostrarMsg("No se puede registrar el ingreso. El pago no está validado por Caja.");
    }

    setRegistrando(true);
    try {
      await registrarAsistencia(estudiante.dni, observacion);
      mostrarMsg(`Ingreso registrado correctamente para ${estudiante.nombres}.`, "success");
      setEstudiante(null);
      setInputValue("");
      setObservacion("");
    } catch (err) {
      mostrarMsg(err.message);
    }
    setRegistrando(false);
  };

  return (
    <div className="auxiliar-layout">
      <main className="auxiliar-main">
        <header className="auxiliar-topbar">
          <div className="auxiliar-topbar-copy">
            <span>Panel de Auxiliar</span>
            <h1>Control de Ingreso y Asistencia</h1>
          </div>
          <button className="auxiliar-secondary-button" type="button" onClick={onLogout}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </header>

        <section className="auxiliar-workspace">
          <article className="auxiliar-card">
            <div className="auxiliar-card-title">
              <span className="auxiliar-title-icon"><UserCheck size={24} /></span>
              <div>
                <h2>Validación de Estudiantes</h2>
                <p>Escanee el código QR o ingrese el DNI para verificar el acceso.</p>
              </div>
            </div>

            <div className="auxiliar-tabs">
              <button className={`auxiliar-tab ${modo === "DNI" ? "active" : ""}`} onClick={() => setModo("DNI")}>
                <Search size={18} /> Búsqueda por DNI
              </button>
              <button className={`auxiliar-tab ${modo === "QR" ? "active" : ""}`} onClick={() => setModo("QR")}>
                <QrCode size={18} /> Escanear QR
              </button>
            </div>

            <form className="auxiliar-form" onSubmit={handleBuscar}>
              <div className="auxiliar-field">
                <label>{modo === "DNI" ? "DNI del estudiante *" : "Código QR *"}</label>
                <div className="auxiliar-input-group">
                  <input 
                    placeholder={modo === "DNI" ? "Ej: 12345678" : "Haga clic aquí y escanee el código..."}
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)} 
                    autoFocus
                  />
                  <button type="submit" className="auxiliar-primary-button" disabled={cargando}>
                    {cargando ? <Loader2 className="auxiliar-spin" size={20} /> : <Search size={20} />}
                    Validar
                  </button>
                </div>
              </div>
            </form>

            {estudiante && (
              <div className={`auxiliar-result-box ${estudiante.estadoPago === "Validado" ? "status-valid" : "status-invalid"}`}>
                <h3>Resultado de la validación</h3>
                <div className="auxiliar-info-grid">
                  <div className="auxiliar-info-item">
                    <span className="auxiliar-info-label">Estudiante</span>
                    <span className="auxiliar-info-value">{estudiante.nombres}</span>
                  </div>
                  <div className="auxiliar-info-item">
                    <span className="auxiliar-info-label">Programa</span>
                    <span className="auxiliar-info-value">{estudiante.programa}</span>
                  </div>
                  <div className="auxiliar-info-item">
                    <span className="auxiliar-info-label">Horario</span>
                    <span className="auxiliar-info-value">{estudiante.horario}</span>
                  </div>
                  <div className="auxiliar-info-item">
                    <span className="auxiliar-info-label">Estado de Pago</span>
                    <span className={`status-badge ${estudiante.estadoPago === "Validado" ? "ok" : "error"}`}>
                      {estudiante.estadoPago}
                    </span>
                  </div>
                </div>

                <div className="auxiliar-field">
                  <label>Observación (Opcional)</label>
                  <textarea placeholder="Ej: Ingresó 10 min tarde..." value={observacion} onChange={e => setObservacion(e.target.value)} rows={2} />
                </div>

                <button className="auxiliar-success-button" onClick={handleRegistrar} disabled={registrando || estudiante.estadoPago !== "Validado"}>
                  {registrando ? <Loader2 className="auxiliar-spin" size={20} /> : <CheckCircle2 size={20} />} Registrar Ingreso
                </button>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
