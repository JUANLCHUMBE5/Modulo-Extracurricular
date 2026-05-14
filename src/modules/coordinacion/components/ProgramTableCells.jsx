function HorarioTabla({ programa }) {
  const partes = dividirHorarioTabla(programa?.horario);
  return (
    <div className="coord-table-schedule">
      <strong>{partes.dia || "Por definir"}</strong>
      {partes.almuerzo ? <span>Alm. {partes.almuerzo}</span> : null}
      {partes.clase ? <span>{partes.clase}</span> : null}
    </div>
  );
}

function GradosTabla({ programa }) {
  const grados = programa?.grupo || resumenGradosDesdeValores(programa?.gradosAplicables || []);
  return <span className="coord-table-small-text">{grados || "Por definir"}</span>;
}

function VigenciaTabla({ inicio, fin }) {
  return (
    <div className="coord-table-date">
      <span>{formatearFechaCorta(inicio)}</span>
      <span>al</span>
      <span>{formatearFechaCorta(fin)}</span>
    </div>
  );
}

function CuposTabla({ programa }) {
  return (
    <div className="coord-table-cupos">
      <span>{programa.cuposOcupados || 0}/{programa.cupos || 0}</span>
      <div>
        <i style={{ width: `${calcularPorcentajeCupos(programa)}%` }} />
      </div>
    </div>
  );
}

function dividirHorarioTabla(horario) {
  const texto = String(horario || "").trim();
  const [primero = ""] = texto.split(" / ");
  const match = primero.match(/^(.*?)(?:\s+almuerzo\s+([^,]+))?(?:,\s*clase\s+(.+))?$/i);
  if (!match) return { dia: texto, almuerzo: "", clase: "" };
  const encabezado = (match[1] || texto).trim();
  const dia = encabezado.match(/\b(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\b/i)?.[1] || encabezado;
  return {
    dia,
    almuerzo: (match[2] || "").trim(),
    clase: (match[3] || "").trim(),
  };
}

function resumenGradosDesdeValores(grados) {
  if (!grados.length) return "";
  const niveles = ["Inicial", "Primaria", "Secundaria"];
  return niveles
    .map((nivel) => {
      const items = grados
        .filter((item) => item.startsWith(`${nivel}:`))
        .map((item) => etiquetaGradoCorta(item.split(":")[1]));
      return items.length ? `${nivel}: ${items.join(", ")}` : "";
    })
    .filter(Boolean)
    .join(" / ");
}

function etiquetaGradoCorta(grado) {
  return String(grado || "").replace(/\s*años?/i, "").trim();
}

function formatearFechaCorta(valor) {
  if (!valor) return "Sin fecha";
  const partes = String(valor).split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return valor;
}

function calcularPorcentajeCupos(prog) {
  const cupos = Number(prog.cupos || 0);
  if (cupos <= 0) return 0;
  return Math.min(100, Math.round((Number(prog.cuposOcupados || 0) / cupos) * 100));
}

export { HorarioTabla, GradosTabla, VigenciaTabla, CuposTabla };
