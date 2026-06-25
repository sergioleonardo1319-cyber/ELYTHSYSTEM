import "./ListaCategorias.css";

export default function ListaCategorias({
  categorias,
  categoriaSeleccionada,
  setCategoriaSeleccionada,
  alturaCompleta = false,
}) {
  const obtenerClaseTexto = (nombre = "") => {
    const longitud = String(nombre).trim().length;

    if (longitud > 18) return "texto-muy-largo";
    if (longitud > 11) return "texto-largo";
    return "";
  };

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
            <span className={obtenerClaseTexto(cat.nombre)}>{cat.nombre}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
