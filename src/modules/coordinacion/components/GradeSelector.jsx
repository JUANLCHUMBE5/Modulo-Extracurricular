function GradeSelector({ niveles, seleccionados, onToggle }) {
  return (
    <div className="coord-grade-selector">
      {niveles.map(({ nivel, grados }) => (
        <details className="coord-grade-group" key={nivel} open={nivel === "Primaria"}>
          <summary>
            <span>{nivel}</span>
            <strong>{seleccionados.filter((item) => item.startsWith(`${nivel}:`)).length}</strong>
          </summary>
          <div className="coord-grade-options">
            {grados.map((grado) => {
              const valor = `${nivel}:${grado}`;
              const seleccionado = seleccionados.includes(valor);
              return (
                <label
                  className={`coord-grade-chip ${seleccionado ? "is-selected" : ""}`}
                  key={valor}
                >
                  <input
                    type="checkbox"
                    checked={seleccionado}
                    onChange={() => onToggle(valor)}
                  />
                  <span>{etiquetaGradoCorta(grado)}</span>
                </label>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}

function etiquetaGradoCorta(grado) {
  return String(grado || "").replace(/\s*años?/i, "").trim();
}

export default GradeSelector;
