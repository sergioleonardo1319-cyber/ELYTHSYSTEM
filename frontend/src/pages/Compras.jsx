import { useEffect, useState } from "react";
import "./Inventario.css";
import "./Compras.css";
import { API } from "../config";

export default function Compras({
  user,
  compraInicial,
  onCompraInicialUsada,
}) {
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]);
  const [compraDetalle, setCompraDetalle] = useState(null);
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] =
    useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);
  const [historialProveedor, setHistorialProveedor] = useState(null);
  const [guardandoCompra, setGuardandoCompra] = useState(false);
  const [guardandoProveedor, setGuardandoProveedor] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cargandoHistorialProveedor, setCargandoHistorialProveedor] =
    useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorCompra, setErrorCompra] = useState("");
  const [errorDetalle, setErrorDetalle] = useState("");
  const [errorProveedor, setErrorProveedor] = useState("");
  const [errorHistorialProveedor, setErrorHistorialProveedor] =
    useState("");
  const [compra, setCompra] = useState({
    proveedor_id: "",
    proveedor_nombre: "",
    documento: "",
    productos: [],
  });
  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
  });

  const headersAuth = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
  });

  const crearLineaCompra = () => ({
    producto_id: productos[0]?.id || "",
    cantidad: "",
    costo_unitario: "",
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

  const cargarCompras = async () => {
    const res = await fetch(
      `${API}/compras?empresa_id=${user.empresa_id}`,
      {
        headers: headersAuth(),
      }
    );

    const data = await res.json();

    setCompras(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!user) return;

    cargarProductos();
    cargarProveedores();
    cargarCompras();
  }, [user]);

  useEffect(() => {
    if (productos.length === 0 || compra.productos.length > 0) {
      return;
    }

    setCompra((prev) => ({
      ...prev,
      productos: [crearLineaCompra()],
    }));
  }, [productos]);

  useEffect(() => {
    if (!compraInicial || productos.length === 0) {
      return;
    }

    const producto = productos.find(
      (item) => String(item.id) === String(compraInicial.id)
    );

    if (!producto) {
      return;
    }

    setCompra((prev) => ({
      ...prev,
      productos: [
        {
          producto_id: producto.id,
          cantidad: String(compraInicial.cantidad_sugerida || 1),
          costo_unitario: String(producto.precio_costo || 0),
        },
      ],
    }));

    setMensaje(
      `Compra preparada para ${producto.nombre} (${compraInicial.cantidad_sugerida || 1} unidades sugeridas).`
    );

    if (onCompraInicialUsada) {
      onCompraInicialUsada();
    }

    setTimeout(() => {
      setMensaje("");
    }, 3500);
  }, [compraInicial, productos]);

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

  const limpiarCompra = () => {
    setCompra({
      proveedor_id: proveedores[0]?.id || "",
      proveedor_nombre: "",
      documento: "",
      productos: [crearLineaCompra()],
    });
  };

  const abrirDetalleCompra = async (item) => {
    try {
      setCargandoDetalle(true);
      setErrorDetalle("");
      setCompraDetalle({
        compra: item,
        detalle: [],
      });

      const res = await fetch(
        `${API}/compras/${item.id}?empresa_id=${user.empresa_id}`,
        {
          headers: headersAuth(),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setErrorDetalle(
          data.error || "Error cargando detalle de compra."
        );
        return;
      }

      setCompraDetalle(data);

    } catch (error) {
      console.error(error);
      setErrorDetalle("Error conectando con el servidor.");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarDetalleCompra = () => {
    setCompraDetalle(null);
    setErrorDetalle("");
  };

  const abrirNuevoProveedor = () => {
    setErrorProveedor("");
    setNuevoProveedor({
      nombre: "",
      telefono: "",
      email: "",
      direccion: "",
    });
    setMostrarNuevoProveedor(true);
  };

  const cerrarNuevoProveedor = () => {
    setMostrarNuevoProveedor(false);
    setErrorProveedor("");
  };

  const guardarNuevoProveedor = async (e) => {
    e.preventDefault();

    if (!nuevoProveedor.nombre.trim()) {
      setErrorProveedor("El nombre del proveedor es requerido.");
      return;
    }

    try {
      setGuardandoProveedor(true);
      setErrorProveedor("");

      const res = await fetch(`${API}/proveedores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headersAuth(),
        },
        body: JSON.stringify({
          ...nuevoProveedor,
          nombre: nuevoProveedor.nombre.trim(),
          empresa_id: user.empresa_id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorProveedor(
          data.error || "Error creando proveedor."
        );
        return;
      }

      setMensaje("Proveedor creado correctamente.");
      cerrarNuevoProveedor();
      await cargarProveedores();
      setCompra((prev) => ({
        ...prev,
        proveedor_id: data.id || "",
        proveedor_nombre: "",
      }));

      setTimeout(() => {
        setMensaje("");
      }, 3000);

    } catch (error) {
      console.error(error);
      setErrorProveedor("Error conectando con el servidor.");
    } finally {
      setGuardandoProveedor(false);
    }
  };

  const abrirEditarProveedor = (proveedor) => {
    setErrorProveedor("");
    setProveedorEditando({
      ...proveedor,
      telefono: proveedor.telefono || "",
      email: proveedor.email || "",
      direccion: proveedor.direccion || "",
    });
  };

  const cerrarEditarProveedor = () => {
    setProveedorEditando(null);
    setErrorProveedor("");
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();

    if (!proveedorEditando?.nombre?.trim()) {
      setErrorProveedor("El nombre del proveedor es requerido.");
      return;
    }

    try {
      setGuardandoProveedor(true);
      setErrorProveedor("");

      const res = await fetch(
        `${API}/proveedores/${proveedorEditando.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...headersAuth(),
          },
          body: JSON.stringify({
            nombre: proveedorEditando.nombre.trim(),
            telefono: proveedorEditando.telefono,
            email: proveedorEditando.email,
            direccion: proveedorEditando.direccion,
            empresa_id: user.empresa_id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setErrorProveedor(
          data.error || "Error actualizando proveedor."
        );
        return;
      }

      setMensaje("Proveedor actualizado correctamente.");
      cerrarEditarProveedor();
      cargarProveedores();
      cargarCompras();

      setTimeout(() => {
        setMensaje("");
      }, 3000);

    } catch (error) {
      console.error(error);
      setErrorProveedor("Error conectando con el servidor.");
    } finally {
      setGuardandoProveedor(false);
    }
  };

  const abrirHistorialProveedor = async (proveedor) => {
    try {
      setCargandoHistorialProveedor(true);
      setErrorHistorialProveedor("");
      setHistorialProveedor({
        proveedor,
        compras: [],
      });

      const res = await fetch(
        `${API}/proveedores/${proveedor.id}/compras?empresa_id=${user.empresa_id}`,
        {
          headers: headersAuth(),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setErrorHistorialProveedor(
          data.error || "Error cargando historial del proveedor."
        );
        return;
      }

      setHistorialProveedor(data);

    } catch (error) {
      console.error(error);
      setErrorHistorialProveedor("Error conectando con el servidor.");
    } finally {
      setCargandoHistorialProveedor(false);
    }
  };

  const cerrarHistorialProveedor = () => {
    setHistorialProveedor(null);
    setErrorHistorialProveedor("");
  };

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

      setMensaje("Compra guardada e inventario actualizado.");
      limpiarCompra();
      cargarProductos();
      cargarProveedores();
      cargarCompras();

      setTimeout(() => {
        setMensaje("");
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

  const exportarCompras = () => {
    descargarCSV(
      "compras.csv",
      [
        "Fecha",
        "Proveedor",
        "Documento",
        "Total",
        "Usuario",
      ],
      compras.map((item) => ({
        Fecha: formatoFecha(item.fecha),
        Proveedor: item.proveedor || "",
        Documento: item.documento || "",
        Total: Number(item.total || 0).toFixed(2),
        Usuario: item.usuario || `Usuario ${item.usuario_id}`,
      }))
    );
  };

  return (
    <div className="compras-container">
      {mensaje && (
        <div className="inventario-toast">
          {mensaje}
        </div>
      )}

      <div className="compras-header">
        <div>
          <h1>Compras</h1>
          <p>Reabastecimiento, proveedores y costos de inventario.</p>
        </div>
      </div>

      <form
        className="compras-card"
        onSubmit={guardarCompra}
      >
        <div className="inventario-modal-header">
          <div>
            <p className="inventario-modal-eyebrow">
              Reabastecimiento
            </p>
            <h2>Nueva compra</h2>
          </div>
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
              disabled={productos.length === 0}
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
            onClick={limpiarCompra}
          >
            Limpiar
          </button>

          <button
            type="submit"
            className="btn-guardar-movimiento"
            disabled={guardandoCompra || productos.length === 0}
          >
            {guardandoCompra
              ? "Guardando..."
              : "Guardar compra"}
          </button>
        </div>
      </form>

      <section className="compras-card">
        <div className="inventario-section-header">
          <div>
            <h2>Proveedores</h2>
            <p>Contactos, datos comerciales e historial de compras.</p>
          </div>

          <button
            type="button"
            className="btn-nuevo-proveedor"
            onClick={abrirNuevoProveedor}
          >
            + Nuevo proveedor
          </button>
        </div>

        <div className="historial-tabla-wrap">
          <table className="inventario-table historial-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Telefono</th>
                <th>Correo</th>
                <th>Direccion</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {proveedores.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    Aun no hay proveedores registrados.
                  </td>
                </tr>
              ) : (
                proveedores.map((proveedor) => (
                  <tr key={proveedor.id}>
                    <td>{proveedor.nombre}</td>
                    <td>{proveedor.telefono || "-"}</td>
                    <td>{proveedor.email || "-"}</td>
                    <td>{proveedor.direccion || "-"}</td>
                    <td>
                      <div className="proveedor-acciones">
                        <button
                          type="button"
                          className="btn-ver-detalle-compra"
                          onClick={() => abrirEditarProveedor(proveedor)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="btn-proveedor-secundario"
                          onClick={() => abrirHistorialProveedor(proveedor)}
                        >
                          Historial
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="compras-card">
        <div className="inventario-section-header">
          <div>
            <h2>Historial de compras</h2>
            <p>Ultimas compras registradas por proveedor.</p>
          </div>

          <button
            type="button"
            className="btn-exportar-reporte"
            onClick={exportarCompras}
            disabled={compras.length === 0}
          >
            Exportar compras
          </button>
        </div>

        <div className="historial-tabla-wrap">
          <table className="inventario-table historial-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Documento</th>
                <th>Total</th>
                <th>Usuario</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {compras.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    Aun no hay compras registradas. El boton Ver detalle
                    aparecera cuando exista al menos una compra.
                  </td>
                </tr>
              ) : (
                compras.map((item) => (
                  <tr key={item.id}>
                    <td>{formatoFecha(item.fecha)}</td>
                    <td>{item.proveedor || "-"}</td>
                    <td>{item.documento || "-"}</td>
                    <td>Q {Number(item.total || 0).toFixed(2)}</td>
                    <td>{item.usuario || `Usuario ${item.usuario_id}`}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-ver-detalle-compra"
                        onClick={() => abrirDetalleCompra(item)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {compraDetalle && (
        <div className="inventario-modal-overlay">
          <div className="inventario-historial-modal compra-detalle-modal">
            <div className="inventario-modal-header">
              <div>
                <p className="inventario-modal-eyebrow">
                  Detalle de compra
                </p>
                <h2>
                  Compra #{compraDetalle.compra?.id}
                </h2>
              </div>

              <button
                type="button"
                className="inventario-modal-cerrar"
                onClick={cerrarDetalleCompra}
              >
                x
              </button>
            </div>

            <div className="compra-detalle-resumen">
              <div>
                <span>Proveedor</span>
                <strong>
                  {compraDetalle.compra?.proveedor || "-"}
                </strong>
              </div>

              <div>
                <span>Documento</span>
                <strong>
                  {compraDetalle.compra?.documento || "-"}
                </strong>
              </div>

              <div>
                <span>Fecha</span>
                <strong>
                  {formatoFecha(compraDetalle.compra?.fecha)}
                </strong>
              </div>

              <div>
                <span>Usuario</span>
                <strong>
                  {compraDetalle.compra?.usuario ||
                    `Usuario ${compraDetalle.compra?.usuario_id}`}
                </strong>
              </div>

              <div>
                <span>Total</span>
                <strong>
                  Q {Number(compraDetalle.compra?.total || 0).toFixed(2)}
                </strong>
              </div>
            </div>

            {errorDetalle && (
              <div className="inventario-error">
                {errorDetalle}
              </div>
            )}

            <div className="historial-tabla-wrap">
              <table className="inventario-table historial-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Costo unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>

                <tbody>
                  {cargandoDetalle ? (
                    <tr>
                      <td colSpan="4">
                        Cargando detalle...
                      </td>
                    </tr>
                  ) : compraDetalle.detalle.length === 0 ? (
                    <tr>
                      <td colSpan="4">
                        Esta compra no tiene productos registrados.
                      </td>
                    </tr>
                  ) : (
                    compraDetalle.detalle.map((item) => (
                      <tr key={item.id}>
                        <td>{item.producto || `Producto ${item.producto_id}`}</td>
                        <td>{item.cantidad}</td>
                        <td>
                          Q {Number(item.costo_unitario || 0).toFixed(2)}
                        </td>
                        <td>
                          Q {Number(item.subtotal || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {mostrarNuevoProveedor && (
        <div className="inventario-modal-overlay">
          <form
            className="inventario-modal proveedor-modal"
            onSubmit={guardarNuevoProveedor}
          >
            <div className="inventario-modal-header">
              <div>
                <p className="inventario-modal-eyebrow">
                  Proveedor
                </p>
                <h2>Nuevo proveedor</h2>
              </div>

              <button
                type="button"
                className="inventario-modal-cerrar"
                onClick={cerrarNuevoProveedor}
              >
                x
              </button>
            </div>

            <label className="inventario-field">
              <span>Nombre</span>
              <input
                value={nuevoProveedor.nombre}
                onChange={(e) =>
                  setNuevoProveedor({
                    ...nuevoProveedor,
                    nombre: e.target.value,
                  })
                }
                placeholder="Nombre del proveedor"
              />
            </label>

            <label className="inventario-field">
              <span>Telefono</span>
              <input
                value={nuevoProveedor.telefono}
                onChange={(e) =>
                  setNuevoProveedor({
                    ...nuevoProveedor,
                    telefono: e.target.value,
                  })
                }
                placeholder="Telefono de contacto"
              />
            </label>

            <label className="inventario-field">
              <span>Correo</span>
              <input
                type="email"
                value={nuevoProveedor.email}
                onChange={(e) =>
                  setNuevoProveedor({
                    ...nuevoProveedor,
                    email: e.target.value,
                  })
                }
                placeholder="correo@proveedor.com"
              />
            </label>

            <label className="inventario-field">
              <span>Direccion</span>
              <textarea
                rows="3"
                value={nuevoProveedor.direccion}
                onChange={(e) =>
                  setNuevoProveedor({
                    ...nuevoProveedor,
                    direccion: e.target.value,
                  })
                }
                placeholder="Direccion del proveedor"
              />
            </label>

            {errorProveedor && (
              <div className="inventario-error">
                {errorProveedor}
              </div>
            )}

            <div className="inventario-modal-actions">
              <button
                type="button"
                className="btn-cancelar-movimiento"
                onClick={cerrarNuevoProveedor}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-guardar-movimiento"
                disabled={guardandoProveedor}
              >
                {guardandoProveedor ? "Guardando..." : "Crear proveedor"}
              </button>
            </div>
          </form>
        </div>
      )}

      {proveedorEditando && (
        <div className="inventario-modal-overlay">
          <form
            className="inventario-modal proveedor-modal"
            onSubmit={guardarProveedor}
          >
            <div className="inventario-modal-header">
              <div>
                <p className="inventario-modal-eyebrow">
                  Proveedor
                </p>
                <h2>Editar proveedor</h2>
              </div>

              <button
                type="button"
                className="inventario-modal-cerrar"
                onClick={cerrarEditarProveedor}
              >
                x
              </button>
            </div>

            <label className="inventario-field">
              <span>Nombre</span>
              <input
                value={proveedorEditando.nombre}
                onChange={(e) =>
                  setProveedorEditando({
                    ...proveedorEditando,
                    nombre: e.target.value,
                  })
                }
              />
            </label>

            <label className="inventario-field">
              <span>Telefono</span>
              <input
                value={proveedorEditando.telefono}
                onChange={(e) =>
                  setProveedorEditando({
                    ...proveedorEditando,
                    telefono: e.target.value,
                  })
                }
              />
            </label>

            <label className="inventario-field">
              <span>Correo</span>
              <input
                type="email"
                value={proveedorEditando.email}
                onChange={(e) =>
                  setProveedorEditando({
                    ...proveedorEditando,
                    email: e.target.value,
                  })
                }
              />
            </label>

            <label className="inventario-field">
              <span>Direccion</span>
              <textarea
                rows="3"
                value={proveedorEditando.direccion}
                onChange={(e) =>
                  setProveedorEditando({
                    ...proveedorEditando,
                    direccion: e.target.value,
                  })
                }
              />
            </label>

            {errorProveedor && (
              <div className="inventario-error">
                {errorProveedor}
              </div>
            )}

            <div className="inventario-modal-actions">
              <button
                type="button"
                className="btn-cancelar-movimiento"
                onClick={cerrarEditarProveedor}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-guardar-movimiento"
                disabled={guardandoProveedor}
              >
                {guardandoProveedor ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {historialProveedor && (
        <div className="inventario-modal-overlay">
          <div className="inventario-historial-modal compra-detalle-modal">
            <div className="inventario-modal-header">
              <div>
                <p className="inventario-modal-eyebrow">
                  Historial por proveedor
                </p>
                <h2>
                  {historialProveedor.proveedor?.nombre}
                </h2>
              </div>

              <button
                type="button"
                className="inventario-modal-cerrar"
                onClick={cerrarHistorialProveedor}
              >
                x
              </button>
            </div>

            <div className="proveedor-resumen">
              <div>
                <span>Telefono</span>
                <strong>
                  {historialProveedor.proveedor?.telefono || "-"}
                </strong>
              </div>

              <div>
                <span>Correo</span>
                <strong>
                  {historialProveedor.proveedor?.email || "-"}
                </strong>
              </div>

              <div>
                <span>Direccion</span>
                <strong>
                  {historialProveedor.proveedor?.direccion || "-"}
                </strong>
              </div>
            </div>

            {errorHistorialProveedor && (
              <div className="inventario-error">
                {errorHistorialProveedor}
              </div>
            )}

            <div className="historial-tabla-wrap">
              <table className="inventario-table historial-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Documento</th>
                    <th>Total</th>
                    <th>Usuario</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {cargandoHistorialProveedor ? (
                    <tr>
                      <td colSpan="5">
                        Cargando historial...
                      </td>
                    </tr>
                  ) : historialProveedor.compras.length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        Este proveedor aun no tiene compras registradas.
                      </td>
                    </tr>
                  ) : (
                    historialProveedor.compras.map((item) => (
                      <tr key={item.id}>
                        <td>{formatoFecha(item.fecha)}</td>
                        <td>{item.documento || "-"}</td>
                        <td>Q {Number(item.total || 0).toFixed(2)}</td>
                        <td>{item.usuario || `Usuario ${item.usuario_id}`}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-ver-detalle-compra"
                            onClick={() => abrirDetalleCompra({
                              ...item,
                              proveedor:
                                historialProveedor.proveedor?.nombre,
                            })}
                          >
                            Ver detalle
                          </button>
                        </td>
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
