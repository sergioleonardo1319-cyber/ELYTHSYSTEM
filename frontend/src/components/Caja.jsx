export default function Caja({
  carrito,
  total,
  actualizarCantidadDirecta,
  eliminarItem,
  guardarVenta,
  abrirModalVaciar,
  abrirModalCobro,
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 12,
        padding: 16,
        color: "white",
        minWidth: 0,
        maxHeight: "calc(100vh - 190px)",
        overflowY: "auto",
      }}
    >
      <h2>🛒 Carrito</h2>

      {/* Carrito vacío */}
      {carrito.length === 0 && (
        <p style={{ color: "#94a3b8" }}>Carrito vacío</p>
      )}

      {/* Productos del carrito */}
      {carrito.map((item) => (
        <div
          key={item.linea_id}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto auto",
            alignItems: "end",
            marginBottom: 12,
            gap: "8px 10px",
            minWidth: 0,
          }}
        >
          {/* Nombre y precio unitario */}
          <div
            style={{
              gridColumn: "1 / -1",
              minWidth: 0,
            }}
          >
            <strong
              style={{
                display: "block",
                overflowWrap: "anywhere",
                lineHeight: 1.15,
                fontSize: 15,
              }}
            >
              {item.nombre}
            </strong>
            {item.tipo_linea === "credito_pendiente" && item.cliente_nombre && (
              <div
                style={{
                  color: "#bfdbfe",
                  fontSize: 12,
                  fontWeight: 800,
                  marginTop: 3,
                }}
              >
                {item.cliente_nombre}
              </div>
            )}
            <div
              style={{
                fontSize: 12,
                color: "#cbd5e1",
                overflowWrap: "anywhere",
              }}
            >
              Q{Number(item.precio).toFixed(2)} c/u
            </div>
            {Array.isArray(item.complementos) &&
              item.complementos.length > 0 && (
                <div
                  style={{
                    color: "#cbd5e1",
                    fontSize: 11,
                    lineHeight: 1.25,
                    marginTop: 5,
                    overflowWrap: "anywhere",
                  }}
                >
                  {item.complementos.map((grupo) => (
                    <div key={grupo.grupo_id || grupo.nombre}>
                      {grupo.nombre}:{" "}
                      {grupo.opciones
                        ?.map((opcion) => opcion.nombre)
                        .join(", ")}
                    </div>
                  ))}
                </div>
              )}
            {item.observacion && (
              <div
                style={{
                  background: "#334155",
                  borderRadius: 6,
                  color: "#fde68a",
                  fontSize: 11,
                  fontWeight: 800,
                  lineHeight: 1.25,
                  marginTop: 6,
                  padding: "5px 7px",
                  overflowWrap: "anywhere",
                }}
              >
                Nota: {item.observacion}
              </div>
            )}
          </div>

          {/* Cantidad editable */}
          {item.tipo_linea === "credito_pendiente" ? (
            <span
              style={{
                background: "#334155",
                borderRadius: 999,
                color: "#dbeafe",
                fontSize: 12,
                fontWeight: 900,
                padding: "7px 10px",
                whiteSpace: "nowrap",
                textAlign: "center",
                justifySelf: "start",
              }}
            >
              Pago
            </span>
          ) : (
            <input
              type="number"
              min="1"
              value={item.cantidad}
              onChange={(e) =>
                actualizarCantidadDirecta(
                  item.linea_id,
                  e.target.value
                )
              }
              style={{
                width: 52,
                boxSizing: "border-box",
                padding: 5,
                borderRadius: 6,
                border: "1px solid #ccc",
                textAlign: "center",
              }}
            />
          )}

          {/* Subtotal */}
          <div
            style={{
              color: "#22c55e",
              fontWeight: "bold",
              minWidth: 0,
              textAlign: "left",
              fontSize: 13,
              whiteSpace: "nowrap",
              alignSelf: "center",
            }}
          >
            Q{(item.precio * item.cantidad).toFixed(2)}
          </div>

          {/* Eliminar producto */}
          <button
            onClick={() => eliminarItem(item.linea_id)}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 8,
              height: 32,
              width: 32,
              cursor: "pointer",
              fontWeight: 900,
              alignSelf: "center",
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* Separador */}
      <hr
        style={{
          margin: "20px 0",
          borderColor: "#334155",
        }}
      />

      {/* Total */}
      <h3>Total: Q{Number(total).toFixed(2)}</h3>

      {/* Botón Cobrar */}
      <button
        onClick={abrirModalCobro}
        disabled={carrito.length === 0}
        style={{
          width: "100%",
          padding: 12,
          background:
            carrito.length === 0 ? "#64748b" : "#22c55e",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontWeight: "bold",
          cursor:
            carrito.length === 0 ? "not-allowed" : "pointer",
          marginBottom: 10,
          fontSize: 16,
        }}
      >
        💵 Cobrar
      </button>

      {/* Botón Vaciar carrito */}
      <button
        onClick={abrirModalVaciar}
        disabled={carrito.length === 0}
        style={{
          width: "100%",
          padding: 12,
          background:
            carrito.length === 0 ? "#64748b" : "#ef4444",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontWeight: "bold",
          cursor:
            carrito.length === 0 ? "not-allowed" : "pointer",
          fontSize: 16,
        }}
      >
        🗑 Vaciar carrito
      </button>
    </div>
  );
}
