import {
  CakeSlice,
  CirclePlus,
  Coffee,
  CupSoda,
  EggFried,
  Gift,
  IceCreamBowl,
  Popcorn,
  Sandwich,
  Star,
} from "lucide-react";
import "./ListaCategorias.css";

const iconosCategoria = [
  {
    claves: ["helado", "ice"],
    Icono: IceCreamBowl,
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
    claves: ["snack", "boquita"],
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
          (() => {
            const Icono = obtenerIconoCategoria(cat.nombre);

            return (
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
                <Icono aria-hidden="true" />
                <span className={obtenerClaseTexto(cat.nombre)}>
                  {cat.nombre}
                </span>
              </button>
            );
          })()
        ))}
      </div>
    </aside>
  );
}
