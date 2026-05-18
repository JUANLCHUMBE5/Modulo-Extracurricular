import { useId, useState } from "react";
import {
  IconBook as BookOpen,
  IconFileText as FileText,
  IconX as X,
} from "@tabler/icons-react";

function TemplateUploadField({
  plantillaInputKey,
  form,
  programas,
  variablesPlantillaRequeridas,
  onSelect,
  onRemove,
  onAutoFill,
  onUseExisting,
  modoDocumentos = false,
}) {
  const inputId = useId();
  const [programaPlantilla, setProgramaPlantilla] = useState("");
  const plantillasDisponibles = programas.filter((programa) =>
    programa.id !== form.id && programa.plantilla && programa.plantillaBase64 && programa.plantillaValidada
  );

  function aplicarPlantillaExistente() {
    if (!programaPlantilla) return;
    onUseExisting(programaPlantilla);
    setProgramaPlantilla("");
  }

  return (
    <div className="coord-field coord-field-full">
      <div className="coord-template-compact-row">
        <div className="coord-template-file-control">
          <label>{modoDocumentos ? "Subir documento Word" : "Documento Word"}</label>
          <div className="coord-template-file-row">
            <input
              id={inputId}
              className="coord-template-file"
              key={plantillaInputKey}
              type="file"
              accept=".docx"
              onChange={onSelect}
            />
            <label className="coord-template-file-button" htmlFor={inputId}>
              {form.plantilla ? "Cambiar Word" : "Seleccionar Word"}
            </label>
            <div className="coord-template-file-name">
              <FileText size={16} />
              <span title={form.plantilla || ""}>{form.plantilla || "Sin documento seleccionado"}</span>
            </div>
            {form.plantilla ? (
              <>
                <span className={`coord-pill ${form.plantillaValidada ? "coord-pill-success" : "coord-pill-error"}`}>
                  {form.plantillaValidada ? "Validada" : "Pendiente"}
                </span>
                <button type="button" className="coord-remove-template-btn" onClick={onRemove}>
                  <X size={14} />
                  <span>Quitar</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {plantillasDisponibles.length && !modoDocumentos ? (
        <div className="coord-template-reuse">
          <label>Usar plantilla de otro programa</label>
          <div className="coord-template-reuse-row">
            <select value={programaPlantilla} onChange={(event) => setProgramaPlantilla(event.target.value)}>
              <option value="">Seleccione un programa</option>
              {plantillasDisponibles.map((programa) => (
                <option key={programa.id} value={programa.id}>
                  {programa.nombre}
                </option>
              ))}
            </select>
            <button type="button" className="coord-template-autofill" onClick={aplicarPlantillaExistente} disabled={!programaPlantilla}>
              Usar plantilla
            </button>
          </div>
        </div>
      ) : null}
      {form.plantillaValidada ? (
        <button type="button" className="coord-template-autofill" onClick={onAutoFill}>
          <BookOpen size={15} />
          <span>{modoDocumentos ? "Volver a leer documento" : "Autocompletar datos desde Word"}</span>
        </button>
      ) : null}
      {form.plantilla && !modoDocumentos ? (
        <div className="coord-template-vars">
          {variablesPlantillaRequeridas.map((variable) => (
            <span
              className={`coord-template-var ${form.plantillaVariables.includes(variable.id) ? "is-ok" : ""}`}
              key={variable.id}
            >
              {variable.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default TemplateUploadField;
