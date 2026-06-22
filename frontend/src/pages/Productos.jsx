import { useEffect, useState } from "react";
import "./Productos.css";
import { API } from "../config";

export default function Productos({
  user,
  onProductosActualizados,
}) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [productoEliminar, setProductoEliminar] = useState(null);
  const [productoComplementos, setProductoComplementos] = useState(null);
  const [gruposComplementos, setGruposComplementos] = useState([]);
  const [mensajeExito, setMensajeExito] = useState("");
  const [toast, setToast] = useState("");

  const [busqueda, setBusqueda] =
  useState("");

  const [filtroCategoria, setFiltroCategoria] =
  useState("Todas");
  const [modoInventario, setModoInventario] =
  useState("todos");

  const [mostrarModalEliminar, setMostrarModalEliminar] =
  useState(false);
  const [mostrarModalComplementos, setMostrarModalComplementos] =
  useState(false);

  const [codigo, setCodigo] = useState("");
  const [upc, setUpc] = useState("");
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [precioCosto, setPrecioCosto] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");

  const ganancia =
        (Number(precio || 0) - Number(precioCosto || 0)).toFixed(2);

  const [marca, setMarca] = useState("");
  const [existencia, setExistencia] = useState("");
  const [existenciaMinima, setExistenciaMinima] = useState("");
  const [existenciaMaxima, setExistenciaMaxima] = useState("");
  const [habilitadoVenta, setHabilitadoVenta] = useState(true);
  const [controlaStock, setControlaStock] = useState(true);
  const [tipoProducto, setTipoProducto] = useState("producto");
  const [seFabrica, setSeFabrica] = useState(false);
  const [numeroSerie, setNumeroSerie] = useState("");
  const [medidaCompra, setMedidaCompra] = useState("");
  const [equivalenteInventario, setEquivalenteInventario] =
  useState("1");
  const [medidaInventario, setMedidaInventario] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [familia, setFamilia] = useState("");
  const [cuentaContable, setCuentaContable] = useState("");
  const [centroCosto, setCentroCosto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const tiposProducto = [
    ["producto", "Producto"],
    ["servicio", "Servicio"],
    ["producto_fabricado", "Producto fabricado"],
    ["materia_prima", "Materia prima"],
    ["activo_fijo", "Activo fijo"],
    ["combustible", "Combustible"],
  ];

  const medidas = [
    "Unidad",
    "Fardo",
    "Paquete",
    "Caja",
    "Bolsa",
    "Libra",
    "Kilogramo",
    "Litro",
    "Galon",
  ];

  const aplicarTipoProducto = (tipo) => {
    setTipoProducto(tipo);

    if (tipo === "servicio") {
      setControlaStock(false);
      setHabilitadoVenta(true);
      setSeFabrica(false);
    }

    if (tipo === "producto_fabricado") {
      setControlaStock(false);
      setHabilitadoVenta(true);
      setSeFabrica(true);
    }

    if (tipo === "materia_prima") {
      setControlaStock(true);
      setHabilitadoVenta(false);
      setSeFabrica(false);
    }

    if (tipo === "activo_fijo") {
      setControlaStock(false);
      setHabilitadoVenta(false);
      setSeFabrica(false);
    }

    if (tipo === "combustible") {
      setControlaStock(true);
      setHabilitadoVenta(false);
      setSeFabrica(false);
    }

    if (tipo === "producto") {
      setControlaStock(true);
      setHabilitadoVenta(true);
      setSeFabrica(false);
    }
  };

  const leerRespuesta = async (res) => {
    const texto = await res.text();

    if (!texto) return {};

    try {
      return JSON.parse(texto);
    } catch {
      return {
        error: res.status === 413
          ? "La imagen es demasiado grande. Seleccione una imagen mas liviana."
          : "Respuesta no valida del servidor.",
      };
    }
  };

  const comprimirImagenProducto = (dataUrl) => {
    const imagen = new Image();

    imagen.onload = () => {
      const maximo = 900;
      const escala = Math.min(
        1,
        maximo / Math.max(imagen.width, imagen.height)
      );
      const ancho = Math.max(1, Math.round(imagen.width * escala));
      const alto = Math.max(1, Math.round(imagen.height * escala));
      const canvas = document.createElement("canvas");
      const contexto = canvas.getContext("2d");

      if (!contexto) {
        setImagenUrl(dataUrl);
        return;
      }

      canvas.width = ancho;
      canvas.height = alto;
      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, ancho, alto);
      contexto.drawImage(imagen, 0, 0, ancho, alto);

      setImagenUrl(canvas.toDataURL("image/jpeg", 0.76));
    };

    imagen.onerror = () => {
      setImagenUrl(dataUrl);
    };

    imagen.src = dataUrl;
  };

  const seleccionarImagenProducto = (e) => {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setToast("Seleccione un archivo de imagen.");
      return;
    }

    if (archivo.size > 8 * 1024 * 1024) {
      setToast("La imagen debe pesar menos de 8 MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result;

      if (typeof dataUrl !== "string") {
        setToast("No se pudo cargar la imagen seleccionada.");
        return;
      }

      setImagenUrl(dataUrl);
      comprimirImagenProducto(dataUrl);
      e.target.value = "";
    };

    reader.onerror = () => {
      setToast("No se pudo leer la imagen seleccionada.");
      e.target.value = "";
    };

    reader.readAsDataURL(archivo);
  };

  const calcularPrecioVenta = (costo, margenValor) => {

  const costoNum = Number(costo);
  const margenNum = Number(margenValor);

  if (!costoNum || !margenNum) {
    return;
  }

  const precioCalculado =
    costoNum + (costoNum * margenNum / 100);

  setPrecio(precioCalculado.toFixed(2));
};

  useEffect(() => {

    if (user) {
      cargarProductos();
      cargarCategorias();
      cargarDepartamentos();
    }

  }, [user]);

  const cargarProductos = async () => {

    try {

      const token = sessionStorage.getItem("token");

      console.log("TOKEN PRODUCTOS:", token);

      const res = await fetch(
        `${API}/productos?empresa_id=${user.empresa_id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await leerRespuesta(res);

      console.log("RESPUESTA PRODUCTOS:", data);

      if (!res.ok) {
        console.error(data);
        return;
      }

      setProductos(Array.isArray(data) ? data : []);

      return Array.isArray(data) ? data : [];

    } catch (error) {

      console.error("ERROR PRODUCTOS:", error);

      return [];

    }
  };

  const refrescarProductos = async () => {
    await cargarProductos();

    if (onProductosActualizados) {
      await onProductosActualizados();
    }
  };

  const cargarCategorias = async () => {

    try {

      const token = sessionStorage.getItem("token");

      console.log("TOKEN CATEGORIAS:", token);

      const res = await fetch(
        `${API}/categorias?empresa_id=${user.empresa_id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await leerRespuesta(res);

      console.log("RESPUESTA CATEGORIAS:", data);

      if (!res.ok) {
        console.error(data);
        return;
      }

      setCategorias(Array.isArray(data) ? data : []);

    } catch (error) {

      console.error("ERROR CATEGORIAS:", error);

    }
  };

  const cargarDepartamentos = async () => {

    try {

      const token = sessionStorage.getItem("token");

      const res = await fetch(
        `${API}/departamentos?empresa_id=${user.empresa_id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await leerRespuesta(res);

      if (!res.ok) {
        console.error(data);
        return;
      }

      setDepartamentos(Array.isArray(data) ? data : []);

    } catch (error) {

      console.error("ERROR DEPARTAMENTOS:", error);

    }
  };

const limpiarFormulario = () => {

  setCodigo("");
  setUpc("");
  setNombre("");
  setPrecio("");
  setPrecioCosto("");
  setImagenUrl("");
  setMarca("");
  setExistencia("");
  setExistenciaMinima("");
  setExistenciaMaxima("");
  setCategoria("");
  setHabilitadoVenta(true);
  setControlaStock(true);
  setTipoProducto("producto");
  setSeFabrica(false);
  setNumeroSerie("");
  setMedidaCompra("");
  setEquivalenteInventario("1");
  setMedidaInventario("");
  setDepartamento("");
  setSubcategoria("");
  setFamilia("");
  setCuentaContable("");
  setCentroCosto("");

};

const guardarProducto = async () => {

  try {

    const token = sessionStorage.getItem("token");

    if (editandoId) {
      
      console.log("EDITANDO ID:", editandoId);

  const res = await fetch(
    `${API}/productos/${editandoId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        codigo,
        upc,
        nombre,
        precio,
        precio_costo: precioCosto,
        imagen_url: imagenUrl,
        marca,
        existencia,
        existencia_minima: existenciaMinima,
        habilitado_venta: habilitadoVenta,
        controla_stock: controlaStock,
        tipo_producto: tipoProducto,
        se_fabrica: seFabrica,
        numero_serie: numeroSerie,
        medida_compra: medidaCompra,
        equivalente_inventario: equivalenteInventario,
        medida_inventario: medidaInventario,
        departamento,
        subcategoria,
        familia,
        cuenta_contable: cuentaContable,
        centro_costo: centroCosto,
        categoria,
        empresa_id: user.empresa_id,
        rol: user.rol,
      }),
    }
  );

  const data = await leerRespuesta(res);

  console.log("RESPUESTA UPDATE:", data);

  if (!res.ok) {
    setToast(data.error || "No se pudo actualizar el producto");
    return;
  }

  setEditandoId(null);

  limpiarFormulario();

setToast(
  "Producto actualizado correctamente"
);

setTimeout(() => {
  setToast("");
}, 3000);

refrescarProductos();

return;
}

    const res = await fetch(
      `${API}/productos`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          codigo,
          upc,
          nombre,
          precio,
          precio_costo: precioCosto,
          imagen_url: imagenUrl,
          marca,
          existencia,
          existencia_minima: existenciaMinima,
          existenciaMaxima,
          habilitado_venta: habilitadoVenta,
          controla_stock: controlaStock,
          tipo_producto: tipoProducto,
          se_fabrica: seFabrica,
          numero_serie: numeroSerie,
          medida_compra: medidaCompra,
          equivalente_inventario: equivalenteInventario,
          medida_inventario: medidaInventario,
          departamento,
          subcategoria,
          familia,
          cuenta_contable: cuentaContable,
          centro_costo: centroCosto,
          categoria,
          empresa_id: user.empresa_id,
          rol: user.rol,
        }),
 
    }
    );

    const data = await leerRespuesta(res);

    if (!res.ok) {
      setToast(data.error || "Error al crear producto");
      return;
    }

    limpiarFormulario();

    setMensajeExito("Producto creado correctamente");

      setTimeout(() => {
        setMensajeExito("");
      }, 3000);

    refrescarProductos();

  } catch (error) {

    console.error(error);

  }
};

