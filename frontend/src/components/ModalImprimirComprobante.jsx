import { useEffect, useState } from "react";

export default function ModalImprimirComprobante({
  visible,
  tipo,
  onImprimir,
  onOmitir,
}) {
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    if (visible) {
      setAnim(true);

      if (navigator.vibrate) navigator.vibrate(45);
    }
  }, [visible]);

  if (!visible) return null;

  const nombre = tipo === "Recibo" ? "recibo" : "factura";

  return (
    <div
      onClick={onOmitir}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f172a",
          padding: 30,
          borderRadius: 16,
          width: 390,
          maxWidth: "100%",
          textAlign: "center",
          color: "white",
          transform: anim ? "scale(1)" : "scale(0.85)",
          opacity: anim ? 1 : 0,
          transition: "all 180ms ease",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>

        <h2 style={{ margin: "0 0 10px" }}>
          Imprimir {nombre}
        </h2>

        <p style={{ color: "#cbd5e1", lineHeight: 1.4, margin: "0 0 20px" }}>
          El documento ya fue creado digitalmente. Deseas imprimirlo ahora?
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onOmitir}
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
            No imprimir
          </button>

          <button
            onClick={onImprimir}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 10,
              border: "none",
              background: "#16a34a",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Si, imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
