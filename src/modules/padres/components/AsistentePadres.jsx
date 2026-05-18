import {
  IconMessageCircle as MessageCircle,
  IconSend as Send,
  IconX as X,
} from "@tabler/icons-react";

const accesos = ["Ver programa", "Monto a pagar", "Ver horario", "Descargar ficha", "Estado del pago", "Ver QR"];

function AsistentePadres({ abierto, setAbierto, mensajes, consulta, setConsulta, preguntar }) {
  if (!abierto) {
    return (
      <button className="padres-assistant-fab" type="button" onClick={() => setAbierto(true)}>
        <MessageCircle size={20} />
        Rafael
      </button>
    );
  }

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

export default AsistentePadres;
