import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  ChevronDown,
  CheckCircle2,
  CreditCard,
  FileClock,
  MoreVertical,
  PencilLine,
  Plus,
  ReceiptText,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import "./VentasDiarias.css";
import { API } from "../config";

const obtenerFechaGuatemala = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const formatearFechaGuatemala = (fecha) =>
  new Date(fecha).toLocaleString("es-GT", {
    timeZone: "America/Guatemala",
  });

const formatearHoraGuatemala = (fecha) =>
  new Date(fecha).toLocaleTimeString("es-GT", {
    timeZone: "America/Guatemala",
  });

const normalizarBusqueda = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default function VentasDiarias({ user }) {
  const hoy = obtenerFechaGuatemala();
  const [fecha, setFecha] = useState(hoy);
  const [ventas, setVentas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [ventaAbierta, setVentaAbierta] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [filtroVentas, setFiltroVentas] = useState("");
  const [ventaAnular, setVentaAnular] = useState(null);
  const [anulacion, setAnulacion] = useState({
    motivo: "",
    password_admin: "",
  });
  const [anulando, setAnulando] = useState(false);
  const [ventaCorregir, setVentaCorregir] = useState(null);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [ventaReemplazar, setVentaReemplazar] = useState(null);
  const [reemplazando, setReemplazando] = useState(false);
  const [menuGeneralAbierto, setMenuGeneralAbierto] = useState(false);
  const [menuVentaId, setMenuVentaId] = useState(null);
  const [ventaOmitidaAbierta, setVentaOmitidaAbierta] = useState(false);
  const [guardandoOmitida, setGuardandoOmitida] = useState(false);
  const [catalogoOmitida, setCatalogoOmitida] = useState({ productos: [], usuarios: [] });
  const [ventaOmitida, setVentaOmitida] = useState(null);
  const [correccion, setCorreccion] = useState({
    efectivo: "0.00",
    tarjeta: "0.00",
    transferencia: "0.00",
    tarjeta_autorizacion: "",
    transferencia_codigo: "",
    motivo: "",
    password_admin: "",
  });
  const [reemplazo, setReemplazo] = useState({
    total_nuevo: "0.00",
    efectivo: "0.00",
    tarjeta: "0.00",
    transferencia: "0.00",
    tarjeta_autorizacion: "",
    transferencia_codigo: "",
    motivo: "",
    password_admin: "",
  });

  const crearFormularioOmitida = () => {
    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guatemala",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date()).reduce((acc, parte) => ({ ...acc, [parte.type]: parte.value }), {});
    return {
      fecha: `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`,
      usuario_id: String(user.id || ""),
      tipo_comprobante: "Recibo",
      cliente_nit: "CF",
      cliente_nombre: "CONSUMIDOR FINAL",
      cliente_direccion: "CIUDAD",
      efectivo: "0.00", tarjeta: "0.00", transferencia: "0.00",
      tarjeta_autorizacion: "", transferencia_codigo: "",
      motivo: "", password_admin: "",
      productos: [{ producto_id: "", cantidad: 1, precio: "0.00" }],
      clave_operacion: `omitida-${user.empresa_id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };
  };

  const cargarVentas = async (fechaConsulta = fecha) => {
    setCargando(true);
    setError("");

    try {
      const res = await fetch(
        `${API}/administracion/ventas-diarias?empresa_id=${user.empresa_id}&fecha=${fechaConsulta}`,
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

  const ventasFiltradas = useMemo(() => {
    const termino = normalizarBusqueda(filtroVentas);

    if (!termino) return ventas;

    return ventas.filter((venta) => {
      const esCredito = venta.tipo_comprobante === "Credito";
      const efectivo = !esCredito
        ? Number(venta.efectivo_recibido || 0) - Number(venta.cambio || 0)
        : 0;
      const formasPago = [
        efectivo > 0 ? "efectivo" : "",
        Number(venta.tarjeta_monto || 0) > 0 ? "tarjeta" : "",
        Number(venta.transferencia_monto || 0) > 0 ? "transferencia" : "",
        esCredito ? "credito" : "",
      ].filter(Boolean);
      const contenido = [
        venta.id,
        venta.tipo_comprobante,
        `${venta.tipo_comprobante || ""} ${venta.id || ""}`,
        venta.cliente_nit,
        venta.cliente_nombre,
        venta.cliente_direccion,
        productosTexto(venta),
        venta.usuario_nombre,
        venta.metodo_pago,
        formasPago.join(" "),
        venta.tarjeta_autorizacion,
        venta.transferencia_codigo,
        venta.estado,
        venta.motivo_anulacion,
        formatearHoraGuatemala(venta.fecha),
        Number(venta.total || 0).toFixed(2),
      ];

      return normalizarBusqueda(contenido.join(" ")).includes(termino);
    });
  }, [ventas, filtroVentas]);

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
        fecha: formatearFechaGuatemala(venta.fecha),
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
        fecha: formatearFechaGuatemala(venta.fecha),
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
      setMensaje("Venta anulada correctamente. El registro permanece disponible para auditoría.");
      await cargarVentas();
    } finally {
      setAnulando(false);
    }
  };

  const abrirCorreccionPago = (venta) => {
    const efectivo = Math.max(
      Number(venta.efectivo_recibido || 0) - Number(venta.cambio || 0),
      0
    );

    setError("");
    setVentaCorregir(venta);
    setCorreccion({
      efectivo: efectivo.toFixed(2),
      tarjeta: Number(venta.tarjeta_monto || 0).toFixed(2),
      transferencia: Number(venta.transferencia_monto || 0).toFixed(2),
      tarjeta_autorizacion: venta.tarjeta_autorizacion || "",
      transferencia_codigo: venta.transferencia_codigo || "",
      motivo: "",
      password_admin: "",
    });
  };

  const guardarCorreccionPago = async (e) => {
    e.preventDefault();
    if (!ventaCorregir) return;

    if (!correccion.motivo.trim()) {
      setError("Ingrese el motivo de la correccion.");
      return;
    }

    setCorrigiendo(true);
    setError("");

    try {
      const res = await fetch(
        `${API}/ventas/${ventaCorregir.id}/corregir-pago`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            empresa_id: user.empresa_id,
            ...correccion,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "No se pudo corregir la forma de pago.");
        return;
      }

      setVentaCorregir(null);
      setMensaje("Forma de pago corregida y registrada en auditoría.");
      await cargarVentas();
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCorrigiendo(false);
    }
  };

  const abrirReemplazo = (venta) => {
    setError("");
    setVentaReemplazar(venta);
    setReemplazo({
      total_nuevo: Number(venta.total || 0).toFixed(2),
      efectivo: Math.max(Number(venta.efectivo_recibido || 0) - Number(venta.cambio || 0), 0).toFixed(2),
      tarjeta: Number(venta.tarjeta_monto || 0).toFixed(2),
      transferencia: Number(venta.transferencia_monto || 0).toFixed(2),
      tarjeta_autorizacion: venta.tarjeta_autorizacion || "",
      transferencia_codigo: venta.transferencia_codigo || "",
      motivo: "",
      password_admin: "",
    });
  };

  const guardarReemplazo = async (e) => {
    e.preventDefault();
    if (!ventaReemplazar) return;
    setReemplazando(true);
    setError("");

    try {
      const res = await fetch(`${API}/ventas/${ventaReemplazar.id}/anular-reemplazar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify({ empresa_id: user.empresa_id, ...reemplazo }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "No se pudo reemplazar la venta.");
        return;
      }

      setVentaReemplazar(null);
      setMensaje(data.mensaje || "Venta anulada y reemplazada correctamente.");
      await cargarVentas();
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setReemplazando(false);
    }
  };

  const abrirVentaOmitida = async () => {
    setMenuGeneralAbierto(false);
    setError("");
    setVentaOmitida(crearFormularioOmitida());
    setVentaOmitidaAbierta(true);

    try {
      const res = await fetch(
        `${API}/administracion/ventas-omitidas/catalogo?empresa_id=${user.empresa_id}`,
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el catalogo.");
      setCatalogoOmitida({
        productos: Array.isArray(data.productos) ? data.productos : [],
        usuarios: Array.isArray(data.usuarios) ? data.usuarios : [],
      });
    } catch (err) {
      setVentaOmitidaAbierta(false);
      setError(err.message || "No se pudo cargar el catalogo.");
    }
  };

  const cambiarLineaOmitida = (indice, campo, valor) => {
    setVentaOmitida((prev) => {
      const productos = prev.productos.map((linea, posicion) => {
        if (posicion !== indice) return linea;
        if (campo !== "producto_id") return { ...linea, [campo]: valor };
        const producto = catalogoOmitida.productos.find((item) => Number(item.id) === Number(valor));
        return { ...linea, producto_id: valor, precio: Number(producto?.precio || 0).toFixed(2) };
      });
      return { ...prev, productos };
    });
  };

  const totalVentaOmitida = (ventaOmitida?.productos || []).reduce(
    (suma, linea) => suma + Number(linea.precio || 0) * Number(linea.cantidad || 0),
    0
  );

  const guardarVentaOmitida = async (e) => {
    e.preventDefault();
    if (!ventaOmitida) return;
    setGuardandoOmitida(true);
    setError("");

    try {
      const res = await fetch(`${API}/administracion/ventas-omitidas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify({ ...ventaOmitida, empresa_id: user.empresa_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo registrar la venta omitida.");

      setVentaOmitidaAbierta(false);
      setVentaOmitida(null);
      const fechaRegistrada = String(data.venta?.fecha || "").slice(0, 10) || fecha;
      setFecha(fechaRegistrada);
      setMensaje(
        `${data.mensaje || "Venta omitida registrada correctamente."}${
          data.advertencia_caja ? ` ${data.advertencia_caja}.` : ""
        }`
      );
      await cargarVentas(fechaRegistrada);
    } catch (err) {
      setError(err.message || "No se pudo registrar la venta omitida.");
    } finally {
      setGuardandoOmitida(false);
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
      {mensaje && (
        <div className="ventas-admin-exito">
          <CheckCircle2 size={19} />
          <span>{mensaje}</span>
          <button type="button" onClick={() => setMensaje("")}>Cerrar</button>
        </div>
      )}

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
            <div className="ventas-admin-menu-general">
              <button
                type="button"
                className="ventas-admin-btn-acciones"
                onClick={() => setMenuGeneralAbierto((abierto) => !abierto)}
                aria-expanded={menuGeneralAbierto}
              >
                Acciones <ChevronDown size={17} />
              </button>
              {menuGeneralAbierto && (
                <div className="ventas-admin-menu-panel">
                  <button type="button" onClick={abrirVentaOmitida}>
                    <Plus size={17} />
                    <span><strong>Registrar venta omitida</strong><small>Ingreso posterior con auditoria</small></span>
                  </button>
                </div>
              )}
            </div>
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

        <div className="ventas-admin-busqueda">
          <div className="ventas-admin-busqueda-campo">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              value={filtroVentas}
              onChange={(e) => setFiltroVentas(e.target.value)}
              placeholder="Buscar factura, NIT, cliente, producto, cajero, pago o autorizacion"
              aria-label="Filtrar detalle de ventas"
            />
            {filtroVentas && (
              <button
                type="button"
                onClick={() => setFiltroVentas("")}
                aria-label="Limpiar filtro"
                title="Limpiar filtro"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <span className="ventas-admin-busqueda-resultados">
            {filtroVentas
              ? `${ventasFiltradas.length} de ${ventas.length} ventas`
              : `${ventas.length} ventas del dia`}
          </span>
        </div>

        {cargando ? (
          <div className="ventas-admin-vacio">Cargando ventas...</div>
        ) : ventas.length === 0 ? (
          <div className="ventas-admin-vacio">No hay ventas registradas para esta fecha.</div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="ventas-admin-vacio">
            No se encontraron ventas que coincidan con el filtro.
          </div>
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
                {ventasFiltradas.map((venta) => {
                  const esCredito = venta.tipo_comprobante === "Credito";
                  const efectivo =
                    !esCredito
                      ? Number(venta.efectivo_recibido || 0) - Number(venta.cambio || 0)
                      : 0;

                  return (
                    <Fragment key={venta.id}>
                      <tr className={venta.estado === "anulada" ? "venta-anulada" : ""}>
                        <td>{formatearHoraGuatemala(venta.fecha)}</td>
                        <td>
                          {venta.tipo_comprobante} #{venta.id}
                          {venta.estado === "anulada" && (
                            <span className="venta-estado-anulada">
                              {venta.venta_reemplazo_id
                                ? `REEMPLAZADA POR #${venta.venta_reemplazo_id}`
                                : "ANULADA"}
                            </span>
                          )}
                          {venta.venta_origen_id && (
                            <span className="venta-estado-reemplazo">
                              CORRIGE #{venta.venta_origen_id}
                            </span>
                          )}
                          {venta.origen_registro === "venta_omitida" && (
                            <span className="venta-estado-omitida">REGISTRADA POSTERIORMENTE</span>
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
                        <td className="ventas-admin-acciones">
                          <div className="ventas-admin-menu-fila">
                            <button
                              type="button"
                              className="ventas-admin-menu-trigger"
                              onClick={() => setMenuVentaId(menuVentaId === venta.id ? null : venta.id)}
                              aria-label={`Acciones de venta ${venta.id}`}
                              aria-expanded={menuVentaId === venta.id}
                            >
                              <MoreVertical size={18} /> Acciones
                            </button>
                            {menuVentaId === venta.id && (
                              <div className="ventas-admin-menu-panel ventas-admin-menu-panel-fila">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVentaAbierta(ventaAbierta === venta.id ? null : venta.id);
                                    setMenuVentaId(null);
                                  }}
                                >
                                  <Search size={16} />
                                  {ventaAbierta === venta.id ? "Ocultar detalle" : "Ver detalle"}
                                </button>
                                {venta.estado !== "anulada" && (
                                  <>
                                <button
                                  type="button"
                                  className="ventas-admin-corregir"
                                  onClick={() => { abrirCorreccionPago(venta); setMenuVentaId(null); }}
                                >
                                  <PencilLine size={15} />
                                  Corregir pago
                                </button>
                                <button
                                  type="button"
                                  className="ventas-admin-reemplazar"
                                  onClick={() => { abrirReemplazo(venta); setMenuVentaId(null); }}
                                >
                                  <ReceiptText size={15} />
                                  Anular y reemplazar
                                </button>
                                <button
                                  type="button"
                                  className="ventas-admin-anular"
                                  onClick={() => {
                                    setMenuVentaId(null);
                                    setVentaAnular(venta);
                                    setAnulacion({
                                      motivo: "",
                                      password_admin: "",
                                    });
                                  }}
                                >
                                  <Trash2 size={15} />
                                  Anular definitivamente
                                </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
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
                            <div className="ventas-admin-pago-detalle">
                              <div>
                                <Banknote size={18} />
                                <span>Efectivo neto</span>
                                <strong>Q{(
                                  Number(venta.efectivo_recibido || 0) -
                                  Number(venta.cambio || 0)
                                ).toFixed(2)}</strong>
                              </div>
                              <div>
                                <CreditCard size={18} />
                                <span>Tarjeta</span>
                                <strong>Q{Number(venta.tarjeta_monto || 0).toFixed(2)}</strong>
                                <small>{venta.tarjeta_autorizacion || "Sin codigo"}</small>
                              </div>
                              <div>
                                <ReceiptText size={18} />
                                <span>Transferencia</span>
                                <strong>Q{Number(venta.transferencia_monto || 0).toFixed(2)}</strong>
                                <small>{venta.transferencia_codigo || "Sin codigo"}</small>
                              </div>
                            </div>
                            {(venta.correcciones || []).length > 0 && (
                              <div className="ventas-admin-auditoria">
                                <h3><FileClock size={18} /> Historial de correcciones</h3>
                                {(venta.correcciones || []).map((item) => (
                                  <article key={item.id}>
                                    <CheckCircle2 size={17} />
                                    <div>
                                      <strong>{
                                        item.tipo === "forma_pago"
                                          ? "Forma de pago corregida"
                                          : item.tipo === "venta_omitida"
                                          ? "Venta omitida registrada"
                                          : "Venta anulada"
                                      }</strong>
                                      <span>{item.motivo}</span>
                                      <small>
                                        {formatearFechaGuatemala(item.fecha)} · {item.autorizador || item.usuario || "Administrador"}
                                      </small>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            )}
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

      {ventaOmitidaAbierta && ventaOmitida && (
        <div className="ventas-admin-modal-overlay">
          <form className="ventas-admin-modal ventas-admin-modal-omitida" onSubmit={guardarVentaOmitida}>
            <header className="ventas-admin-modal-head">
              <div className="ventas-admin-modal-icon omitida"><FileClock size={23} /></div>
              <div>
                <span>REGISTRO ADMINISTRATIVO</span>
                <h2>Registrar venta omitida</h2>
                <p>La venta conservara su fecha real y quedara identificada en auditoria.</p>
              </div>
              <button type="button" className="ventas-admin-modal-cerrar" onClick={() => setVentaOmitidaAbierta(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </header>

            <div className="ventas-admin-omitida-grid tres-columnas">
              <label><span>Fecha y hora de la venta</span><input type="datetime-local" required value={ventaOmitida.fecha} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, fecha: e.target.value }))} /></label>
              <label><span>Cajero responsable</span><select required value={ventaOmitida.usuario_id} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, usuario_id: e.target.value }))}><option value="">Seleccionar cajero</option>{catalogoOmitida.usuarios.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.rol}</option>)}</select></label>
              <label><span>Documento</span><select value={ventaOmitida.tipo_comprobante} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, tipo_comprobante: e.target.value }))}><option>Recibo</option><option>Factura</option></select></label>
            </div>

            <section className="ventas-admin-omitida-seccion">
              <div className="ventas-admin-omitida-titulo"><div><strong>Productos</strong><small>El total se calcula con el detalle ingresado.</small></div><button type="button" onClick={() => setVentaOmitida((prev) => ({ ...prev, productos: [...prev.productos, { producto_id: "", cantidad: 1, precio: "0.00" }] }))}><Plus size={16} /> Agregar producto</button></div>
              <div className="ventas-admin-omitida-lineas">
                {ventaOmitida.productos.map((linea, indice) => (
                  <div className="ventas-admin-omitida-linea" key={indice}>
                    <label><span>Producto</span><select required value={linea.producto_id} onChange={(e) => cambiarLineaOmitida(indice, "producto_id", e.target.value)}><option value="">Seleccionar producto</option>{catalogoOmitida.productos.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
                    <label><span>Cantidad</span><input type="number" min="1" step="1" required value={linea.cantidad} onChange={(e) => cambiarLineaOmitida(indice, "cantidad", e.target.value)} /></label>
                    <label><span>Precio unitario</span><div className="ventas-admin-money-input"><b>Q</b><input type="number" min="0" step="0.01" required value={linea.precio} onChange={(e) => cambiarLineaOmitida(indice, "precio", e.target.value)} /></div></label>
                    <button type="button" className="ventas-admin-quitar-linea" disabled={ventaOmitida.productos.length === 1} onClick={() => setVentaOmitida((prev) => ({ ...prev, productos: prev.productos.filter((_, posicion) => posicion !== indice) }))} aria-label="Quitar producto"><Trash2 size={17} /></button>
                  </div>
                ))}
              </div>
            </section>

            <div className="ventas-admin-omitida-grid tres-columnas cliente">
              <label><span>NIT</span><input value={ventaOmitida.cliente_nit} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, cliente_nit: e.target.value }))} /></label>
              <label><span>Nombre del cliente</span><input value={ventaOmitida.cliente_nombre} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, cliente_nombre: e.target.value }))} /></label>
              <label><span>Direccion</span><input value={ventaOmitida.cliente_direccion} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, cliente_direccion: e.target.value }))} /></label>
            </div>

            <section className="ventas-admin-omitida-pago">
              <div className="ventas-admin-omitida-total"><span>Total calculado</span><strong>Q{totalVentaOmitida.toFixed(2)}</strong></div>
              <div className="ventas-admin-omitida-grid tres-columnas">
                <label><span>Efectivo</span><div className="ventas-admin-money-input"><b>Q</b><input type="number" min="0" step="0.01" value={ventaOmitida.efectivo} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, efectivo: e.target.value }))} /></div></label>
                <label><span>Tarjeta</span><div className="ventas-admin-money-input"><b>Q</b><input type="number" min="0" step="0.01" value={ventaOmitida.tarjeta} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, tarjeta: e.target.value }))} /></div></label>
                <label><span>Transferencia</span><div className="ventas-admin-money-input"><b>Q</b><input type="number" min="0" step="0.01" value={ventaOmitida.transferencia} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, transferencia: e.target.value }))} /></div></label>
                {Number(ventaOmitida.tarjeta || 0) > 0 && <label><span>Autorizacion de tarjeta</span><input required value={ventaOmitida.tarjeta_autorizacion} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, tarjeta_autorizacion: e.target.value }))} /></label>}
                {Number(ventaOmitida.transferencia || 0) > 0 && <label><span>Codigo de transferencia</span><input required value={ventaOmitida.transferencia_codigo} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, transferencia_codigo: e.target.value }))} /></label>}
              </div>
            </section>

            <div className="ventas-admin-omitida-grid dos-columnas">
              <label><span>Motivo obligatorio</span><textarea required value={ventaOmitida.motivo} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, motivo: e.target.value }))} placeholder="Ejemplo: venta realizada por el cajero y no ingresada durante la operacion." /></label>
              <label><span>Clave de administrador</span><input type="password" required value={ventaOmitida.password_admin} onChange={(e) => setVentaOmitida((prev) => ({ ...prev, password_admin: e.target.value }))} autoComplete="current-password" /></label>
            </div>

            <div className="ventas-admin-seguridad advertencia"><ShieldCheck size={20} /><span>Este registro no reutiliza numeros anteriores. Una factura queda marcada como no certificada hasta integrar FEL/SAT.</span></div>
            <div className="ventas-admin-modal-actions"><button type="button" onClick={() => setVentaOmitidaAbierta(false)}>Cancelar</button><button type="submit" className="primario" disabled={guardandoOmitida}><Save size={17} /> {guardandoOmitida ? "Registrando..." : "Registrar venta"}</button></div>
          </form>
        </div>
      )}

      {ventaAnular && (
        <div className="ventas-admin-modal-overlay">
          <form className="ventas-admin-modal" onSubmit={anularVenta}>
            <header className="ventas-admin-modal-head">
              <div className="ventas-admin-modal-icon peligro"><Trash2 size={23} /></div>
              <div>
                <span>OPERACION RESTRINGIDA</span>
                <h2>Anular definitivamente · {ventaAnular.tipo_comprobante} #{ventaAnular.id}</h2>
              </div>
            </header>
            <p>
              La venta quedará marcada como anulada y no sumará en los reportes activos. Su historial no se eliminará.
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

      {ventaCorregir && (
        <div className="ventas-admin-modal-overlay">
          <form
            className="ventas-admin-modal ventas-admin-modal-correccion"
            onSubmit={guardarCorreccionPago}
          >
            <header className="ventas-admin-modal-head">
              <div className="ventas-admin-modal-icon"><PencilLine size={23} /></div>
              <div>
                <span>CORRECCION ADMINISTRATIVA</span>
                <h2>Forma de pago · {ventaCorregir.tipo_comprobante} #{ventaCorregir.id}</h2>
                <p>El total de la venta no cambia. La operación quedará registrada en auditoría.</p>
              </div>
            </header>

            <section className="ventas-admin-correccion-total">
              <span>Total a distribuir</span>
              <strong>Q{(
                Number(ventaCorregir.total || 0) -
                Number(ventaCorregir.saldo_favor_usado || 0)
              ).toFixed(2)}</strong>
            </section>

            <div className="ventas-admin-correccion-grid">
              <label>
                <span>Efectivo</span>
                <div className="ventas-admin-money-input"><b>Q</b><input type="number" min="0" step="0.01" value={correccion.efectivo} onChange={(e) => setCorreccion((prev) => ({ ...prev, efectivo: e.target.value }))} /></div>
              </label>
              <label>
                <span>Tarjeta</span>
                <div className="ventas-admin-money-input"><b>Q</b><input type="number" min="0" step="0.01" value={correccion.tarjeta} onChange={(e) => setCorreccion((prev) => ({ ...prev, tarjeta: e.target.value }))} /></div>
              </label>
              <label>
                <span>Transferencia</span>
                <div className="ventas-admin-money-input"><b>Q</b><input type="number" min="0" step="0.01" value={correccion.transferencia} onChange={(e) => setCorreccion((prev) => ({ ...prev, transferencia: e.target.value }))} /></div>
              </label>
            </div>

            <div className="ventas-admin-correccion-grid dos-columnas">
              <label>
                <span>Autorizacion de tarjeta</span>
                <input value={correccion.tarjeta_autorizacion} onChange={(e) => setCorreccion((prev) => ({ ...prev, tarjeta_autorizacion: e.target.value }))} placeholder="Codigo del voucher" />
              </label>
              <label>
                <span>Codigo de transferencia</span>
                <input value={correccion.transferencia_codigo} onChange={(e) => setCorreccion((prev) => ({ ...prev, transferencia_codigo: e.target.value }))} placeholder="Referencia bancaria" />
              </label>
            </div>

            <label>
              <span>Motivo obligatorio</span>
              <textarea value={correccion.motivo} onChange={(e) => setCorreccion((prev) => ({ ...prev, motivo: e.target.value }))} placeholder="Ejemplo: pago con tarjeta registrado como transferencia" />
            </label>
            <label>
              <span>Password de administrador</span>
              <input type="password" value={correccion.password_admin} onChange={(e) => setCorreccion((prev) => ({ ...prev, password_admin: e.target.value }))} placeholder="Confirma la autorización" />
            </label>

            <div className="ventas-admin-seguridad">
              <ShieldCheck size={19} />
              <span>Se conservarán el dato anterior, el nuevo valor y el administrador que autorizó.</span>
            </div>

            <div className="ventas-admin-modal-actions">
              <button type="button" onClick={() => setVentaCorregir(null)} disabled={corrigiendo}>Cancelar</button>
              <button type="submit" className="primario" disabled={corrigiendo}>{corrigiendo ? "Guardando..." : "Guardar corrección"}</button>
            </div>
          </form>
        </div>
      )}

      {ventaReemplazar && (
        <div className="ventas-admin-modal-overlay">
          <form className="ventas-admin-modal ventas-admin-modal-correccion" onSubmit={guardarReemplazo}>
            <header className="ventas-admin-modal-head">
              <div className="ventas-admin-modal-icon reemplazo"><ReceiptText size={23} /></div>
              <div>
                <span>DOCUMENTO CORRECTIVO</span>
                <h2>Anular y reemplazar · {ventaReemplazar.tipo_comprobante} #{ventaReemplazar.id}</h2>
                <p>El documento original conservará su historial y se generará uno nuevo vinculado.</p>
              </div>
            </header>

            <label className="ventas-admin-total-nuevo">
              <span>Total correcto del nuevo documento</span>
              <div className="ventas-admin-money-input"><b>Q</b><input type="number" min="0.01" step="0.01" value={reemplazo.total_nuevo} onChange={(e) => setReemplazo((prev) => ({ ...prev, total_nuevo: e.target.value }))} /></div>
              <small>Subtotal original disponible: Q{Number(ventaReemplazar.subtotal || 0).toFixed(2)}</small>
            </label>

            <div className="ventas-admin-correccion-grid">
              <label><span>Efectivo</span><div className="ventas-admin-money-input"><b>Q</b><input type="number" min="0" step="0.01" value={reemplazo.efectivo} onChange={(e) => setReemplazo((prev) => ({ ...prev, efectivo: e.target.value }))} /></div></label>
              <label><span>Tarjeta</span><div className="ventas-admin-money-input"><b>Q</b><input type="number" min="0" step="0.01" value={reemplazo.tarjeta} onChange={(e) => setReemplazo((prev) => ({ ...prev, tarjeta: e.target.value }))} /></div></label>
              <label><span>Transferencia</span><div className="ventas-admin-money-input"><b>Q</b><input type="number" min="0" step="0.01" value={reemplazo.transferencia} onChange={(e) => setReemplazo((prev) => ({ ...prev, transferencia: e.target.value }))} /></div></label>
            </div>
            <div className="ventas-admin-correccion-grid dos-columnas">
              <label><span>Autorizacion de tarjeta</span><input value={reemplazo.tarjeta_autorizacion} onChange={(e) => setReemplazo((prev) => ({ ...prev, tarjeta_autorizacion: e.target.value }))} placeholder="Codigo del voucher" /></label>
              <label><span>Codigo de transferencia</span><input value={reemplazo.transferencia_codigo} onChange={(e) => setReemplazo((prev) => ({ ...prev, transferencia_codigo: e.target.value }))} placeholder="Referencia bancaria" /></label>
            </div>
            <label><span>Motivo obligatorio</span><textarea value={reemplazo.motivo} onChange={(e) => setReemplazo((prev) => ({ ...prev, motivo: e.target.value }))} placeholder="Ejemplo: importe digitado incorrectamente" /></label>
            <label><span>Password de administrador</span><input type="password" value={reemplazo.password_admin} onChange={(e) => setReemplazo((prev) => ({ ...prev, password_admin: e.target.value }))} placeholder="Confirma la autorización" /></label>

            <div className="ventas-admin-seguridad advertencia">
              <ShieldCheck size={19} />
              <span>Los productos no se descontarán dos veces. El documento anterior quedará anulado y enlazado al reemplazo.</span>
            </div>
            <div className="ventas-admin-modal-actions">
              <button type="button" onClick={() => setVentaReemplazar(null)} disabled={reemplazando}>Cancelar</button>
              <button type="submit" className="reemplazar" disabled={reemplazando}>{reemplazando ? "Generando..." : "Generar reemplazo"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
