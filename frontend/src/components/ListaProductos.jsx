import { List, Search } from "lucide-react";
import "./ListaProductos.css";

export default function ListaProductos({
  productosFiltrados,
  categoriaSeleccionada,
  busquedaPOS,
  setBusquedaPOS,
  agregarProductoPorBusqueda,
  agregarAlCarrito,
  accionesSlot,
}) {
  return (
    <div className="pos-productos-panel">
      <div className="pos-productos-header">
        <div className="pos-productos-toolbar-left">
          <h2>
            {busquedaPOS
              ? "Resultados"
              : categoriaSeleccionada || "Seleccione categoria"}
          </h2>
          <div className="pos-buscador-wrap">
            <Search className="pos-buscador-icono" aria-hidden="true" />
            <input
              value={busquedaPOS}
              onChange={(e) => setBusquedaPOS(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  agregarProductoPorBusqueda();
                }
              }}
              placeholder="Buscar"
              autoComplete="off"
              autoFocus
            />
          </div>
        </div>

        <div className="pos-buscador-menu">
          <List aria-hidden="true" />
          {accionesSlot}
        </div>
      </div>

      <div className="pos-productos-grid">
        {productosFiltrados.map((producto) => {
          const controlaStock = producto.controla_stock !== false;
          const sinStock =
            controlaStock && Number(producto.existencia) <= 0;
          const deshabilitado =
            producto.habilitado_venta === false || sinStock;

          return (
            <button
              key={producto.id}
              type="button"
              className={
                deshabilitado
                  ? "pos-producto-card deshabilitado"
                  : "pos-producto-card"
              }
              onClick={() => agregarAlCarrito(producto)}
              disabled={deshabilitado}
            >
              <div className="pos-producto-imagen">
                {/* Nota:
                    El fondo blanco pertenece al archivo de imagen.
                    CSS no puede eliminarlo de forma perfecta.
                    Para que el producto se vea sin fondo, subir imagenes PNG/WebP transparentes
                    o procesarlas previamente con una herramienta de remove background. */}
                {producto.imagen_url ? (
                  <img
                    src={producto.imagen_url}
                    alt={producto.nombre}
                  />
                ) : (
                  <span>{producto.nombre?.slice(0, 1) || "P"}</span>
                )}
              </div>

              <div className="pos-producto-info">
                <strong>{producto.nombre}</strong>
                <b>Q{Number(producto.precio).toFixed(2)}</b>
                <small>
                  {controlaStock
                    ? `Stock: ${Number(producto.existencia || 0)}`
                    : "Preparado"}
                </small>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
