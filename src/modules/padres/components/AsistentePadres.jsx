import { useEffect, useRef } from "react";
import {
  IconBook as BookOpen,
  IconCalendar as CalendarDays,
  IconCircleCheck as CheckCircle2,
  IconCreditCard as CreditCard,
  IconFileText as FileText,
  IconHelpCircle as HelpCircle,
  IconMessageCircle as MessageCircle,
  IconSend as Send,
  IconSparkles as Sparkles,
  IconX as X,
} from "@tabler/icons-react";

const accesos = [
  { texto: "Ver programa", icon: BookOpen },
  { texto: "Monto a pagar", icon: CreditCard },
  { texto: "Ver horario", icon: CalendarDays },
  { texto: "Estado del pago", icon: CheckCircle2 },
  { texto: "Descargar ficha", icon: FileText },
  { texto: "Que debo hacer ahora", icon: HelpCircle },
];

function AsistentePadres({ abierto, setAbierto, mensajes, consulta, setConsulta, preguntar }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!abierto || !bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [abierto, mensajes]);

  const consultaLista = consulta.trim().length > 0;

  if (!abierto) {
    return (
      <button className="padres-assistant-fab" type="button" onClick={() => setAbierto(true)}>
        <MessageCircle size={20} />
        <span>Ayuda</span>
      </button>
    );
  }

  return (
    <aside className="padres-assistant">
      <header>
        <div className="padres-rafael-header">
          <div className="padres-rafael-avatar">
            <Sparkles size={19} />
          </div>
          <div>
            <strong>Rafael</strong>
            <span><i /> Asistente del portal</span>
          </div>
        </div>
        <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar Rafael">
          <X size={18} />
        </button>
      </header>

      <div className="padres-assistant-body" ref={bodyRef}>
        {mensajes.map((mensaje, index) => (
          <div key={`${mensaje.autor}-${index}`} className={`padres-chat padres-chat-${mensaje.autor}`}>
            {mensaje.autor === "bot" ? (
              <div className="padres-bot-avatar">
                <Sparkles size={14} />
              </div>
            ) : null}
            <p>{mensaje.texto}</p>
          </div>
        ))}
      </div>

      <div className="padres-assistant-shortcuts">
        <span>Consultas rápidas</span>
        <div>
          {accesos.map(({ texto, icon: Icono }) => (
            <button key={texto} type="button" onClick={() => preguntar(texto)}>
              <Icono size={14} />
              {texto}
            </button>
          ))}
        </div>
      </div>

      <form
        className="padres-assistant-form"
        onSubmit={(event) => {
          event.preventDefault();
          preguntar();
        }}
      >
        <input
          value={consulta}
          onChange={(event) => setConsulta(event.target.value)}
          placeholder="Escriba su consulta..."
        />
        <button type="submit" disabled={!consultaLista} aria-label="Enviar consulta">
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}

export default AsistentePadres;
