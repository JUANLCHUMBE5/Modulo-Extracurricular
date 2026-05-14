import { CheckCircle2 } from "lucide-react";

function ProcesoItem({ activo, completado, texto }) {
  return (
    <div className={`secretaria-process-item ${activo ? "is-active" : ""} ${completado ? "is-complete" : ""}`}>
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

function DatoHorario({ label, value }) {
  return (
    <div className="secretaria-schedule-item">
      <span>{label}</span>
      <strong>{value || "No definido"}</strong>
    </div>
  );
}

function resumirHorarioSecretaria(horario) {
  const texto = String(horario || "");
  const dia = texto.match(/(?:^|:\s*)(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)/i)?.[1]
    || texto.match(/\b(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\b/i)?.[1]
    || "";
  const clase = texto.match(/clase\s+([^,·/]+)/i)?.[1]?.trim() || "";
  const almuerzo = texto.match(/almuerzo\s+([^,·/]+)/i)?.[1]?.trim() || "";
  return {
    dia,
    clase,
    almuerzo,
  };
}

function formatearCuposSecretaria(programa) {
  if (!programa) return "";
  if (Number.isFinite(Number(programa.cuposDisponibles))) return String(programa.cuposDisponibles);
  const match = String(programa.cupos || "").match(/\d+/);
  return match?.[0] || programa.cupos || "";
}

export {
  ProcesoItem,
  CampoTexto,
  CampoLectura,
  DatoHorario,
  resumirHorarioSecretaria,
  formatearCuposSecretaria,
};
