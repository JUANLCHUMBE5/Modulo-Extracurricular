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

export { resolverHorarioPorGradoLocal };
