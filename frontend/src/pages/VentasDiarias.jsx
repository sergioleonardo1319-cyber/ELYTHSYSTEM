import { Fragment, useEffect, useMemo, useState } from "react";
import "./VentasDiarias.css";
import { API } from "../config";

export default function VentasDiarias({ user }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(hoy);
  const [ventas, setVentas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [ventaAbierta, setVentaAbierta] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [ventaAnular, setVentaAnular] = useState(null);
  const [anulacion, setAnulacion] = useState({
    motivo: "",
    password_admin: "",
  });
  const [anulando, setAnulando] = useState(false);

  const cargarVentas = async () => {
    setCargando(true);
    setError("");

    try {
      const res = await fetch(
        `${API}/administracion/ventas-diarias?empresa_id=${user.empresa_id}&fecha=${fecha}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      const texto = await res.text();
      let data = {};

      try {
        data = texto ? JSON.parse(texto) : {};
      } catch {
        data = {
          error:
            "El servidor no devolvio una respuesta valida. Reinicia node server.js para cargar esta pantalla.",
        };
      }

      if (!res.ok) {
        setError(data.error || "No se pudieron cargar ventas.");
        setVentas([]);
        setResumen(null);
        return;
      }

      setVentas(Array.isArray(data.ventas) ? data.ventas : []);
      setResumen(data.resumen || null);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
      setVentas([]);
      setResumen(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarVentas();
  }, []);

  const resumenCalculado = useMemo(
    () => ({
      transacciones: Number(resumen?.transacciones || 0),
      total: Number(resumen?.total || 0),
      efectivo: Number(resumen?.efectivo || 0),
      tarjeta: Number(resumen?.tarjeta || 0),
      transferencia: Number(resumen?.transferencia || 0),
      credito: Number(resumen?.credito || 0),
      saldo_favor: Number(resumen?.saldo_favor || 0),
      anuladas: Number(resumen?.anuladas || 0),
    }),
    [resumen]
  );

  const productosTexto = (venta) =>
    (venta.detalle || [])
      .map((item) => `${item.cantidad} x ${item.nombre}`)
      .join(", ");

  const descargarCSV = (nombreArchivo, filas) => {
    if (filas.length === 0) return;

    const encabezados = Object.keys(filas[0]);
    const escapar = (valor) =>
      `"${String(valor ?? "").replaceAll('"', '""')}"`;
    const contenido = [
      encabezados.join(","),
      ...filas.map((fila) =>
        encabezados.map((campo) => escapar(fila[campo])).join(",")
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

  const exportarResumen = () => {
    const filas = ventas.map((venta) => {
      const esCredito = venta.tipo_comprobante === "Credito";
      const efectivo = !esCredito
        ? Number(venta.efectivo_recibido || 0) - Number(venta.cambio || 0)
        : 0;

      return {
        fecha: new Date(venta.fecha).toLocaleString(),
        documento: `${venta.tipo_comprobante} #${venta.id}`,
        nit: venta.cliente_nit || "CF",
        cliente: venta.cliente_nombre || "CONSUMIDOR FINAL",
        productos: productosTexto(venta),
        efectivo: efectivo.toFixed(2),
        tarjeta: Number(venta.tarjeta_monto || 0).toFixed(2),
        autorizacion_tarjeta: venta.tarjeta_autorizacion || "",
        transferencia: Number(venta.transferencia_monto || 0).toFixed(2),
        codigo_transferencia: venta.transferencia_codigo || "",
        credito: (esCredito ? Number(venta.total || 0) : 0).toFixed(2),
        total: Number(venta.total || 0).toFixed(2),
        estado: venta.estado || "activa",
        motivo_anulacion: venta.motivo_anulacion || "",
        cajero: venta.usuario_nombre || "",
      };
    });

    descargarCSV(`ventas-resumen-${fecha}.csv`, filas);
  };

  const exportarDetalle = () => {
    const filas = ventas.flatMap((venta) => {
      const esCredito = venta.tipo_comprobante === "Credito";
      const efectivo = !esCredito
        ? Number(venta.efectivo_recibido || 0) - Number(venta.cambio || 0)
        : 0;

      return (venta.detalle || []).map((item) => ({
        fecha: new Date(venta.fecha).toLocaleString(),
        documento: `${venta.tipo_comprobante} #${venta.id}`,
        nit: venta.cliente_nit || "CF",
        cliente: venta.cliente_nombre || "CONSUMIDOR FINAL",
        producto: item.nombre,
        cantidad: item.cantidad,
        precio: Number(item.precio || 0).toFixed(2),
        subtotal: (Number(item.precio || 0) * Number(item.cantidad || 0)).toFixed(2),
        observacion: item.observacion || "",
        efectivo: efectivo.toFixed(2),
        tarjeta: Number(venta.tarjeta_monto || 0).toFixed(2),
        transferencia: Number(venta.transferencia_monto || 0).toFixed(2),
        credito: (esCredito ? Number(venta.total || 0) : 0).toFixed(2),
        total_venta: Number(venta.total || 0).toFixed(2),
        estado: venta.estado || "activa",
        motivo_anulacion: venta.motivo_anulacion || "",
        cajero: venta.usuario_nombre || "",
      }));
    });

    descargarCSV(`ventas-detalle-${fecha}.csv`, filas);
  };

  const anularVenta = async (e) => {
    e.preventDefault();

    if (!ventaAnular) return;

    if (!anulacion.motivo.trim()) {
      setError("Ingrese el motivo de anulacion.");
      return;
    }

    setAnulando(true);
    setError("");

    try {
      const res = await fetch(`${API}/ventas/${ventaAnular.id}/anular`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          empresa_id: user.empresa_id,
          motivo: anulacion.motivo,
          password_admin: anulacion.password_admin,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "No se pudo anular la venta.");
        return;
      }

      setVentaAnular(null);
      setAnulacion({ motivo: "", password_admin: "" });
      await cargarVentas();
    } finally {
      setAnulando(false);
    }
  };

  return (
    <main className="ventas-admin-page">
      <header className="ventas-admin-header">
        <div>
          <span>ADMINISTRACION</span>
          <h1>Ventas diarias</h1>
          <p>Consulta ventas por fecha, NIT, productos, cajero y forma de pago.</p>
        </div>

        <form
          className="ventas-admin-filtro"
          onSubmit={(e) => {
            e.preventDefault();
            cargarVentas();
          }}
        >
          <label>
            <span>Fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>
          <button type="submit">Buscar</button>
        </form>
      </header>

      {error && <div className="ventas-admin-error">{error}</div>}

      <section className="ventas-admin-resumen">
        <article>
          <span>Transacciones</span>
          <strong>{resumenCalculado.transacciones}</strong>
        </article>
        <article>
          <span>Total</span>
          <strong>Q{resumenCalculado.total.toFixed(2)}</strong>
        </article>
        <article>
          <span>Efectivo</span>
          <strong>Q{resumenCalculado.efectivo.toFixed(2)}</strong>
        </article>
        <article>
          <span>Tarjeta</span>
          <strong>Q{resumenCalculado.tarjeta.toFixed(2)}</strong>
        </article>
        <article>
          <span>Transferencia</span>
          <strong>Q{resumenCalculado.transferencia.toFixed(2)}</strong>
        </article>
        <article>
          <span>Credito</span>
          <strong>Q{resumenCalculado.credito.toFixed(2)}</strong>
        </article>
        <article>
          <span>Anuladas</span>
          <strong>{resumenCalculado.anuladas}</strong>
        </article>
      </section>

      <section className="ventas-admin-card">
        <div className="ventas-admin-card-head">
          <div>
            <h2>Detalle de ventas</h2>
            <p>Ventas registradas el {fecha}.</p>
          </div>

          <div className="ventas-admin-export">
            <button
              type="button"
              onClick={exportarResumen}
              disabled={ventas.length === 0}
            >
              Exportar resumen
            </button>
            <button
              type="button"
              onClick={exportarDetalle}
              disabled={ventas.length === 0}
            >
              Exportar detalle
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="ventas-admin-vacio">Cargando ventas...</div>
        ) : ventas.length === 0 ? (
          <div className="ventas-admin-vacio">No hay ventas registradas para esta fecha.</div>
        ) : (
          <div className="ventas-admin-tabla-wrap">
            <table className="ventas-admin-tabla">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Documento</th>
                  <th>NIT</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Efectivo</th>
                  <th>Tarjeta</th>
                  <th>Transferencia</th>
                  <th>Credito</th>
                  <th>Total</th>
                  <th>Cajero</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((venta) => {
                  const esCredito = venta.tipo_comprobante === "Credito";
                  const efectivo =
                    !esCredito
                      ? Number(venta.efectivo_recibido || 0) - Number(venta.cambio || 0)
                      : 0;

                  return (
                    <Fragment key={venta.id}>
                      <tr className={venta.estado === "anulada" ? "venta-anulada" : ""}>
                        <td>{new Date(venta.fecha).toLocaleTimeString()}</td>
                        <td>
                          {venta.tipo_comprobante} #{venta.id}
                          {venta.estado === "anulada" && (
                            <span className="venta-estado-anulada">
                              ANULADA
                            </span>
                          )}
                        </td>
                        <td>{venta.cliente_nit || "CF"}</td>
                        <td>{venta.cliente_nombre || "CONSUMIDOR FINAL"}</td>
                        <td className="ventas-admin-productos">{productosTexto(venta)}</td>
                        <td>Q{efectivo.toFixed(2)}</td>
                        <td>Q{Number(venta.tarjeta_monto || 0).toFixed(2)}</td>
                        <td>Q{Number(venta.transferencia_monto || 0).toFixed(2)}</td>
                        <td>Q{(esCredito ? Number(venta.total || 0) : 0).toFixed(2)}</td>
                        <td>Q{Number(venta.total || 0).toFixed(2)}</td>
                        <td>{venta.usuario_nombre || "-"}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              setVentaAbierta(
                                ventaAbierta === venta.id ? null : venta.id
                              )
                            }
                          >
                            {ventaAbierta === venta.id ? "Ocultar" : "Detalle"}
                          </button>
                          {venta.estado !== "anulada" && (
                            <button
                              type="button"
                              className="ventas-admin-anular"
                              onClick={() => {
                                setVentaAnular(venta);
                                setAnulacion({
                                  motivo: "",
                                  password_admin: "",
                                });
                              }}
                            >
                              Anular
                            </button>
                          )}
                        </td>
                      </tr>

                      {ventaAbierta === venta.id && (
                        <tr className="ventas-admin-detalle-row">
                          <td colSpan="12">
                            <div className="ventas-admin-detalle">
                              {(venta.detalle || []).map((item, index) => (
                                <article key={`${venta.id}-${index}`}>
                                  <strong>{item.nombre}</strong>
                                  <span>Cantidad: {item.cantidad}</span>
                                  <span>Precio: Q{Number(item.precio || 0).toFixed(2)}</span>
                                  {item.observacion && <small>{item.observacion}</small>}
                                </article>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {ventaAnular && (
        <div className="ventas-admin-modal-overlay">
          <form className="ventas-admin-modal" onSubmit={anularVenta}>
            <h2>Anular venta #{ventaAnular.id}</h2>
            <p>
              La venta quedara marcada como anulada y no sumara en los reportes
              activos. Ingresa motivo y password de administrador.
            </p>

            <label>
              <span>Motivo obligatorio</span>
              <textarea
                value={anulacion.motivo}
                onChange={(e) =>
                  setAnulacion((prev) => ({
                    ...prev,
                    motivo: e.target.value,
                  }))
                }
                placeholder="Ejemplo: factura duplicada por error"
              />
            </label>

            <label>
              <span>Password administrador</span>
              <input
                type="password"
                value={anulacion.password_admin}
                onChange={(e) =>
                  setAnulacion((prev) => ({
                    ...prev,
                    password_admin: e.target.value,
                  }))
                }
                placeholder="Password admin"
              />
            </label>

            <div className="ventas-admin-modal-actions">
              <button
                type="button"
                onClick={() => setVentaAnular(null)}
                disabled={anulando}
              >
                Cancelar
              </button>
              <button type="submit" className="peligro" disabled={anulando}>
                {anulando ? "Anulando..." : "Confirmar anulacion"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
