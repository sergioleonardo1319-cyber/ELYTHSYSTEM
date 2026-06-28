import {
  CakeSlice,
  CirclePlus,
  Coffee,
  CupSoda,
  EggFried,
  Gift,
  IceCreamCone,
  Popcorn,
  Sandwich,
  Star,
} from "lucide-react";
import "./ListaCategorias.css";

const iconosCategoria = [
  {
    claves: ["helado", "ice"],
    Icono: IceCreamCone,
  },
  {
    claves: ["bebida", "soda", "jugo", "licuado"],
    Icono: CupSoda,
  },
  {
    claves: ["pan", "sandwich", "sandwiches"],
    Icono: Sandwich,
  },
  {
    claves: ["desayuno", "huevo"],
    Icono: EggFried,
  },
  {
    claves: ["cafe", "cafes", "coffee"],
    Icono: Coffee,
  },
  {
    claves: ["postre", "pastel", "cake"],
    Icono: CakeSlice,
  },
  {
    claves: ["snack", "snak", "boquita"],
    Icono: Popcorn,
  },
  {
    claves: ["especial"],
    Icono: Star,
  },
  {
    claves: ["combo"],
    Icono: Gift,
  },
];

const normalizar = (texto = "") =>
  String(texto)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const obtenerIconoCategoria = (nombre = "") => {
  const nombreNormalizado = normalizar(nombre);
  const encontrado = iconosCategoria.find(({ claves }) =>
    claves.some((clave) => nombreNormalizado.includes(clave))
  );

  return encontrado?.Icono || CirclePlus;
};

const obtenerCantidadProductos = (categoria = {}) =>
  Number(
    categoria.totalProductos ??
      categoria.total_productos ??
      categoria.productos ??
      categoria.cantidad_productos ??
      categoria.total ??
      0
  );

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
      <h2>CATEGORIAS</h2>

      <div className="pos-categorias-lista">
        {categorias.map((cat) => (
          (() => {
            const Icono = obtenerIconoCategoria(cat.nombre);
            const activo = categoriaSeleccionada === cat.nombre;
            const cantidadProductos = obtenerCantidadProductos(cat);

            return (
              <button
                key={cat.id || cat.nombre}
                className={activo ? "pos-categoria-btn activo" : "pos-categoria-btn"}
                onClick={() =>
                  setCategoriaSeleccionada(cat.nombre)
                }
              >
                <Icono className="pos-categoria-icono" aria-hidden="true" />
                <span className="pos-categoria-texto">
                  <span className="pos-categoria-nombre">{cat.nombre}</span>
                  <span className="pos-categoria-conteo">
                    {cantidadProductos} productos
                  </span>
                </span>
              </button>
            );
          })()
        ))}
      </div>
    </aside>
  );
}
