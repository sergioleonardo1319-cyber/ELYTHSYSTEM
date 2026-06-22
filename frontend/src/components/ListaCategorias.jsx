import "./ListaCategorias.css";

export default function ListaCategorias({
  categorias,
  categoriaSeleccionada,
  setCategoriaSeleccionada,
  alturaCompleta = false,
}) {
  return (
    <aside
      className={
        alturaCompleta
          ? "pos-categorias-panel altura-completa"
          : "pos-categorias-panel"
      }
    >
      <h2>Categorias</h2>

      <div className="pos-categorias-lista">
        {categorias.map((cat) => (
          <button
            key={cat.id}
            className={
              categoriaSeleccionada === cat.nombre
                ? "pos-categoria-btn activo"
                : "pos-categoria-btn"
            }
            onClick={() =>
              setCategoriaSeleccionada(cat.nombre)
            }
          >
            {cat.nombre}
          </button>
        ))}
      </div>
    </aside>
  );
}
