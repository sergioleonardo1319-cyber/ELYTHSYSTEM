import {
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import "./Caja.css";

export default function Caja({
  carrito,
  total,
  actualizarCantidadDirecta,
  eliminarItem,
  abrirModalVaciar,
  abrirModalCobro,
}) {
  const iva = Number(total || 0) * 0.12;
  const subtotal = Number(total || 0) - iva;

  const cambiarCantidad = (item, cambio) => {
    const nuevaCantidad = Number(item.cantidad || 0) + cambio;

    if (nuevaCantidad <= 0) {
      eliminarItem(item.linea_id);
      return;
    }

    actualizarCantidadDirecta(item.linea_id, nuevaCantidad);
  };

  return (
    <aside className="pos-carrito-panel">
      <header className="pos-carrito-header">
        <h2>CARRITO</h2>

        <button
          type="button"
          className="pos-carrito-vaciar"
          onClick={abrirModalVaciar}
          disabled={carrito.length === 0}
          aria-label="Vaciar carrito"
          title="Vaciar carrito"
        >
          <Trash2 aria-hidden="true" />
        </button>
      </header>

      <div className="pos-carrito-lista">
        {carrito.map((item) => (
          <article className="pos-carrito-item" key={item.linea_id}>
            <div className="pos-carrito-imagen">
              {item.imagen_url ? (
                <img src={item.imagen_url} alt={item.nombre} />
              ) : (
                <span>{item.nombre?.slice(0, 1) || "P"}</span>
              )}
            </div>

            <div className="pos-carrito-info">
              <strong>{item.nombre}</strong>

              {item.tipo_linea === "credito_pendiente" &&
                item.cliente_nombre && (
                  <small>{item.cliente_nombre}</small>
                )}

              <b>Q{Number(item.precio).toFixed(2)} c/u</b>

              {Array.isArray(item.complementos) &&
                item.complementos.length > 0 && (
                  <div className="pos-carrito-complementos">
                    {item.complementos.map((grupo) => (
                      <span key={grupo.grupo_id || grupo.nombre}>
                        {grupo.nombre}:{" "}
                        {grupo.opciones
                          ?.map((opcion) => opcion.nombre)
                          .join(", ")}
                      </span>
                    ))}
                  </div>
                )}

              {item.observacion && (
                <div className="pos-carrito-nota">
                  Nota: {item.observacion}
                </div>
              )}
            </div>

            <div className="pos-carrito-controles">
              {item.tipo_linea === "credito_pendiente" ? (
                <span className="pos-carrito-pago">Pago</span>
              ) : (
                <div className="pos-carrito-cantidad">
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(item, -1)}
                    aria-label="Restar cantidad"
                  >
                    <Minus aria-hidden="true" />
                  </button>
                  <span>{Number(item.cantidad || 0)}</span>
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(item, 1)}
                    aria-label="Sumar cantidad"
                  >
                    <Plus aria-hidden="true" />
                  </button>
                </div>
              )}

              <button
                type="button"
                className="pos-carrito-eliminar"
                onClick={() => eliminarItem(item.linea_id)}
                aria-label="Eliminar producto"
                title="Eliminar producto"
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}

        <div className="pos-carrito-mensaje">
          <strong>
            {carrito.length === 0
              ? "No hay productos"
              : "No hay mas productos"}
          </strong>
          <span>
            {carrito.length === 0
              ? "Seleccione un producto para comenzar la venta."
              : "Seleccione un producto para continuar la venta."}
          </span>
        </div>
      </div>

      <section className="pos-carrito-resumen">
        <div>
          <span>Subtotal</span>
          <strong>Q{subtotal.toFixed(2)}</strong>
        </div>
        <div>
          <span>IVA (12%)</span>
          <strong>Q{iva.toFixed(2)}</strong>
        </div>
        <div className="pos-carrito-total">
          <span>TOTAL</span>
          <strong>Q{Number(total || 0).toFixed(2)}</strong>
        </div>
      </section>

      <button
        type="button"
        className="pos-carrito-cobrar"
        onClick={abrirModalCobro}
        disabled={carrito.length === 0}
      >
        <ShoppingCart aria-hidden="true" />
        <span>COBRAR</span>
      </button>
    </aside>
  );
}