const eliminarProducto = (producto) => {

  setProductoEliminar(producto);

  setMostrarModalEliminar(true);

};

const abrirComplementos = async (producto) => {
  try {
    const res = await fetch(
      `${API}/productos/${producto.id}/complementos?empresa_id=${user.empresa_id}`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      }
    );

    const data = await leerRespuesta(res);

    if (!res.ok) {
      throw new Error(data.error || "Error cargando complementos");
    }

    setProductoComplementos(producto);
    setGruposComplementos(
      Array.isArray(data)
        ? data.map((grupo) => ({
            ...grupo,
            opciones: Array.isArray(grupo.opciones) ? grupo.opciones : [],
          }))
        : []
    );
    setMostrarModalComplementos(true);
  } catch (error) {
    setToast(error.message);
  }
};

const agregarGrupoComplemento = () => {
  setGruposComplementos((prev) => [
    ...prev,
    {
      id: `nuevo-${Date.now()}`,
      nombre: "",
      obligatorio: true,
      seleccion_multiple: false,
      minimo: 1,
      maximo: 1,
      opciones: [],
    },
  ]);
};

const actualizarGrupoComplemento = (index, campo, valor) => {
  setGruposComplementos((prev) =>
    prev.map((grupo, i) =>
      i === index
        ? {
            ...grupo,
            [campo]: valor,
          }
        : grupo
    )
  );
};

