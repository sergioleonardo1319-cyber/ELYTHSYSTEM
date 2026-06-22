import { useEffect, useMemo, useState } from "react";
import "./Inventario.css";
import { API } from "../config";

function DashboardIcon({ type }) {
  const icons = {
    productos: (
      <>
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </>
    ),
    alerta: (
      <>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
    agotados: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </>
    ),
    comprar: (
      <>
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </>
    ),
    dinero: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12" />
        <path d="M16 9a4 4 0 0 0-4-2H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H12a4 4 0 0 1-4-2" />
      </>
    ),
    ganancia: (
      <>
        <path d="M4 18v3" />
        <path d="M8 14v7" />
        <path d="M12 16v5" />
        <path d="M16 10v11" />
        <path d="M20 6v15" />
        <path d="m2 15 6-6 4 4 9-9" />
        <path d="M17 4h4v4" />
      </>
    ),
  };

  return (
    <svg
      className="dashboard-svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {icons[type]}
    </svg>
  );
}

export default function Inventario({ user, onComprarProducto }) {
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [mostrarMenuAcciones, setMostrarMenuAcciones] =
    useState(false);
  const [mostrarModalMovimiento, setMostrarModalMovimiento] =
    useState(false);
  const [mostrarModalConteo, setMostrarModalConteo] =
    useState(false);
  const [mostrarModalCompra, setMostrarModalCompra] =
    useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] =
    useState(false);
  const [mostrarModalKardex, setMostrarModalKardex] =
    useState(false);
  const [guardandoMovimiento, setGuardandoMovimiento] =
    useState(false);
  const [guardandoCompra, setGuardandoCompra] =
    useState(false);
  const [mensajeMovimiento, setMensajeMovimiento] =
    useState("");
  const [errorMovimiento, setErrorMovimiento] =
    useState("");
  const [errorCompra, setErrorCompra] =
    useState("");
  const [movimiento, setMovimiento] = useState({
    producto_id: "",
    tipo: "entrada",
    cantidad: "",
    motivo: "",
    permitir_negativo: false,
  });
  const [conteoFisico, setConteoFisico] = useState({
    producto_id: "",
    cantidad: "",
  });
  const [filtrosHistorial, setFiltrosHistorial] = useState({
    desde: "",
    hasta: "",
    usuario: "",
    producto: "",
    tipo: "",
  });
  const [productoKardexId, setProductoKardexId] =
    useState("");
  const [compra, setCompra] = useState({
    proveedor_id: "",
    proveedor_nombre: "",
    documento: "",
    productos: [],
  });

  useEffect(() => {
    if (user) {
      cargarProductos();
      cargarMovimientos();
    }
  }, [user]);

  const headersAuth = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
  });

  const cargarProductos = async () => {
    const res = await fetch(
      `${API}/productos?empresa_id=${user.empresa_id}`,
      {
        headers: headersAuth(),
      }
    );

    const data = await res.json();

    setProductos(Array.isArray(data) ? data : []);
  };

  const cargarMovimientos = async () => {
    const res = await fetch(
      `${API}/inventario/movimientos?empresa_id=${user.empresa_id}`,
      {
        headers: headersAuth(),
      }
    );

    const data = await res.json();

    setMovimientos(Array.isArray(data) ? data : []);
  };

  const cargarProveedores = async () => {
    const res = await fetch(
      `${API}/proveedores?empresa_id=${user.empresa_id}`,
      {
        headers: headersAuth(),
      }
    );

    const data = await res.json();

    setProveedores(Array.isArray(data) ? data : []);
  };

  const productoSeleccionado = useMemo(
    () =>
      productos.find(
        (producto) =>
          String(producto.id) === String(movimiento.producto_id)
      ),
    [productos, movimiento.producto_id]
  );

  const productoConteoSeleccionado = useMemo(
    () =>
      productos.find(
        (producto) =>
          String(producto.id) ===
          String(conteoFisico.producto_id)
      ),
    [productos, conteoFisico.producto_id]
  );

  const existenciaActual = Number(
    productoSeleccionado?.existencia || 0
  );

  const cantidadMovimiento = Number(movimiento.cantidad || 0);
  const puedeGestionarInventario =
    user?.rol === "admin" || user?.rol === "inventario";
  const puedeCrearCompra =
    user?.rol === "admin" || user?.rol === "compras";
  const existenciaConteoActual = Number(
    productoConteoSeleccionado?.existencia || 0
  );
  const cantidadConteo = Number(conteoFisico.cantidad || 0);
  const diferenciaConteo =
    conteoFisico.cantidad === ""
      ? 0
      : cantidadConteo - existenciaConteoActual;

  const existenciaResultado = (() => {
    if (movimiento.tipo === "entrada") {
      return existenciaActual + cantidadMovimiento;
    }

    if (
      movimiento.tipo === "salida" ||
      movimiento.tipo === "merma"
    ) {
      return existenciaActual - cantidadMovimiento;
    }

    if (movimiento.tipo === "ajuste") {
      return cantidadMovimiento;
    }

    return existenciaActual;
  })();
  const movimientoDescuentaStock =
    movimiento.tipo === "salida" || movimiento.tipo === "merma";
  const movimientoDejaNegativo =
    movimientoDescuentaStock &&
    movimiento.cantidad !== "" &&
    existenciaResultado < 0;
  const puedeAutorizarStockNegativo = user?.rol === "admin";

  const abrirModalMovimiento = () => {
    setErrorMovimiento("");
    setMostrarMenuAcciones(false);
    setMovimiento({
      producto_id: productos[0]?.id || "",
      tipo: "entrada",
      cantidad: "",
      motivo: "",
      permitir_negativo: false,
    });
    setMostrarModalMovimiento(true);
  };

  const abrirModalConteo = () => {
    setErrorMovimiento("");
    setMostrarMenuAcciones(false);
    setConteoFisico({
      producto_id: productos[0]?.id || "",
      cantidad: "",
    });
    setMostrarModalConteo(true);
  };

  const crearLineaCompra = () => ({
    producto_id: productos[0]?.id || "",
    cantidad: "",
    costo_unitario: "",
  });

  const abrirModalCompra = () => {
    setMostrarMenuAcciones(false);
    setErrorCompra("");
    setCompra({
      proveedor_id: proveedores[0]?.id || "",
      proveedor_nombre: "",
      documento: "",
      productos: [crearLineaCompra()],
    });
    setMostrarModalCompra(true);
  };

  const cerrarModalCompra = () => {
    if (guardandoCompra) return;

    setMostrarModalCompra(false);
    setErrorCompra("");
  };

  const abrirModalHistorial = () => {
    setMostrarMenuAcciones(false);
    cargarMovimientos();
    setMostrarModalHistorial(true);
  };

  const abrirModalKardex = () => {
    setMostrarMenuAcciones(false);
    cargarMovimientos();
    setProductoKardexId(productos[0]?.id ? String(productos[0].id) : "");
    setMostrarModalKardex(true);
  };

  const cerrarModalMovimiento = () => {
    if (guardandoMovimiento) return;

    setMostrarModalMovimiento(false);
    setErrorMovimiento("");
  };

  const cerrarModalConteo = () => {
    if (guardandoMovimiento) return;

    setMostrarModalConteo(false);
    setErrorMovimiento("");
  };

  const guardarMovimiento = async (e) => {
    e.preventDefault();

    if (!movimiento.producto_id) {
      setErrorMovimiento("Seleccione un producto.");
      return;
    }

    if (
      movimiento.cantidad === "" ||
      Number(movimiento.cantidad) < 0
    ) {
      setErrorMovimiento("Ingrese una cantidad valida.");
      return;
    }

    if (
      movimientoDejaNegativo &&
      !movimiento.permitir_negativo
    ) {
      setErrorMovimiento(
        "La salida o merma deja el stock negativo. Solo admin puede autorizarlo explicitamente."
      );
      return;
    }

    try {
      setGuardandoMovimiento(true);
      setErrorMovimiento("");

      const res = await fetch(
        `${API}/inventario/movimiento`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headersAuth(),
          },
          body: JSON.stringify({
            ...movimiento,
            cantidad: Number(movimiento.cantidad),
            empresa_id: user.empresa_id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setErrorMovimiento(
          data.error || "Error registrando movimiento."
        );
        return;
      }

      setMostrarModalMovimiento(false);
      setMensajeMovimiento("Movimiento de inventario guardado.");
      cargarProductos();
      cargarMovimientos();

      setTimeout(() => {
        setMensajeMovimiento("");
      }, 3000);

    } catch (error) {
      console.error(error);
      setErrorMovimiento("Error conectando con el servidor.");
    } finally {
      setGuardandoMovimiento(false);
    }
  };

  const guardarConteoFisico = async (e) => {
    e.preventDefault();

    if (!conteoFisico.producto_id) {
      setErrorMovimiento("Seleccione un producto.");
      return;
    }

    if (
      conteoFisico.cantidad === "" ||
      Number(conteoFisico.cantidad) < 0
    ) {
      setErrorMovimiento("Ingrese el conteo real.");
      return;
    }

    try {
      setGuardandoMovimiento(true);
      setErrorMovimiento("");

      const res = await fetch(
        `${API}/inventario/movimiento`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headersAuth(),
          },
          body: JSON.stringify({
            producto_id: conteoFisico.producto_id,
            tipo: "ajuste",
            cantidad: Number(conteoFisico.cantidad),
            motivo: "Conteo fisico",
            empresa_id: user.empresa_id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setErrorMovimiento(
          data.error || "Error registrando conteo fisico."
        );
        return;
      }

      setMostrarModalConteo(false);
      setMensajeMovimiento("Conteo fisico guardado y stock ajustado.");
      cargarProductos();
      cargarMovimientos();

      setTimeout(() => {
        setMensajeMovimiento("");
      }, 3000);

    } catch (error) {
      console.error(error);
      setErrorMovimiento("Error conectando con el servidor.");
    } finally {
      setGuardandoMovimiento(false);
    }
  };

  const actualizarLineaCompra = (index, campo, valor) => {
    setCompra((prev) => ({
      ...prev,
      productos: prev.productos.map((linea, i) =>
        i === index
          ? {
              ...linea,
              [campo]: valor,
            }
          : linea
      ),
    }));
  };

  const agregarLineaCompra = () => {
    setCompra((prev) => ({
      ...prev,
      productos: [
        ...prev.productos,
        crearLineaCompra(),
      ],
    }));
  };

  const eliminarLineaCompra = (index) => {
    setCompra((prev) => ({
      ...prev,
      productos:
        prev.productos.length === 1
          ? prev.productos
          : prev.productos.filter((_, i) => i !== index),
    }));
  };

  const totalCompra = compra.productos.reduce(
    (total, linea) =>
      total +
      Number(linea.cantidad || 0) *
        Number(linea.costo_unitario || 0),
    0
  );

  const guardarCompra = async (e) => {
    e.preventDefault();

    const tieneProveedor =
      compra.proveedor_id || compra.proveedor_nombre.trim();

    if (!tieneProveedor) {
      setErrorCompra("Seleccione o escriba un proveedor.");
      return;
    }

    const lineasValidas = compra.productos.every(
      (linea) =>
        linea.producto_id &&
        Number(linea.cantidad) > 0 &&
        Number(linea.costo_unitario) >= 0
    );

    if (!lineasValidas) {
      setErrorCompra("Revise producto, cantidad y costo.");
      return;
    }

    try {
      setGuardandoCompra(true);
      setErrorCompra("");

      const res = await fetch(`${API}/compras`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headersAuth(),
        },
        body: JSON.stringify({
          ...compra,
          proveedor_id: compra.proveedor_id || null,
          proveedor_nombre: compra.proveedor_nombre.trim(),
          empresa_id: user.empresa_id,
          productos: compra.productos.map((linea) => ({
            producto_id: linea.producto_id,
            cantidad: Number(linea.cantidad),
            costo_unitario: Number(linea.costo_unitario),
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorCompra(data.error || "Error registrando compra.");
        return;
      }

      setMostrarModalCompra(false);
      setMensajeMovimiento("Compra guardada e inventario actualizado.");
      cargarProductos();
      cargarMovimientos();
      cargarProveedores();

      setTimeout(() => {
        setMensajeMovimiento("");
      }, 3000);

    } catch (error) {
      console.error(error);
      setErrorCompra("Error conectando con el servidor.");
    } finally {
      setGuardandoCompra(false);
    }
  };

  const formatoFecha = (fecha) =>
    new Date(fecha).toLocaleString("es-GT", {
      dateStyle: "short",
      timeStyle: "short",
    });

  const descargarCSV = (nombreArchivo, columnas, filas) => {
    const limpiarValor = (valor) =>
      `"${String(valor ?? "")
        .replaceAll('"', '""')
        .replaceAll("\n", " ")}"`;

    const contenido = [
      columnas.map(limpiarValor).join(";"),
      ...filas.map((fila) =>
        columnas
          .map((columna) => limpiarValor(fila[columna]))
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob([`\uFEFF${contenido}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(url);
  };

  const usuariosMovimiento = [
    ...new Map(
      movimientos
        .filter((item) => item.usuario_id)
        .map((item) => [
          item.usuario_id,
          item.usuario || `Usuario ${item.usuario_id}`,
        ])
    ),
  ];

  const productosMovimiento = [
    ...new Set(
      movimientos
        .map((item) => item.producto)
        .filter(Boolean)
    ),
  ];

  const movimientosFiltrados = movimientos.filter((item) => {
    const fechaMovimiento = new Date(item.fecha);
    const desde = filtrosHistorial.desde
      ? new Date(`${filtrosHistorial.desde}T00:00:00`)
      : null;
    const hasta = filtrosHistorial.hasta
      ? new Date(`${filtrosHistorial.hasta}T23:59:59`)
      : null;

    const coincideDesde =
      !desde || fechaMovimiento >= desde;
    const coincideHasta =
      !hasta || fechaMovimiento <= hasta;
    const coincideUsuario =
      !filtrosHistorial.usuario ||
      String(item.usuario_id) === filtrosHistorial.usuario;
    const coincideProducto =
      !filtrosHistorial.producto ||
      item.producto === filtrosHistorial.producto;
    const coincideTipo =
      !filtrosHistorial.tipo ||
      item.tipo === filtrosHistorial.tipo;

    return (
      coincideDesde &&
      coincideHasta &&
      coincideUsuario &&
      coincideProducto &&
      coincideTipo
    );
  });

  const limpiarFiltrosHistorial = () => {
    setFiltrosHistorial({
      desde: "",
      hasta: "",
      usuario: "",
      producto: "",
      tipo: "",
    });
  };

  const productoKardex = productos.find(
    (producto) => String(producto.id) === productoKardexId
  );

  const movimientosKardex = movimientos
    .filter(
      (item) =>
        String(item.producto_id) === productoKardexId
    )
    .sort(
      (a, b) =>
        new Date(a.fecha).getTime() -
        new Date(b.fecha).getTime()
    );

  const movimientosKardexConSaldo = movimientosKardex.reduce(
    (lista, item) => {
      const cantidad = Number(item.cantidad || 0);
      const saldoAnterior =
        lista.length > 0 ? lista[lista.length - 1].saldo : 0;
      let saldo = saldoAnterior;

      if (item.tipo === "entrada") {
        saldo += cantidad;
      }

      if (item.tipo === "salida" || item.tipo === "merma") {
        saldo -= cantidad;
      }

      if (item.tipo === "ajuste") {
        saldo = cantidad;
      }

      return [
        ...lista,
        {
          ...item,
          saldo,
        },
      ];
    },
    []
  );

  const saldoCalculadoKardex =
    movimientosKardexConSaldo.length > 0
      ? movimientosKardexConSaldo[
          movimientosKardexConSaldo.length - 1
        ].saldo
      : 0;

  const totalEntradasKardex = movimientosKardex
    .filter((item) => item.tipo === "entrada")
    .reduce((total, item) => total + Number(item.cantidad || 0), 0);

  const totalSalidasKardex = movimientosKardex
    .filter(
      (item) =>
        item.tipo === "salida" ||
        item.tipo === "merma"
    )
    .reduce((total, item) => total + Number(item.cantidad || 0), 0);

  const productosConStock = productos.filter(
    (producto) => producto.controla_stock !== false
  );

  const totalProductos = productos.length;

  const stockBajo = productosConStock.filter(
    (p) =>
      Number(p.existencia_minima) > 0 &&
      Number(p.existencia) > 0 &&
      Number(p.existencia) <= Number(p.existencia_minima)
  ).length;

  const agotados = productosConStock.filter(
    (p) =>
      Number(p.existencia_minima) > 0 &&
      Number(p.existencia) <= 0
  ).length;

  const comprarHoy = productosConStock.filter(
    (p) =>
      Number(p.existencia_minima) > 0 &&
      Number(p.existencia) <= Number(p.existencia_minima)
  ).length;

  const valorInventario = productosConStock.reduce(
    (total, p) =>
      total +
      Number(p.precio_costo || 0) *
        Number(p.existencia || 0),
    0
  );

  const gananciaPotencial = productosConStock.reduce(
    (total, p) =>
      total +
      (Number(p.precio || 0) -
        Number(p.precio_costo || 0)) *
        Number(p.existencia || 0),
    0
  );

  const productosReabastecer = productosConStock.filter(
    (p) =>
      Number(p.existencia_minima) > 0 &&
      Number(p.existencia) <= Number(p.existencia_minima)
  );

  const productosAgotados = productosConStock.filter(
    (p) =>
      Number(p.existencia_minima) > 0 &&
      Number(p.existencia) <= 0
  );

  const exportarStockBajo = () => {
    descargarCSV(
      "stock-bajo.csv",
      [
        "Estado",
        "Producto",
        "Existencia",
        "Minimo",
        "Maximo",
        "Cantidad sugerida",
      ],
      productosReabastecer.map((producto) => ({
        Estado:
          Number(producto.existencia) <= 0
            ? "Agotado"
            : "Stock bajo",
        Producto: producto.nombre,
        Existencia: producto.existencia,
        Minimo: producto.existencia_minima,
        Maximo: producto.existencia_maxima || "",
        "Cantidad sugerida": calcularCantidadSugerida(producto),
      }))
    );
  };

  const exportarHistorialMovimientos = () => {
    descargarCSV(
      "historial-movimientos.csv",
      [
        "Fecha",
        "Producto",
        "Tipo",
        "Cantidad",
        "Usuario",
        "Motivo",
      ],
      movimientosFiltrados.map((item) => ({
        Fecha: formatoFecha(item.fecha),
        Producto: item.producto || "",
        Tipo: item.tipo,
        Cantidad: item.cantidad,
        Usuario: item.usuario || `Usuario ${item.usuario_id}`,
        Motivo: item.motivo || "",
      }))
    );
  };

  const exportarKardex = () => {
    descargarCSV(
      `kardex-${productoKardex?.nombre || "producto"}.csv`,
      [
        "Fecha",
        "Producto",
        "Movimiento",
        "Cantidad",
        "Saldo",
        "Usuario",
        "Motivo",
      ],
      movimientosKardexConSaldo.map((item) => ({
        Fecha: formatoFecha(item.fecha),
        Producto: productoKardex?.nombre || item.producto || "",
        Movimiento: item.tipo,
        Cantidad: item.cantidad,
        Saldo: item.saldo,
        Usuario: item.usuario || `Usuario ${item.usuario_id}`,
        Motivo: item.motivo || "",
      }))
    );
  };

  const calcularCantidadSugerida = (producto) => {
    const existencia = Number(producto.existencia || 0);
    const minimo = Number(producto.existencia_minima || 0);
    const maximo = Number(producto.existencia_maxima || 0);

    if (maximo > minimo) {
      return Math.max(maximo - existencia, 1);
    }

    return Math.max(minimo - existencia, 1);
  };

  const comprarProducto = (producto) => {
    if (!onComprarProducto) return;

    onComprarProducto({
      ...producto,
      cantidad_sugerida: calcularCantidadSugerida(producto),
    });
  };

  return (
    <div className="inventario-container">
      {mensajeMovimiento && (
        <div className="inventario-toast">
          {mensajeMovimiento}
        </div>
      )}

      <div className="inventario-header">
        <h1 className="inventario-title">
          Inventario
        </h1>

        {puedeGestionarInventario && (
          <div className="inventario-menu-wrap">
            <button
              className="btn-nuevo-movimiento"
              onClick={() =>
                setMostrarMenuAcciones(!mostrarMenuAcciones)
              }
            >
              Acciones de inventario
            </button>

            {mostrarMenuAcciones && (
              <div className="inventario-menu">
                <button
                  type="button"
                  onClick={abrirModalMovimiento}
                  disabled={productos.length === 0}
                >
                  <strong>Nuevo movimiento</strong>
                  <span>Entrada, salida, ajuste o merma</span>
                </button>

                <button
                  type="button"
                  onClick={abrirModalHistorial}
                >
                  <strong>Historial de movimientos</strong>
                  <span>Consultar y filtrar registros</span>
                </button>

                <button
                  type="button"
                  onClick={abrirModalConteo}
                  disabled={productos.length === 0}
                >
                  <strong>Conteo fisico</strong>
                  <span>Ajustar stock con conteo real</span>
                </button>

                <button
                  type="button"
                  onClick={abrirModalKardex}
                  disabled={productos.length === 0}
                >
                  <strong>Kardex por producto</strong>
                  <span>Ver entradas, salidas y responsable</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="dashboard-cards">
        <div className="dashboard-card dashboard-productos">
          <div className="dashboard-icon">
            <DashboardIcon type="productos" />
          </div>
          <div className="dashboard-info">
            <span>Productos</span>
            <h2>{totalProductos}</h2>
          </div>
        </div>

        <div className="dashboard-card dashboard-stock-bajo">
          <div className="dashboard-icon">
            <DashboardIcon type="alerta" />
          </div>
          <div className="dashboard-info">
            <span>Stock Bajo</span>
            <h2>{stockBajo}</h2>
          </div>
        </div>

        <div className="dashboard-card dashboard-agotados">
          <div className="dashboard-icon">
            <DashboardIcon type="agotados" />
          </div>
          <div className="dashboard-info">
            <span>Agotados</span>
            <h2>{agotados}</h2>
          </div>
        </div>

        <div className="dashboard-card dashboard-comprar">
          <div className="dashboard-icon">
            <DashboardIcon type="comprar" />
          </div>
          <div className="dashboard-info">
            <span>Comprar Hoy</span>
            <h2>{comprarHoy}</h2>
          </div>
        </div>

        <div className="dashboard-card dashboard-inventario">
          <div className="dashboard-icon">
            <DashboardIcon type="dinero" />
          </div>
          <div className="dashboard-info">
            <span>Valor Inventario</span>
            <h2>Q {valorInventario.toFixed(2)}</h2>
          </div>
        </div>

        <div className="dashboard-card dashboard-ganancia">
          <div className="dashboard-icon">
            <DashboardIcon type="ganancia" />
          </div>
          <div className="dashboard-info">
            <span>Ganancia Potencial</span>
            <h2>Q {gananciaPotencial.toFixed(2)}</h2>
          </div>
        </div>
      </div>

      <section className="inventario-section">
        <div className="inventario-section-header">
          <div>
            <h2>Productos para Reabastecer</h2>
          </div>

          <button
            type="button"
            className="btn-exportar-reporte"
            onClick={exportarStockBajo}
            disabled={productosReabastecer.length === 0}
          >
            Exportar stock bajo
          </button>
        </div>

        <table className="inventario-table">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Producto</th>
              <th>Existencia</th>
              <th>Minimo</th>
              <th>Maximo</th>
              <th>Sugerido</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {productosReabastecer.length === 0 ? (
              <tr>
                <td colSpan="7">
                  No hay productos pendientes de reabastecer.
                </td>
              </tr>
            ) : (
              productosReabastecer.map((p) => {
                const cantidadSugerida =
                  calcularCantidadSugerida(p);

                return (
                  <tr key={p.id}>
                    <td>
                      {Number(p.existencia) <= 0 ? (
                        <span className="estado-agotado">
                          Agotado
                        </span>
                      ) : (
                        <span className="estado-bajo">
                          Stock Bajo
                        </span>
                      )}
                    </td>

                    <td>{p.nombre}</td>
                    <td>{p.existencia}</td>
                    <td>{p.existencia_minima}</td>
                    <td>{p.existencia_maxima || "-"}</td>

                    <td>
                      <strong>{cantidadSugerida}</strong>
                      <span className="sugerencia-compra">
                        unidades
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn-comprar-alerta"
                        onClick={() => comprarProducto(p)}
                        disabled={!puedeCrearCompra}
                        title={
                          puedeCrearCompra
                            ? "Crear compra con este producto"
                            : "Este rol no puede registrar compras"
                        }
                      >
                        Comprar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section className="inventario-section">
        <h2>Productos Agotados</h2>

        <table className="inventario-table agotados-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoria</th>
              <th>Existencia</th>
            </tr>
          </thead>

          <tbody>
            {productosAgotados.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{p.categoria}</td>
                <td>
                  <span className="stock-rojo">
                    0
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {mostrarModalMovimiento && puedeGestionarInventario && (
        <div className="inventario-modal-overlay">
          <form
            className="inventario-modal"
            onSubmit={guardarMovimiento}
          >
            <div className="inventario-modal-header">
              <div>
                <p className="inventario-modal-eyebrow">
                  Control de inventario
                </p>
                <h2>Nuevo Movimiento</h2>
              </div>

              <button
                type="button"
                className="inventario-modal-cerrar"
                onClick={cerrarModalMovimiento}
                aria-label="Cerrar"
              >
                x
              </button>
            </div>

            <div className="inventario-auditoria">
              <span>Registrado por</span>
              <strong>{user?.nombre || "Usuario actual"}</strong>
            </div>

            <label className="inventario-field">
              <span>Producto</span>
              <select
                value={movimiento.producto_id}
                onChange={(e) =>
                  setMovimiento({
                    ...movimiento,
                    producto_id: e.target.value,
                  })
                }
              >
                {productos.map((producto) => (
                  <option
                    key={producto.id}
                    value={producto.id}
                  >
                    {producto.nombre}
                  </option>
                ))}
              </select>
            </label>

            <div className="inventario-stock-preview">
              <div>
                <span>Stock actual</span>
                <strong>{existenciaActual}</strong>
              </div>

              <div>
                <span>Resultado</span>
                <strong>{existenciaResultado}</strong>
              </div>
            </div>

            <div className="inventario-field">
              <span>Tipo</span>

              <div className="inventario-tipos">
                {[
                  ["entrada", "+", "Entrada"],
                  ["salida", "-", "Salida"],
                  ["ajuste", "=", "Ajuste"],
                  ["merma", "!", "Merma"],
                ].map(([valor, simbolo, label]) => (
                  <label
                    key={valor}
                    className={
                      movimiento.tipo === valor
                        ? "tipo-movimiento activo"
                        : "tipo-movimiento"
                    }
                  >
                    <input
                      type="radio"
                      name="tipo"
                      value={valor}
                      checked={movimiento.tipo === valor}
                      onChange={(e) =>
                        setMovimiento({
                          ...movimiento,
                          tipo: e.target.value,
                          permitir_negativo: false,
                        })
                      }
                    />
                    <span className="tipo-icono">{simbolo}</span>
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="inventario-field">
              <span>
                {movimiento.tipo === "ajuste"
                  ? "Conteo fisico"
                  : "Cantidad"}
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={movimiento.cantidad}
                onChange={(e) =>
                  setMovimiento({
                    ...movimiento,
                    cantidad: e.target.value,
                  })
                }
                placeholder={
                  movimiento.tipo === "ajuste"
                    ? "Existencia real"
                    : "Unidades"
                }
              />
            </label>

            {movimientoDejaNegativo && (
              <div className="stock-negativo-alerta">
                <div>
                  <span>Stock negativo</span>
                  <strong>
                    Resultado: {existenciaResultado}
                  </strong>
                </div>

                {puedeAutorizarStockNegativo ? (
                  <label className="stock-negativo-check">
                    <input
                      type="checkbox"
                      checked={Boolean(
                        movimiento.permitir_negativo
                      )}
                      onChange={(e) =>
                        setMovimiento({
                          ...movimiento,
                          permitir_negativo: e.target.checked,
                        })
                      }
                    />
                    <span>
                      Autorizar este movimiento aunque deje stock negativo
                    </span>
                  </label>
                ) : (
                  <p>
                    Este rol no puede autorizar stock negativo.
                  </p>
                )}
              </div>
            )}

            <label className="inventario-field">
              <span>Motivo</span>
              <textarea
                value={movimiento.motivo}
                onChange={(e) =>
                  setMovimiento({
                    ...movimiento,
                    motivo: e.target.value,
                  })
                }
                rows="4"
                placeholder="Ejemplo: producto vencido, compra recibida, conteo fisico..."
              />
            </label>

            {errorMovimiento && (
              <div className="inventario-error">
                {errorMovimiento}
              </div>
            )}

            <div className="inventario-modal-actions">
              <button
                type="button"
                className="btn-cancelar-movimiento"
                onClick={cerrarModalMovimiento}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-guardar-movimiento"
                disabled={
                  guardandoMovimiento ||
                  (movimientoDejaNegativo &&
                    !movimiento.permitir_negativo)
                }
              >
                {guardandoMovimiento
                  ? "Guardando..."
                  : "Guardar movimiento"}
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarModalCompra && puedeGestionarInventario && (
        <div className="inventario-modal-overlay">
          <form
            className="inventario-compra-modal"
            onSubmit={guardarCompra}
          >
            <div className="inventario-modal-header">
              <div>
                <p className="inventario-modal-eyebrow">
                  Reabastecimiento
                </p>
                <h2>Nueva compra</h2>
              </div>

              <button
                type="button"
                className="inventario-modal-cerrar"
                onClick={cerrarModalCompra}
                aria-label="Cerrar"
              >
                x
              </button>
            </div>

            <div className="compra-grid">
              <label className="inventario-field">
                <span>Proveedor registrado</span>
                <select
                  value={compra.proveedor_id}
                  onChange={(e) =>
                    setCompra({
                      ...compra,
                      proveedor_id: e.target.value,
                      proveedor_nombre: "",
                    })
                  }
                >
                  <option value="">Nuevo proveedor</option>
                  {proveedores.map((proveedor) => (
                    <option
                      key={proveedor.id}
                      value={proveedor.id}
                    >
                      {proveedor.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventario-field">
                <span>Nuevo proveedor</span>
                <input
                  value={compra.proveedor_nombre}
                  disabled={Boolean(compra.proveedor_id)}
                  onChange={(e) =>
                    setCompra({
                      ...compra,
                      proveedor_nombre: e.target.value,
                    })
                  }
                  placeholder="Nombre del proveedor"
                />
              </label>

              <label className="inventario-field">
                <span>Documento / factura</span>
                <input
                  value={compra.documento}
                  onChange={(e) =>
                    setCompra({
                      ...compra,
                      documento: e.target.value,
                    })
                  }
                  placeholder="Ejemplo: A-001245"
                />
              </label>
            </div>

            <div className="compra-detalle">
              <div className="compra-detalle-header">
                <h3>Detalle de productos</h3>

                <button
                  type="button"
                  onClick={agregarLineaCompra}
                >
                  + Agregar producto
                </button>
              </div>

              {compra.productos.map((linea, index) => {
                const subtotal =
                  Number(linea.cantidad || 0) *
                  Number(linea.costo_unitario || 0);

                return (
                  <div
                    className="compra-linea"
                    key={index}
                  >
                    <label>
                      <span>Producto</span>
                      <select
                        value={linea.producto_id}
                        onChange={(e) =>
                          actualizarLineaCompra(
                            index,
                            "producto_id",
                            e.target.value
                          )
                        }
                      >
                        {productos.map((producto) => (
                          <option
                            key={producto.id}
                            value={producto.id}
                          >
                            {producto.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Cantidad</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={linea.cantidad}
                        onChange={(e) =>
                          actualizarLineaCompra(
                            index,
                            "cantidad",
                            e.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>Costo unitario</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.costo_unitario}
                        onChange={(e) =>
                          actualizarLineaCompra(
                            index,
                            "costo_unitario",
                            e.target.value
                          )
                        }
                      />
                    </label>

                    <div className="compra-subtotal">
                      <span>Subtotal</span>
                      <strong>Q {subtotal.toFixed(2)}</strong>
                    </div>

                    <button
                      type="button"
                      className="btn-quitar-linea"
                      onClick={() => eliminarLineaCompra(index)}
                      disabled={compra.productos.length === 1}
                    >
                      Quitar
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="compra-total">
              <span>Total compra</span>
              <strong>Q {totalCompra.toFixed(2)}</strong>
            </div>

            {errorCompra && (
              <div className="inventario-error">
                {errorCompra}
              </div>
            )}

            <div className="inventario-modal-actions">
              <button
                type="button"
                className="btn-cancelar-movimiento"
                onClick={cerrarModalCompra}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-guardar-movimiento"
                disabled={guardandoCompra}
              >
                {guardandoCompra
                  ? "Guardando..."
                  : "Guardar compra"}
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarModalConteo && puedeGestionarInventario && (
        <div className="inventario-modal-overlay">
          <form
            className="inventario-modal"
            onSubmit={guardarConteoFisico}
          >
            <div className="inventario-modal-header">
              <div>
                <p className="inventario-modal-eyebrow">
                  Auditoria de inventario
                </p>
                <h2>Conteo fisico</h2>
              </div>

              <button
                type="button"
                className="inventario-modal-cerrar"
                onClick={cerrarModalConteo}
                aria-label="Cerrar"
              >
                x
              </button>
            </div>

            <div className="inventario-auditoria">
              <span>Registrado por</span>
              <strong>{user?.nombre || "Usuario actual"}</strong>
            </div>

            <label className="inventario-field">
              <span>Producto</span>
              <select
                value={conteoFisico.producto_id}
                onChange={(e) =>
                  setConteoFisico({
                    ...conteoFisico,
                    producto_id: e.target.value,
                  })
                }
              >
                {productos.map((producto) => (
                  <option
                    key={producto.id}
                    value={producto.id}
                  >
                    {producto.nombre}
                  </option>
                ))}
              </select>
            </label>

            <div className="inventario-stock-preview conteo-preview">
              <div>
                <span>Existencia actual</span>
                <strong>{existenciaConteoActual}</strong>
              </div>

              <div>
                <span>Conteo real</span>
                <strong>
                  {conteoFisico.cantidad === ""
                    ? "-"
                    : cantidadConteo}
                </strong>
              </div>

              <div>
                <span>Diferencia</span>
                <strong
                  className={
                    diferenciaConteo < 0
                      ? "conteo-diferencia negativa"
                      : "conteo-diferencia"
                  }
                >
                  {conteoFisico.cantidad === ""
                    ? "-"
                    : diferenciaConteo}
                </strong>
              </div>
            </div>

            <label className="inventario-field">
              <span>Conteo real</span>
              <input
                type="number"
                min="0"
                step="1"
                value={conteoFisico.cantidad}
                onChange={(e) =>
                  setConteoFisico({
                    ...conteoFisico,
                    cantidad: e.target.value,
                  })
                }
                placeholder="Existencia fisica encontrada"
              />
            </label>

            <div className="conteo-motivo">
              <span>Motivo automatico</span>
              <strong>Conteo fisico</strong>
            </div>

            {errorMovimiento && (
              <div className="inventario-error">
                {errorMovimiento}
              </div>
            )}

            <div className="inventario-modal-actions">
              <button
                type="button"
                className="btn-cancelar-movimiento"
                onClick={cerrarModalConteo}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-guardar-movimiento"
                disabled={guardandoMovimiento}
              >
                {guardandoMovimiento
                  ? "Guardando..."
                  : "Guardar conteo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarModalHistorial && puedeGestionarInventario && (
        <div className="inventario-modal-overlay">
          <div className="inventario-historial-modal">
            <div className="inventario-modal-header">
              <div>
                <p className="inventario-modal-eyebrow">
                  Auditoria
                </p>
                <h2>Historial de movimientos</h2>
              </div>

              <div className="modal-header-actions">
                <button
                  type="button"
                  className="btn-exportar-reporte"
                  onClick={exportarHistorialMovimientos}
                  disabled={movimientosFiltrados.length === 0}
                >
                  Exportar
                </button>

                <button
                  type="button"
                  className="inventario-modal-cerrar"
                  onClick={() => setMostrarModalHistorial(false)}
                  aria-label="Cerrar"
                >
                  x
                </button>
              </div>
            </div>

            <div className="historial-filtros">
              <label>
                <span>Desde</span>
                <input
                  type="date"
                  value={filtrosHistorial.desde}
                  onChange={(e) =>
                    setFiltrosHistorial({
                      ...filtrosHistorial,
                      desde: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Hasta</span>
                <input
                  type="date"
                  value={filtrosHistorial.hasta}
                  onChange={(e) =>
                    setFiltrosHistorial({
                      ...filtrosHistorial,
                      hasta: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Usuario</span>
                <select
                  value={filtrosHistorial.usuario}
                  onChange={(e) =>
                    setFiltrosHistorial({
                      ...filtrosHistorial,
                      usuario: e.target.value,
                    })
                  }
                >
                  <option value="">Todos</option>
                  {usuariosMovimiento.map(([id, nombre]) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Producto</span>
                <select
                  value={filtrosHistorial.producto}
                  onChange={(e) =>
                    setFiltrosHistorial({
                      ...filtrosHistorial,
                      producto: e.target.value,
                    })
                  }
                >
                  <option value="">Todos</option>
                  {productosMovimiento.map((producto) => (
                    <option key={producto} value={producto}>
                      {producto}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Tipo</span>
                <select
                  value={filtrosHistorial.tipo}
                  onChange={(e) =>
                    setFiltrosHistorial({
                      ...filtrosHistorial,
                      tipo: e.target.value,
                    })
                  }
                >
                  <option value="">Todos</option>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                  <option value="ajuste">Ajuste</option>
                  <option value="merma">Merma</option>
                </select>
              </label>

              <button
                type="button"
                className="btn-limpiar-filtros"
                onClick={limpiarFiltrosHistorial}
              >
                Limpiar
              </button>
            </div>

            <div className="historial-resumen">
              {movimientosFiltrados.length} movimiento(s)
              encontrados
            </div>

            <div className="historial-tabla-wrap">
              <table className="inventario-table historial-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Usuario</th>
                    <th>Motivo</th>
                  </tr>
                </thead>

                <tbody>
                  {movimientosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        No hay movimientos con esos filtros.
                      </td>
                    </tr>
                  ) : (
                    movimientosFiltrados.map((item) => (
                      <tr key={item.id}>
                        <td>{formatoFecha(item.fecha)}</td>
                        <td>{item.producto || "-"}</td>
                        <td>
                          <span className={`movimiento-badge ${item.tipo}`}>
                            {item.tipo}
                          </span>
                        </td>
                        <td>{item.cantidad}</td>
                        <td>
                          {item.usuario ||
                            `Usuario ${item.usuario_id}`}
                        </td>
                        <td>{item.motivo || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {mostrarModalKardex && puedeGestionarInventario && (
        <div className="inventario-modal-overlay">
          <div className="inventario-historial-modal">
            <div className="inventario-modal-header">
              <div>
                <p className="inventario-modal-eyebrow">
                  Kardex
                </p>
                <h2>Kardex por producto</h2>
              </div>

              <div className="modal-header-actions">
                <button
                  type="button"
                  className="btn-exportar-reporte"
                  onClick={exportarKardex}
                  disabled={movimientosKardexConSaldo.length === 0}
                >
                  Exportar
                </button>

                <button
                  type="button"
                  className="inventario-modal-cerrar"
                  onClick={() => setMostrarModalKardex(false)}
                  aria-label="Cerrar"
                >
                  x
                </button>
              </div>
            </div>

            <div className="kardex-toolbar">
              <label>
                <span>Producto</span>
                <select
                  value={productoKardexId}
                  onChange={(e) =>
                    setProductoKardexId(e.target.value)
                  }
                >
                  {productos.map((producto) => (
                    <option
                      key={producto.id}
                      value={producto.id}
                    >
                      {producto.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="kardex-resumen">
              <div>
                <span>Existencia actual</span>
                <strong>{productoKardex?.existencia || 0}</strong>
              </div>

              <div>
                <span>Entradas</span>
                <strong>{totalEntradasKardex}</strong>
              </div>

              <div>
                <span>Salidas y mermas</span>
                <strong>{totalSalidasKardex}</strong>
              </div>

              <div>
                <span>Movimientos</span>
                <strong>{movimientosKardex.length}</strong>
              </div>

              <div>
                <span>Saldo Kardex</span>
                <strong>{saldoCalculadoKardex}</strong>
              </div>
            </div>

            <div className="historial-tabla-wrap">
              <table className="inventario-table historial-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Movimiento</th>
                    <th>Cantidad</th>
                    <th>Saldo</th>
                    <th>Usuario</th>
                    <th>Motivo</th>
                  </tr>
                </thead>

                <tbody>
                  {movimientosKardex.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        Este producto aun no tiene movimientos.
                      </td>
                    </tr>
                  ) : (
                    movimientosKardexConSaldo.map((item) => (
                      <tr key={item.id}>
                        <td>{formatoFecha(item.fecha)}</td>
                        <td>
                          <span className={`movimiento-badge ${item.tipo}`}>
                            {item.tipo}
                          </span>
                        </td>
                        <td>{item.cantidad}</td>
                        <td>
                          <strong>{item.saldo}</strong>
                        </td>
                        <td>
                          {item.usuario ||
                            `Usuario ${item.usuario_id}`}
                        </td>
                        <td>{item.motivo || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
