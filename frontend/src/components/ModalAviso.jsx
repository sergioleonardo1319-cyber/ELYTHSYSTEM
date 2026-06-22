import "./ModalAviso.css";

export default function ModalAviso({
  visible,
  titulo,
  mensaje,
  tipo = "info",
  onCerrar,
}) {
  if (!visible) return null;

  return (
    <div className="aviso-overlay" onClick={onCerrar}>
      <div
        className={`aviso-modal aviso-${tipo}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aviso-icono">
          {tipo === "exito" ? "✓" : tipo === "error" ? "!" : "i"}
        </div>

        <h2>{titulo}</h2>
        <p>{mensaje}</p>

        <button onClick={onCerrar}>
          Entendido
        </button>
      </div>
    </div>
  );
}