const eliminarGrupoComplemento = (index) => {
  setGruposComplementos((prev) =>
    prev.filter((_, i) => i !== index)
  );
};

const agregarOpcionComplemento = (grupoIndex) => {
  setGruposComplementos((prev) =>
    prev.map((grupo, i) =>
      i === grupoIndex
        ? {
            ...grupo,
            opciones: [
              ...(grupo.opciones || []),
              {
                id: `opcion-${Date.now()}`,
                nombre: "",
                precio_extra: 0,
              },
            ],
          }
        : grupo
    )
  );
};

const actualizarOpcionComplemento = (
  grupoIndex,
  opcionIndex,
  campo,
  valor
) => {
  setGruposComplementos((prev) =>
    prev.map((grupo, i) =>
      i === grupoIndex
        ? {
            ...grupo,
            opciones: (grupo.opciones || []).map((opcion, j) =>
              j === opcionIndex
                ? {
                    ...opcion,
                    [campo]: valor,
                  }
                : opcion
            ),
          }
        : grupo
    )
  );
};

const eliminarOpcionComplemento = (grupoIndex, opcionIndex) => {
  setGruposComplementos((prev) =>
    prev.map((grupo, i) =>
      i === grupoIndex
        ? {
            ...grupo,
            opciones: (grupo.opciones || []).filter(
              (_, j) => j !== opcionIndex
            ),
          }
        : grupo
    )
  );
};

const agregarSubgrupoComplemento = (grupoIndex, opcionIndex) => {
  setGruposComplementos((prev) =>
    prev.map((grupo, i) =>
      i === grupoIndex
        ? {
            ...grupo,
            opciones: (grupo.opciones || []).map((opcion, j) =>
              j === opcionIndex
                ? {
                    ...opcion,
                    subgrupos: [
                      ...(opcion.subgrupos || []),
                      {
                        id: `subgrupo-${Date.now()}`,
                        nombre: "",
                        obligatorio: true,
                        seleccion_multiple: false,
                        minimo: 1,
                        maximo: 1,
                        opciones: [],
                      },
                    ],
                  }
                : opcion
            ),
          }
        : grupo
    )
  );
};

const actualizarSubgrupoComplemento = (
  grupoIndex,
  opcionIndex,
  subgrupoIndex,
  campo,
  valor
) => {
  setGruposComplementos((prev) =>
    prev.map((grupo, i) =>
      i === grupoIndex
        ? {
            ...grupo,
            opciones: (grupo.opciones || []).map((opcion, j) =>
              j === opcionIndex
                ? {
                    ...opcion,
                    subgrupos: (opcion.subgrupos || []).map((subgrupo, k) =>
                      k === subgrupoIndex
                        ? {
                            ...subgrupo,
                            [campo]: valor,
                          }
                        : subgrupo
                    ),
                  }
                : opcion
            ),
          }
        : grupo
    )
  );
};

const eliminarSubgrupoComplemento = (
  grupoIndex,
  opcionIndex,
  subgrupoIndex
) => {
  setGruposComplementos((prev) =>
    prev.map((grupo, i) =>
      i === grupoIndex
        ? {
            ...grupo,
            opciones: (grupo.opciones || []).map((opcion, j) =>
              j === opcionIndex
                ? {
                    ...opcion,
                    subgrupos: (opcion.subgrupos || []).filter(
                      (_, k) => k !== subgrupoIndex
                    ),
                  }
                : opcion
            ),
          }
        : grupo
    )
  );
};

const agregarOpcionSubgrupoComplemento = (
  grupoIndex,
  opcionIndex,
  subgrupoIndex
) => {
  setGruposComplementos((prev) =>
    prev.map((grupo, i) =>
      i === grupoIndex
        ? {
            ...grupo,
            opciones: (grupo.opciones || []).map((opcion, j) =>
              j === opcionIndex
                ? {
                    ...opcion,
                    subgrupos: (opcion.subgrupos || []).map((subgrupo, k) =>
                      k === subgrupoIndex
                        ? {
                            ...subgrupo,
                            opciones: [
                              ...(subgrupo.opciones || []),
                              {
                                id: `subopcion-${Date.now()}`,
                                nombre: "",
                                precio_extra: 0,
                              },
                            ],
                          }
                        : subgrupo
                    ),
                  }
                : opcion
            ),
          }
        : grupo
    )
  );
};

const actualizarOpcionSubgrupoComplemento = (
  grupoIndex,
  opcionIndex,
  subgrupoIndex,
  subopcionIndex,
  campo,
  valor
) => {
  setGruposComplementos((prev) =>
    prev.map((grupo, i) =>
      i === grupoIndex
        ? {
            ...grupo,
            opciones: (grupo.opciones || []).map((opcion, j) =>
              j === opcionIndex
                ? {
                    ...opcion,
                    subgrupos: (opcion.subgrupos || []).map((subgrupo, k) =>
                      k === subgrupoIndex
                        ? {
                            ...subgrupo,
                            opciones: (subgrupo.opciones || []).map(
                              (subopcion, l) =>
                                l === subopcionIndex
                                  ? {
                                      ...subopcion,
                                      [campo]: valor,
                                    }
                                  : subopcion
                            ),
                          }
                        : subgrupo
                    ),
                  }
                : opcion
            ),
          }
        : grupo
    )
  );
};

const eliminarOpcionSubgrupoComplemento = (
  grupoIndex,
  opcionIndex,
  subgrupoIndex,
  subopcionIndex
) => {
  setGruposComplementos((prev) =>
    prev.map((grupo, i) =>
      i === grupoIndex
        ? {
            ...grupo,
            opciones: (grupo.opciones || []).map((opcion, j) =>
              j === opcionIndex
                ? {
                    ...opcion,
                    subgrupos: (opcion.subgrupos || []).map((subgrupo, k) =>
                      k === subgrupoIndex
                        ? {
                            ...subgrupo,
                            opciones: (subgrupo.opciones || []).filter(
                              (_, l) => l !== subopcionIndex
                            ),
                          }
                        : subgrupo
                    ),
                  }
                : opcion
            ),
          }
        : grupo
    )
  );
};

