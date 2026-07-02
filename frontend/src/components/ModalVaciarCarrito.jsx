import { useEffect, useState } from "react";

export default function ModalVaciarCarrito({
  visible,
  onConfirmar,
  onCancelar,
}) {
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    if (visible) {
      setAnim(true);

      // 📳 vibración corta
      if (navigator.vibrate) navigator.vibrate(60);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      onClick={onCancelar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 30040,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f172a",
          padding: 30,
          borderRadius: 16,
          width: 360,
          textAlign: "center",
          color: "white",
          transform: anim ? "scale(1)" : "scale(0.85)",
          opacity: anim ? 1 : 0,
          transition: "all 180ms ease",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 10 }}>🗑</div>

        <h2 style={{ marginBottom: 10 }}>Vaciar carrito</h2>

        <p style={{ color: "#94a3b8", marginBottom: 20 }}>
          ¿Seguro que deseas eliminar todos los productos?
        </p>

        {/* BOTONES RÁPIDOS */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancelar}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 10,
              border: "none",
              background: "#334155",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>

          <button
            onClick={onConfirmar}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 10,
              border: "none",
              background: "#ef4444",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Vaciar
          </button>
        </div>
      </div>
    </div>
  );
}