const guardarComplementos = async () => {
  if (!productoComplementos) return;

  try {
    const res = await fetch(
      `${API}/productos/${productoComplementos.id}/complementos`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          empresa_id: user.empresa_id,
          grupos: gruposComplementos,
        }),
      }
    );

    const data = await leerRespuesta(res);

    if (!res.ok) {
      throw new Error(data.error || "Error guardando complementos");
    }

    setMostrarModalComplementos(false);
    setProductoComplementos(null);
    setGruposComplementos([]);
    setToast("Complementos guardados correctamente");
  } catch (error) {
    setToast(error.message);
  }
};

const confirmarEliminarProducto = async () => {

  try {

    const token =
      sessionStorage.getItem("token");

    const res = await fetch(
      `${API}/productos/${productoEliminar.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await leerRespuesta(res);

    if (!res.ok) {
      setToast(data.error || "No se pudo eliminar el producto");
      return;
    }

    setMostrarModalEliminar(false);

    setToast(
  "Producto eliminado correctamente"
);

setTimeout(() => {
  setToast("");
}, 3000);

    setProductoEliminar(null);

    refrescarProductos();

  } catch (error) {

    console.error(
      "ERROR DELETE:",
      error
    );

  }

};

const cambiarDisponibilidadVenta = async (producto) => {

  try {

    const token = sessionStorage.getItem("token");
    const nuevoEstado = producto.habilitado_venta === false;

    const res = await fetch(
      `${API}/productos/${producto.id}/habilitado-venta`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habilitado_venta: nuevoEstado,
          empresa_id: user.empresa_id,
        }),
      }
    );

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await leerRespuesta(res)
      : { error: await res.text() };

    if (!res.ok) {
      setToast(
        data.error?.startsWith("<!DOCTYPE")
          ? "Ruta no encontrada en el servidor. Reinicia el backend."
          : data.error || "Error actualizando disponibilidad"
      );
      return;
    }

    setToast(
      nuevoEstado
        ? "Producto habilitado para venta"
        : "Producto deshabilitado para venta"
    );

    setTimeout(() => {
      setToast("");
    }, 3000);

    refrescarProductos();

  } catch (error) {

    console.error(error);
    setToast("Error conectando con el servidor");

  }
};

const editarProducto = (producto) => {

  setEditandoId(producto.id);

  setCodigo(producto.codigo || "");
  setUpc(producto.upc || "");
  setNombre(producto.nombre || "");
  setPrecio(producto.precio || "");
  setPrecioCosto(producto.precio_costo || "");
  setImagenUrl(producto.imagen_url || "");
  setMarca(producto.marca || "");
  setExistencia(producto.existencia || "");
  setExistenciaMinima(
    producto.existencia_minima || ""
  );
  setExistenciaMaxima(
    producto.existencia_maxima || ""
  );
  setControlaStock(producto.controla_stock !== false);
  setHabilitadoVenta(producto.habilitado_venta !== false);
  setTipoProducto(producto.tipo_producto || "producto");
  setSeFabrica(producto.se_fabrica === true);
  setNumeroSerie(producto.numero_serie || "");
  setMedidaCompra(producto.medida_compra || "");
  setEquivalenteInventario(
    producto.equivalente_inventario || "1"
  );
  setMedidaInventario(producto.medida_inventario || "");
  setDepartamento(producto.departamento || "");
  setSubcategoria(producto.subcategoria || "");
  setFamilia(producto.familia || "");
  setCuentaContable(producto.cuenta_contable || "");
  setCentroCosto(producto.centro_costo || "");
  setCategoria(producto.categoria || "");

};

const totalProductos =
  productos.length;

const totalCategorias =
  categorias.length;

const totalExistencia =
  productos.reduce(
    (acc, prod) =>
      acc + Number(prod.existencia || 0),
    0
  );

const stockBajo = productos.filter(
  (p) =>
    p.controla_stock !== false &&
    Number(p.existencia_minima) > 0 &&
    Number(p.existencia) > 0 &&
    Number(p.existencia) <=
      Number(p.existencia_minima)
).length;

const agotados = productos.filter(
  (p) =>
    p.controla_stock !== false &&
    Number(p.existencia_minima) > 0 &&
    Number(p.existencia) <= 0
).length;

const comprarHoy = productos.filter(
  (p) =>
    p.controla_stock !== false &&
    Number(p.existencia_minima) > 0 &&
    Number(p.existencia) <=
    Number(p.existencia_minima)
).length;

const productosReabastecer = productos.filter(
  (p) =>
    p.controla_stock !== false &&
    Number(p.existencia_minima) > 0 &&
    Number(p.existencia) <= Number(p.existencia_minima)
);

const productoControlaStock = (producto) =>
  producto.controla_stock !== false;

const productoAgotado = (producto) =>
  productoControlaStock(producto) &&
  Number(producto.existencia_minima) > 0 &&
  Number(producto.existencia) <= 0;

const productoStockBajo = (producto) =>
  productoControlaStock(producto) &&
  Number(producto.existencia_minima) > 0 &&
  Number(producto.existencia) > 0 &&
  Number(producto.existencia) <=
    Number(producto.existencia_minima);

const valorInventario =
  productos.reduce(
    (total, p) =>
      total +
      Number(p.precio_costo || 0) *
      Number(p.existencia || 0),
    0
  );

  const gananciaPotencial =
  productos.reduce(
    (total, p) =>
      total +
      (
        Number(p.precio || 0) -
        Number(p.precio_costo || 0)
      ) *
      Number(p.existencia || 0),
    0
  );

  const porReabastecer =
  stockBajo + agotados;

const productosFiltrados =
productos.filter((prod) => {

  const texto =
    busqueda.toLowerCase();

  const coincideBusqueda =

    prod.nombre?.toLowerCase()
      .includes(texto)

    ||

    prod.codigo?.toLowerCase()
      .includes(texto)

    ||

    prod.categoria?.toLowerCase()
      .includes(texto);

  const coincideCategoria =

    filtroCategoria === "Todas"

    ||

    prod.categoria === filtroCategoria;

    const coincideInventario =

      modoInventario === "todos"

      ||

      (
        prod.controla_stock !== false &&
        Number(prod.existencia_minima) > 0 &&
        Number(prod.existencia)
        <=
        Number(prod.existencia_minima)
      );

  return (
  coincideBusqueda &&
  coincideCategoria &&
  coincideInventario
);

});

  return (
  <div className="productos-container">
    {toast && (

  <div className="toast-success">

    ✓ {toast}

  </div>

)}

    {mensajeExito && (
      <div className="mensaje-exito">
        {mensajeExito}
      </div>
    )}

    <div className="productos-form-card">

      <h1 className="productos-titulo">
        Productos
      </h1>

        <div className="productos-form-grid">

          <label className="producto-campo">
            <span>Nombre producto</span>
            <input
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
            />
          </label>

          <label className="producto-campo">
            <span>Codigo</span>
            <input
              value={codigo}
              onChange={(e) =>
                setCodigo(e.target.value)
              }
            />
          </label>

          <label className="producto-campo">
            <span>UPC</span>
            <input
              value={upc}
              onChange={(e) => setUpc(e.target.value)}
            />
          </label>

          <label className="producto-campo">
            <span>Precio venta</span>
            <div className="producto-moneda">
              <b>Q</b>
              <input
                type="number"
                value={precio}
                onChange={(e) =>
                  setPrecio(e.target.value)
                }
              />
            </div>
          </label>

          <label className="producto-campo">
            <span>Precio costo</span>
            <div className="producto-moneda">
              <b>Q</b>
              <input
                type="number"
                value={precioCosto}
                onChange={(e) =>
                  setPrecioCosto(e.target.value)
                }
              />
            </div>
          </label>

          <label className="producto-campo">
            <span>Ganancia</span>
            <div className="producto-moneda producto-moneda-disabled">
              <b>Q</b>
              <input
                value={ganancia}
                disabled
              />
            </div>
          </label>

          <label className="producto-campo">
            <span>Marca</span>
            <input
              value={marca}
              onChange={(e) =>
                setMarca(e.target.value)
              }
            />
          </label>

          <label className="producto-campo">
            <span>Tipo de producto</span>
            <select
              value={tipoProducto}
              onChange={(e) =>
                aplicarTipoProducto(e.target.value)
              }
            >
              {tiposProducto.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>

          <label className="producto-campo">
            <span>No. de serie</span>
            <input
              value={numeroSerie}
              onChange={(e) =>
                setNumeroSerie(e.target.value)
              }
            />
          </label>

          <label className="producto-campo">
            <span>Medida de compra</span>
            <select
              value={medidaCompra}
              onChange={(e) =>
                setMedidaCompra(e.target.value)
              }
            >
              <option value="">Seleccionar</option>
              {medidas.map((medida) => (
                <option key={medida} value={medida}>
                  {medida}
                </option>
              ))}
            </select>
          </label>

          <label className="producto-campo">
            <span>Equivalente inventario</span>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={equivalenteInventario}
              onChange={(e) =>
                setEquivalenteInventario(e.target.value)
              }
            />
          </label>

          <label className="producto-campo">
            <span>Medida de inventario</span>
            <select
              value={medidaInventario}
              onChange={(e) =>
                setMedidaInventario(e.target.value)
              }
            >
              <option value="">Seleccionar</option>
              {medidas.map((medida) => (
                <option key={medida} value={medida}>
                  {medida}
                </option>
              ))}
            </select>
          </label>

          <label className="producto-campo">
            <span>Departamento</span>
            <select
              value={departamento}
              onChange={(e) =>
                setDepartamento(e.target.value)
              }
            >
              <option value="">Seleccionar</option>

              {departamentos.map((dep) => (
                <option
                  key={dep.id}
                  value={dep.nombre}
                >
                  {dep.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="producto-campo">
            <span>Existencia</span>
            <input
              type="number"
              value={existencia}
              onChange={(e) =>
                setExistencia(e.target.value)
              }
            />
          </label>

          <label className="producto-campo">
            <span>Existencia minima</span>
            <input
              type="number"
              value={existenciaMinima}
              onChange={(e) =>
                setExistenciaMinima(e.target.value)
              }
            />
          </label>

          <label className="producto-campo">
            <span>Existencia maxima</span>
            <input
              type="number"
              value={existenciaMaxima}
              onChange={(e) =>
                setExistenciaMaxima(e.target.value)
              }
            />
          </label>

          <label className="producto-campo">
            <span>Categoria</span>
            <select
              value={categoria}
              onChange={(e) =>
                setCategoria(e.target.value)
              }
            >
              <option value="">Seleccionar</option>

              {categorias.map((cat) => (
                <option
                  key={cat.id}
                  value={cat.nombre}
                >
                  {cat.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="producto-campo">
            <span>Sub categoria</span>
            <input
              value={subcategoria}
              onChange={(e) =>
                setSubcategoria(e.target.value)
              }
            />
          </label>

          <label className="producto-campo">
            <span>Familia</span>
            <input
              value={familia}
              onChange={(e) =>
                setFamilia(e.target.value)
              }
            />
          </label>

          <label className="producto-campo">
            <span>Cuenta contable</span>
            <input
              value={cuentaContable}
              onChange={(e) =>
                setCuentaContable(e.target.value)
              }
            />
          </label>

          <label className="producto-campo">
            <span>Centro de costo</span>
            <input
              value={centroCosto}
              onChange={(e) =>
                setCentroCosto(e.target.value)
              }
            />
          </label>

          <input
            placeholder="Nombre producto"
            value={nombre}
            onChange={(e) =>
              setNombre(e.target.value)
            }
          />

          <input
            placeholder="Código"
            value={codigo}
            onChange={(e) =>
              setCodigo(e.target.value)
            }
          />

          <input
            placeholder="UPC"
            value={upc}
            onChange={(e) => setUpc(e.target.value)}
          />

          <input
            type="number"
            placeholder="Precio"
            value={precio}
            onChange={(e) =>
              setPrecio(e.target.value)
            }
          />

          <input
            placeholder="Precio costo"
            value={precioCosto}
            onChange={(e) => {

              setPrecioCosto(e.target.value);

 //             calcularPrecioVenta(
 //               e.target.value,
 //               margen
 //             );
            }}
          />

          <input
            value={`Q${ganancia}`}
            disabled
          />

          <input
            placeholder="Marca"
            value={marca}
            onChange={(e) =>
              setMarca(e.target.value)
            }
          />

          <select
            value={tipoProducto}
            onChange={(e) =>
              aplicarTipoProducto(e.target.value)
            }
          >
            {tiposProducto.map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>

          <input
            placeholder="No. de serie"
            value={numeroSerie}
            onChange={(e) =>
              setNumeroSerie(e.target.value)
            }
          />

          <select
            value={medidaCompra}
            onChange={(e) =>
              setMedidaCompra(e.target.value)
            }
          >
            <option value="">Medida de compra</option>
            {medidas.map((medida) => (
              <option key={medida} value={medida}>
                {medida}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            step="0.0001"
            placeholder="Equivalente inventario"
            value={equivalenteInventario}
            onChange={(e) =>
              setEquivalenteInventario(e.target.value)
            }
          />

          <select
            value={medidaInventario}
            onChange={(e) =>
              setMedidaInventario(e.target.value)
            }
          >
            <option value="">Medida de inventario</option>
            {medidas.map((medida) => (
              <option key={medida} value={medida}>
                {medida}
              </option>
            ))}
          </select>

          <select
            value={departamento}
            onChange={(e) =>
              setDepartamento(e.target.value)
            }
          >
            <option value="">Departamento</option>

            {departamentos.map((dep) => (
              <option
                key={dep.id}
                value={dep.nombre}
              >
                {dep.nombre}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Existencia"
            value={existencia}
            onChange={(e) =>
              setExistencia(e.target.value)
            }
          />

          <input
            type="number"
            placeholder="Existencia mínima"
            value={existenciaMinima}
            onChange={(e) =>
              setExistenciaMinima(e.target.value)
            }
          />

          <input
            type="number"
            placeholder="Existencia máxima"
            value={existenciaMaxima}
            onChange={(e) =>
              setExistenciaMaxima(e.target.value)
            }
          />

          <select
            value={categoria}
            onChange={(e) =>
              setCategoria(e.target.value)
            }
          >
            <option value="">
              Seleccionar categoría
            </option>

            {categorias.map((cat) => (
              <option
                key={cat.id}
                value={cat.nombre}
              >
                {cat.nombre}
              </option>
            ))}
          </select>

          <input
            placeholder="Sub categoria"
            value={subcategoria}
            onChange={(e) =>
              setSubcategoria(e.target.value)
            }
          />

          <input
            placeholder="Familia"
            value={familia}
            onChange={(e) =>
              setFamilia(e.target.value)
            }
          />

          <input
            placeholder="Cuenta contable"
            value={cuentaContable}
            onChange={(e) =>
              setCuentaContable(e.target.value)
            }
          />

          <input
            placeholder="Centro de costo"
            value={centroCosto}
            onChange={(e) =>
              setCentroCosto(e.target.value)
            }
          />

          <div className="producto-imagen-panel">
            <div className="producto-imagen-preview">
              {imagenUrl ? (
                <img
                  src={imagenUrl}
                  alt={nombre || "Producto"}
                />
              ) : (
                <span>Imagen</span>
              )}
            </div>

            <div className="producto-imagen-controls">
              <strong>Imagen del producto</strong>
              <small>Se mostrara en los botones del POS</small>

              <label className="btn-imagen-producto">
                Seleccionar imagen
                <input
                  type="file"
                  accept="image/*"
                  onChange={seleccionarImagenProducto}
                />
              </label>

              {imagenUrl && (
                <button
                  type="button"
                  className="btn-quitar-imagen"
                  onClick={() => setImagenUrl("")}
                >
                  Quitar imagen
                </button>
              )}
            </div>
          </div>

          <div className="producto-config-panel">
            <label className="producto-switch">
              <input
                type="checkbox"
                checked={controlaStock}
                onChange={(e) =>
                  setControlaStock(e.target.checked)
                }
              />
              <span className="switch-ui"></span>
              <span>
                <strong>Controla inventario</strong>
                <small>Incluye stock, kardex y alertas</small>
              </span>
            </label>

            <label className="producto-switch">
              <input
                type="checkbox"
                checked={seFabrica}
                onChange={(e) =>
                  setSeFabrica(e.target.checked)
                }
              />
              <span className="switch-ui"></span>
              <span>
                <strong>Se fabrica</strong>
                <small>Preparado, receta o modificadores</small>
              </span>
            </label>

            <label className="producto-switch">
              <input
                type="checkbox"
                checked={habilitadoVenta}
                onChange={(e) =>
                  setHabilitadoVenta(e.target.checked)
                }
              />
              <span className="switch-ui"></span>
              <span>
                <strong>Disponible en POS</strong>
                <small>Visible para vender en caja</small>
              </span>
            </label>
          </div>

          <button
            className="btn-guardar"
            onClick={guardarProducto}
          >
            {editandoId
              ? "💾 Actualizar Producto"
              : "➕ Crear Producto"}
          </button>

        </div>

      <hr className="productos-separador" />

   <div className="productos-list-header">
     <div>
       <h2>Lista productos</h2>
       <p>Administra disponibilidad, inventario y datos comerciales.</p>
     </div>
   </div>

<div className="productos-filtros">

  <input
    type="text"
    placeholder="🔍 Buscar producto..."
    value={busqueda}
    onChange={(e) =>
      setBusqueda(e.target.value)
    }

  />

  <select
    value={filtroCategoria}
    onChange={(e) =>
      setFiltroCategoria(
        e.target.value
      )
    }

  >

    <option value="Todas">
      Todas las categorías
    </option>

    {categorias.map((cat) => (

      <option
        key={cat.id}
        value={cat.nombre}
      >
        {cat.nombre}
      </option>

    ))}

  </select>

</div>

<div className="tabla-productos">

  {modoInventario === "reabastecer" && (

  <div
    style={{
      marginBottom: "15px",
      padding: "10px",
      background: "#fef3c7",
      color: "#92400e",
      borderRadius: "10px",
      fontWeight: "600"
    }}
  >
    ⚠ Mostrando productos que necesitan reposición
  </div>

)}

  <table>

    <thead>
      <tr>
      <th>Código</th>
      <th>Producto</th>
      <th>Categoría</th>
      <th>Precio</th>
      <th>Existencia</th>
      <th>Estado</th>
      <th>Acciones</th>
    </tr>
    </thead>

    <tbody>

      {productosFiltrados.map((prod) => (

        <tr
          key={prod.id}
          className={
            prod.habilitado_venta === false
              ? "fila-no-venta"
              : productoAgotado(prod)
              ? "fila-agotado"
              : productoStockBajo(prod)
              ? "fila-stock-bajo"
              : "fila-disponible"
          }
        >

          <td>{prod.codigo}</td>

          <td>{prod.nombre}</td>

          <td>{prod.categoria}</td>

          <td>Q{prod.precio}</td>

          <td>
            <span
              className={
                productoAgotado(prod)
                  ? "stock-rojo"
                  : productoStockBajo(prod)
                  ? "stock-naranja"
                  : "stock-verde"
              }
            >
              {prod.existencia}
            </span>
          </td>

<td>

  {prod.habilitado_venta === false ? (

    <span className="estado-disponible">
      No disponible POS
    </span>

  ) : !productoControlaStock(prod) ? (

    <span className="estado-disponible">
      No inventariable
    </span>

  ) : productoAgotado(prod) ? (

    <span className="estado-agotado">
      🔴 Comprar urgente
    </span>

  ) : productoStockBajo(prod) ? (

    <span className="estado-stock-bajo">
      🟠 Reabastecer
    </span>

  ) : Number(prod.existencia) >= Number(prod.existencia_maxima || 999999) ? (

    <span className="estado-sobrestock">
      🔵 Sobre Stock
    </span>

  ) : (

    <span className="estado-disponible">
      🟢 Normal
    </span>

  )}

</td>

          <td>

            {prod.habilitado_venta === false ? (

              <span className="estado-ok">
                No disponible POS
              </span>

            ) : !productoControlaStock(prod) ? (

              <span className="estado-ok">
                No inventariable
              </span>

            ) : productoAgotado(prod) ? (

              <span className="estado-agotado">
                Agotado
              </span>

            ) : productoStockBajo(prod) ? (

              <span className="estado-bajo">
                Stock Bajo
              </span>

            ) : (

              <span className="estado-ok">
                Disponible
              </span>

            )}

          </td>

          <td>

  <button
    onClick={() => editarProducto(prod)}
  >
    ✏️
  </button>

  <button
    className="btn-complementos"
    onClick={() => abrirComplementos(prod)}
    title="Complementos"
  >
    Complementos
  </button>

  <button
    className={
      prod.habilitado_venta === false
        ? "btn-habilitar-venta"
        : "btn-deshabilitar-venta"
    }
    onClick={() => cambiarDisponibilidadVenta(prod)}
  >
    {prod.habilitado_venta === false
      ? "Mostrar POS"
      : "Ocultar POS"}
  </button>

  <button
    className="btn-eliminar"
    onClick={() => eliminarProducto(prod)}
  >
    🗑
  </button>

</td>

        </tr>

      ))}

    </tbody>

  </table>

</div>

</div>

    {mostrarModalComplementos && (
      <div className="modal-overlay">
        <div className="modal-card modal-complementos-producto">
          <h2>
            Complementos de {productoComplementos?.nombre}
          </h2>

          <p className="modal-ayuda">
            Crea grupos como Tipo de huevo, Base del licuado o Extras.
          </p>

          <button
            className="btn-complementos-agregar"
            onClick={agregarGrupoComplemento}
          >
            + Agregar grupo
          </button>

          <div className="complementos-admin-lista">
            {gruposComplementos.map((grupo, grupoIndex) => (
              <section
                className="complementos-admin-grupo"
                key={grupo.id}
              >
                <div className="complementos-admin-grid">
                  <input
                    placeholder="Nombre del grupo"
                    value={grupo.nombre}
                    onChange={(e) =>
                      actualizarGrupoComplemento(
                        grupoIndex,
                        "nombre",
                        e.target.value
                      )
                    }
                  />

                  <label>
                    <input
                      type="checkbox"
                      checked={grupo.obligatorio !== false}
                      onChange={(e) =>
                        actualizarGrupoComplemento(
                          grupoIndex,
                          "obligatorio",
                          e.target.checked
                        )
                      }
                    />
                    Obligatorio
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={grupo.seleccion_multiple === true}
                      onChange={(e) =>
                        actualizarGrupoComplemento(
                          grupoIndex,
                          "seleccion_multiple",
                          e.target.checked
                        )
                      }
                    />
                    Multiple
                  </label>

                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={grupo.minimo}
                    onChange={(e) =>
                      actualizarGrupoComplemento(
                        grupoIndex,
                        "minimo",
                        e.target.value
                      )
                    }
                  />

                  <input
                    type="number"
                    min="1"
                    placeholder="Max"
                    value={grupo.maximo}
                    onChange={(e) =>
                      actualizarGrupoComplemento(
                        grupoIndex,
                        "maximo",
                        e.target.value
                      )
                    }
                  />

                  <button
                    className="btn-complementos-quitar"
                    onClick={() => eliminarGrupoComplemento(grupoIndex)}
                  >
                    Quitar
                  </button>
                </div>

                <div className="complementos-admin-opciones">
                  {(grupo.opciones || []).map((opcion, opcionIndex) => (
                    <div
                      className="complementos-admin-opcion"
                      key={opcion.id}
                    >
                      <input
                        placeholder="Opcion"
                        value={opcion.nombre}
                        onChange={(e) =>
                          actualizarOpcionComplemento(
                            grupoIndex,
                            opcionIndex,
                            "nombre",
                            e.target.value
                          )
                        }
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Precio extra"
                        value={opcion.precio_extra}
                        onChange={(e) =>
                          actualizarOpcionComplemento(
                            grupoIndex,
                            opcionIndex,
                            "precio_extra",
                            e.target.value
                          )
                        }
                      />

                      <button
                        onClick={() =>
                          eliminarOpcionComplemento(
                            grupoIndex,
                            opcionIndex
                          )
                        }
                      >
                        Eliminar
                      </button>

                      <div className="complementos-subgrupos">
                        {(opcion.subgrupos || []).map(
                          (subgrupo, subgrupoIndex) => (
                            <div
                              className="complementos-subgrupo"
                              key={subgrupo.id}
                            >
                              <div className="complementos-admin-grid">
                                <input
                                  placeholder="Subgrupo"
                                  value={subgrupo.nombre}
                                  onChange={(e) =>
                                    actualizarSubgrupoComplemento(
                                      grupoIndex,
                                      opcionIndex,
                                      subgrupoIndex,
                                      "nombre",
                                      e.target.value
                                    )
                                  }
                                />

                                <label>
                                  <input
                                    type="checkbox"
                                    checked={subgrupo.obligatorio !== false}
                                    onChange={(e) =>
                                      actualizarSubgrupoComplemento(
                                        grupoIndex,
                                        opcionIndex,
                                        subgrupoIndex,
                                        "obligatorio",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  Obligatorio
                                </label>

                                <label>
                                  <input
                                    type="checkbox"
                                    checked={subgrupo.seleccion_multiple === true}
                                    onChange={(e) =>
                                      actualizarSubgrupoComplemento(
                                        grupoIndex,
                                        opcionIndex,
                                        subgrupoIndex,
                                        "seleccion_multiple",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  Multiple
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Min"
                                  value={subgrupo.minimo}
                                  onChange={(e) =>
                                    actualizarSubgrupoComplemento(
                                      grupoIndex,
                                      opcionIndex,
                                      subgrupoIndex,
                                      "minimo",
                                      e.target.value
                                    )
                                  }
                                />

                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Max"
                                  value={subgrupo.maximo}
                                  onChange={(e) =>
                                    actualizarSubgrupoComplemento(
                                      grupoIndex,
                                      opcionIndex,
                                      subgrupoIndex,
                                      "maximo",
                                      e.target.value
                                    )
                                  }
                                />

                                <button
                                  className="btn-complementos-quitar"
                                  onClick={() =>
                                    eliminarSubgrupoComplemento(
                                      grupoIndex,
                                      opcionIndex,
                                      subgrupoIndex
                                    )
                                  }
                                >
                                  Quitar
                                </button>
                              </div>

                              <div className="complementos-admin-opciones">
                                {(subgrupo.opciones || []).map(
                                  (subopcion, subopcionIndex) => (
                                    <div
                                      className="complementos-admin-opcion"
                                      key={subopcion.id}
                                    >
                                      <input
                                        placeholder="Subopcion"
                                        value={subopcion.nombre}
                                        onChange={(e) =>
                                          actualizarOpcionSubgrupoComplemento(
                                            grupoIndex,
                                            opcionIndex,
                                            subgrupoIndex,
                                            subopcionIndex,
                                            "nombre",
                                            e.target.value
                                          )
                                        }
                                      />

                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Precio extra"
                                        value={subopcion.precio_extra}
                                        onChange={(e) =>
                                          actualizarOpcionSubgrupoComplemento(
                                            grupoIndex,
                                            opcionIndex,
                                            subgrupoIndex,
                                            subopcionIndex,
                                            "precio_extra",
                                            e.target.value
                                          )
                                        }
                                      />

                                      <button
                                        onClick={() =>
                                          eliminarOpcionSubgrupoComplemento(
                                            grupoIndex,
                                            opcionIndex,
                                            subgrupoIndex,
                                            subopcionIndex
                                          )
                                        }
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  )
                                )}

                                <button
                                  className="btn-complementos-opcion"
                                  onClick={() =>
                                    agregarOpcionSubgrupoComplemento(
                                      grupoIndex,
                                      opcionIndex,
                                      subgrupoIndex
                                    )
                                  }
                                >
                                  + Agregar subopcion
                                </button>
                              </div>
                            </div>
                          )
                        )}

                        <button
                          className="btn-complementos-subgrupo"
                          onClick={() =>
                            agregarSubgrupoComplemento(
                              grupoIndex,
                              opcionIndex
                            )
                          }
                        >
                          + Agregar subopciones
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    className="btn-complementos-opcion"
                    onClick={() => agregarOpcionComplemento(grupoIndex)}
                  >
                    + Agregar opcion
                  </button>
                </div>
              </section>
            ))}

            {gruposComplementos.length === 0 && (
              <p className="modal-ayuda">
                Este producto aun no tiene complementos configurados.
              </p>
            )}
          </div>

          <div className="modal-actions">
            <button
              className="btn-cancelar"
              onClick={() => {
                setMostrarModalComplementos(false);
                setProductoComplementos(null);
                setGruposComplementos([]);
              }}
            >
              Cancelar
            </button>

            <button
              className="btn-confirmar"
              onClick={guardarComplementos}
            >
              Guardar complementos
            </button>
          </div>
        </div>
      </div>
    )}

    {mostrarModalEliminar && (

  <div className="modal-overlay">

    <div className="modal-card">

      <h2>
        Eliminar producto
      </h2>

      <p>

        ¿Desea eliminar:

        <strong>
          {" "}
          {productoEliminar?.nombre}
        </strong>

        ?

      </p>

      <div className="modal-botones">

        <button
          onClick={() => {

            setMostrarModalEliminar(false);

            setProductoEliminar(null);

          }}
        >
          Cancelar
        </button>

        <button
          className="btn-eliminar"
          onClick={
            confirmarEliminarProducto
          }
        >
          Eliminar
        </button>

      </div>

    </div>

  </div>

)}
    </div>
  );
}
