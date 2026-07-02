import { useMemo, useState } from "react";
import ModalAviso from "./ModalAviso";
import "./POSAcciones.css";
import { API } from "../config";

const DENOMINACIONES = [
  { key: "q025", label: "Q0.25", valor: 0.25 },
  { key: "q050", label: "Q0.50", valor: 0.5 },
  { key: "q1", label: "Q1", valor: 1 },
  { key: "q5", label: "Q5", valor: 5 },
  { key: "q10", label: "Q10", valor: 10 },
  { key: "q20", label: "Q20", valor: 20 },
  { key: "q50", label: "Q50", valor: 50 },
  { key: "q100", label: "Q100", valor: 100 },
  { key: "q200", label: "Q200", valor: 200 },
];

const denominacionesVacias = () =>
  DENOMINACIONES.reduce((acc, item) => {
    acc[item.key] = "";
    return acc;
  }, {});

const totalDenominaciones = (denominaciones) =>
  DENOMINACIONES.reduce(
    (total, item) => total + Number(denominaciones[item.key] || 0) * item.valor,
    0
  );

export default function POSAcciones({
  user,
  imprimirTicket,
  imprimirComanda,
  onAgregarCredito,
  creditosAgregados = [],
  onCajaActualizada,
}) {
  const [abierto, setAbierto] = useState(false);
  const [modal, setModal] = useState("");
  const [ventas, setVentas] = useState([]);
  const [creditos, setCreditos] = useState([]);
  const [creditosSeleccionados, setCreditosSeleccionados] = useState([]);
  const [busquedaCreditos, setBusquedaCreditos] = useState("");
  const [resumen, setResumen] = useState(null);
  const [cajaActual, setCajaActual] = useState(null);
  const [denominaciones, setDenominaciones] = useState(denominacionesVacias);
  const [observacionCaja, setObservacionCaja] = useState("");
  const [tipoAjuste, setTipoAjuste] = useState("aumento");
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [motivoReapertura, setMotivoReapertura] = useState("");
  const [autorizacion, setAutorizacion] = useState({
    email: "",
    password: "",
  });
  const [gasto, setGasto] = useState({
    descripcion: "",
    monto: "",
    autorizado_por: "",
  });
  const [mensaje, setMensaje] = useState("");
  const [aviso, setAviso] = useState(null);
  const [ventaAnular, setVentaAnular] = useState(null);
  const [anulacion, setAnulacion] = useState({
    motivo: "",
    password_admin: "",
  });
  const [anulando, setAnulando] = useState(false);

  const token = sessionStorage.getItem("token");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const leerRespuesta = async (res) => {
    const texto = await res.text();
    if (!texto) return {};

    try {
      return JSON.parse(texto);
    } catch {
      return { error: "Respuesta no valida del servidor." };
    }
  };

  const normalizarDetalleVenta = (detalle) => {
    if (Array.isArray(detalle)) return detalle;

    if (typeof detalle === "string") {
      try {
        const detalleParseado = JSON.parse(detalle);
        return Array.isArray(detalleParseado) ? detalleParseado : [];
      } catch {
        return [];
      }
    }

    return [];
  };

  const normalizarVentaImpresion = (venta) => ({
    ...venta,
    detalle: normalizarDetalleVenta(venta.detalle),
  });

  const cargarCajaActual = async ({ abrirModal = true } = {}) => {
    const res = await fetch(
      `${API}/caja/turno-actual?empresa_id=${user.empresa_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await leerRespuesta(res);

    if (!res.ok) {
      setAviso({
        tipo: "error",
        titulo: "Caja no disponible",
        mensaje: data.error || "No se pudo consultar la caja actual.",
      });
      return null;
    }

    const caja = data.abierta ? data : null;
    setCajaActual(caja);
    onCajaActualizada?.(caja);

    if (abrirModal) {
      setModal(data.abierta ? "cajaActual" : "apertura");
      setDenominaciones(denominacionesVacias());
      setObservacionCaja("");
    }

    return caja;
  };

  const abrirApertura = async () => {
    setAbierto(false);
    const caja = await cargarCajaActual({ abrirModal: false });

    if (caja?.abierta) {
      setCajaActual(caja);
      setModal("cajaActual");
      return;
    }

    setDenominaciones(denominacionesVacias());
    setObservacionCaja("");
    setMotivoReapertura("");
    setAutorizacion({ email: "", password: "" });
    setModal("apertura");
  };

  const aperturarCaja = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API}/caja/apertura`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        empresa_id: user.empresa_id,
        denominaciones,
        observacion: observacionCaja,
        motivo_reapertura: motivoReapertura,
        autorizacion,
      }),
    });
    const data = await leerRespuesta(res);

    if (!res.ok) {
      setAviso({
        tipo: "error",
        titulo: "Caja no aperturada",
        mensaje: data.error || "No se pudo aperturar caja.",
      });
      return;
    }

    setMensaje("Caja aperturada correctamente");
    await cargarCajaActual({ abrirModal: false });
    setTimeout(() => {
      setMensaje("");
      setModal("cajaActual");
    }, 900);
  };

  const abrirAjusteCaja = async () => {
    setAbierto(false);
    const caja = await cargarCajaActual({ abrirModal: false });

    if (!caja?.abierta) {
      setAviso({
        tipo: "info",
        titulo: "Caja sin apertura",
        mensaje: "Debe existir una caja abierta para registrar ajustes.",
      });
      return;
    }

    setDenominaciones(denominacionesVacias());
    setTipoAjuste("aumento");
    setMotivoAjuste("");
    setAutorizacion({ email: "", password: "" });
    setModal("ajuste");
  };

  const registrarAjusteCaja = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API}/caja/ajuste`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        empresa_id: user.empresa_id,
        tipo: tipoAjuste,
        denominaciones,
        motivo: motivoAjuste,
        autorizacion,
      }),
    });
    const data = await leerRespuesta(res);

    if (!res.ok) {
      setAviso({
        tipo: "error",
        titulo: "Ajuste no registrado",
        mensaje: data.error || "No se pudo registrar el ajuste de caja.",
      });
      return;
    }

    setMensaje("Ajuste de caja registrado");
    await cargarCajaActual({ abrirModal: false });
    setTimeout(() => {
      setMensaje("");
      setModal("cajaActual");
    }, 1000);
  };

  const cerrarCaja = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API}/caja/cierre`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        empresa_id: user.empresa_id,
        denominaciones,
        observacion: observacionCaja,
      }),
    });
    const data = await leerRespuesta(res);

    if (!res.ok) {
      setAviso({
        tipo: "error",
        titulo: "Caja no cerrada",
        mensaje: data.error || "No se pudo cerrar caja.",
      });
      return;
    }

    setCajaActual(null);
    onCajaActualizada?.(null);
    setMensaje(
      `Caja cerrada. Diferencia: Q${Number(data.diferencia || 0).toFixed(2)}`
    );
    setTimeout(() => {
      setMensaje("");
      setModal("");
    }, 1800);
  };

  const cargarVentas = async () => {
    const res = await fetch(`${API}/caja/ventas-hoy?empresa_id=${user.empresa_id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await leerRespuesta(res);

    if (res.ok) {
      setVentas(Array.isArray(data) ? data.map(normalizarVentaImpresion) : []);
      setModal("ventas");
    } else {
      setAviso({
        tipo: "error",
        titulo: "No se pudo cargar",
        mensaje: data.error || "No se pudo cargar ventas.",
      });
    }
  };

  const cargarResumen = async () => {
    const res = await fetch(`${API}/caja/resumen-hoy?empresa_id=${user.empresa_id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await leerRespuesta(res);

    if (res.ok) {
      setResumen(data);
      setModal("resumen");
    } else {
      setAviso({
        tipo: "error",
        titulo: "No se pudo cargar",
        mensaje: data.error || "No se pudo cargar resumen.",
      });
    }
  };

  const cargarCreditos = async () => {
    const res = await fetch(
      `${API}/clientes/creditos-pendientes?empresa_id=${user.empresa_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await leerRespuesta(res);

    if (res.ok) {
      setCreditos(Array.isArray(data) ? data : []);
      setCreditosSeleccionados([]);
      setBusquedaCreditos("");
      setModal("creditos");
    } else {
      setAviso({
        tipo: "error",
        titulo: "No se pudo cargar",
        mensaje: data.error || "No se pudo cargar creditos pendientes.",
      });
    }
  };

  const registrarGasto = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API}/caja/gastos`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        ...gasto,
        empresa_id: user.empresa_id,
      }),
    });
    const data = await leerRespuesta(res);

    if (!res.ok) {
      setAviso({
        tipo: "error",
        titulo: "Gasto no registrado",
        mensaje: data.error || "No se pudo registrar gasto.",
      });
      return;
    }

    setGasto({
      descripcion: "",
      monto: "",
      autorizado_por: "",
    });
    setMensaje("Gasto registrado");
    await cargarCajaActual({ abrirModal: false });

    setTimeout(() => setMensaje(""), 2500);
  };

  const ventaADatosPago = (venta) => ({
    metodo_pago: venta.metodo_pago,
    efectivo_recibido: Number(venta.efectivo_recibido || 0),
    cambio: Number(venta.cambio || 0),
    cliente_nit: venta.cliente_nit,
    cliente_nombre: venta.cliente_nombre,
    cliente_direccion: venta.cliente_direccion,
    descuento_monto: Number(venta.descuento_monto || 0),
    total_final: Number(venta.total || 0),
    tarjeta_autorizacion: venta.tarjeta_autorizacion,
    tarjeta_monto: Number(venta.tarjeta_monto || 0),
    transferencia_monto: Number(venta.transferencia_monto || 0),
    transferencia_codigo: venta.transferencia_codigo,
    saldo_favor_usado: Number(venta.saldo_favor_usado || 0),
    tipo_comprobante: venta.tipo_comprobante,
    recibo_codigo: venta.recibo_codigo,
  });

  const anularVenta = async (e) => {
    e.preventDefault();

    if (!ventaAnular) return;

    if (!anulacion.motivo.trim()) {
      setAviso({
        tipo: "info",
        titulo: "Motivo requerido",
        mensaje: "Ingrese el motivo de anulacion.",
      });
      return;
    }

    setAnulando(true);

    try {
      const res = await fetch(`${API}/ventas/${ventaAnular.id}/anular`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          empresa_id: user.empresa_id,
          motivo: anulacion.motivo,
          password_admin: anulacion.password_admin,
        }),
      });
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setAviso({
          tipo: "error",
          titulo: "No se pudo anular",
          mensaje: data.error || "No fue posible anular la venta.",
        });
        return;
      }

      setVentaAnular(null);
      setAnulacion({ motivo: "", password_admin: "" });
      setMensaje("Venta anulada correctamente");
      await cargarVentas();
      await cargarResumen();
      await cargarCajaActual({ abrirModal: false });
      setTimeout(() => setMensaje(""), 2500);
    } finally {
      setAnulando(false);
    }
  };

  const creditosOcultos = useMemo(
    () => new Set(creditosAgregados.map((id) => Number(id))),
    [creditosAgregados]
  );

  const creditosVisibles = useMemo(() => {
    const texto = busquedaCreditos.trim().toLowerCase();

    return creditos.filter((credito) => {
      if (creditosOcultos.has(Number(credito.id))) return false;
      if (!texto) return true;

      const detalle = Array.isArray(credito.detalle)
        ? credito.detalle
            .map((item) => item.nombre)
            .filter(Boolean)
            .join(" ")
        : "";
      const valores = [
        credito.id,
        credito.cliente_nombre,
        credito.cliente_codigo,
        credito.total,
        detalle,
      ]
        .filter((valor) => valor !== null && valor !== undefined)
        .join(" ")
        .toLowerCase();

      return valores.includes(texto);
    });
  }, [creditos, creditosOcultos, busquedaCreditos]);

  const creditosVisiblesIds = creditosVisibles.map((credito) => Number(credito.id));
  const todosCreditosSeleccionados =
    creditosVisiblesIds.length > 0 &&
    creditosVisiblesIds.every((id) => creditosSeleccionados.includes(id));

  const resumenTurno = cajaActual?.resumen || {};
  const turno = cajaActual?.turno || null;
  const ajustesCaja = cajaActual?.ajustes || [];
  const efectivoEsperado =
    Number(turno?.monto_apertura || 0) +
    Number(resumenTurno.total_ajustes || 0) +
    Number(resumenTurno.total_efectivo || 0) -
    Number(resumenTurno.total_gastos || 0);

  const alternarCredito = (id) => {
    const creditoId = Number(id);

    setCreditosSeleccionados((prev) =>
      prev.includes(creditoId)
        ? prev.filter((item) => item !== creditoId)
        : [...prev, creditoId]
    );
  };

  const alternarTodosCreditos = () => {
    setCreditosSeleccionados(
      todosCreditosSeleccionados ? [] : creditosVisiblesIds
    );
  };

  const agregarCreditosSeleccionados = () => {
    const seleccionados = creditosVisibles.filter((credito) =>
      creditosSeleccionados.includes(Number(credito.id))
    );

    seleccionados.forEach((credito) => {
      onAgregarCredito?.(credito);
    });

    setCreditosSeleccionados([]);
    setModal("");
  };

  const renderDenominaciones = () => (
    <div className="pos-denominaciones-grid">
      {DENOMINACIONES.map((item) => (
        <label key={item.key}>
          <span>{item.label}</span>
          <input
            type="number"
            min="0"
            step="1"
            value={denominaciones[item.key]}
            onChange={(e) =>
              setDenominaciones({
                ...denominaciones,
                [item.key]: e.target.value,
              })
            }
          />
        </label>
      ))}
    </div>
  );

  return (
    <div className="pos-acciones">
      <button
        type="button"
        className="pos-acciones-trigger"
        onClick={() => setAbierto(!abierto)}
        title="Acciones de caja"
      >
        ...
      </button>

      {abierto && (
        <div className="pos-acciones-menu">
          <button onClick={abrirApertura}>Aperturar caja</button>
          <button onClick={() => { setAbierto(false); cargarCajaActual(); }}>
            Caja actual
          </button>
          <button onClick={abrirAjusteCaja}>
            Ajustar caja
          </button>
          <button onClick={() => { setAbierto(false); cargarVentas(); }}>
            Detalle de ventas
          </button>
          <button onClick={() => { setAbierto(false); cargarResumen(); }}>
            Credito y efectivo
          </button>
          <button onClick={() => { setAbierto(false); cargarCreditos(); }}>
            Cobrar credito
          </button>
          <button onClick={() => { setAbierto(false); setModal("gasto"); }}>
            Registrar gasto
          </button>
        </div>
      )}

      {modal && (
        <div className="pos-acciones-overlay" onClick={() => setModal("")}>
          <div
            className={`pos-acciones-modal ${
              modal === "apertura" || modal === "cierre" || modal === "ajuste"
                ? "pos-caja-modal"
                : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="pos-acciones-cerrar" onClick={() => setModal("")}>
              x
            </button>

            {modal === "apertura" && (
              <>
                <h2>Apertura de caja</h2>
                <p>Ingrese el efectivo inicial por denominacion.</p>

                {mensaje && <div className="pos-gasto-ok">{mensaje}</div>}

                <form className="pos-caja-form" onSubmit={aperturarCaja}>
                  {renderDenominaciones()}

                  <label className="pos-caja-observacion">
                    <span>Observacion</span>
                    <textarea
                      value={observacionCaja}
                      onChange={(e) => setObservacionCaja(e.target.value)}
                      placeholder="Nota opcional de apertura"
                    />
                  </label>

                  <div className="pos-autorizacion-box">
                    <label>
                      <span>Motivo reapertura</span>
                      <input
                        value={motivoReapertura}
                        onChange={(e) => setMotivoReapertura(e.target.value)}
                        placeholder="Solo si ya cerro caja hoy"
                      />
                    </label>
                    <label>
                      <span>Email autorizador</span>
                      <input
                        value={autorizacion.email}
                        onChange={(e) =>
                          setAutorizacion({
                            ...autorizacion,
                            email: e.target.value,
                          })
                        }
                        placeholder="admin@empresa.com"
                      />
                    </label>
                    <label>
                      <span>Password autorizador</span>
                      <input
                        type="password"
                        value={autorizacion.password}
                        onChange={(e) =>
                          setAutorizacion({
                            ...autorizacion,
                            password: e.target.value,
                          })
                        }
                        placeholder="Password"
                      />
                    </label>
                  </div>

                  <div className="pos-caja-total">
                    <span>Total inicial</span>
                    <strong>Q{totalDenominaciones(denominaciones).toFixed(2)}</strong>
                  </div>

                  <button type="submit">Aperturar caja</button>
                </form>
              </>
            )}

            {modal === "cajaActual" && (
              <>
                <h2>Caja actual</h2>
                <p>Resumen del turno abierto.</p>

                {turno ? (
                  <>
                    <div className="pos-resumen-grid">
                      <div><span>Fondo inicial</span><strong>Q{Number(turno.monto_apertura || 0).toFixed(2)}</strong></div>
                      <div><span>Ajustes</span><strong>Q{Number(resumenTurno.total_ajustes || 0).toFixed(2)}</strong></div>
                      <div><span>Efectivo ventas</span><strong>Q{Number(resumenTurno.total_efectivo || 0).toFixed(2)}</strong></div>
                      <div><span>Gastos</span><strong>Q{Number(resumenTurno.total_gastos || 0).toFixed(2)}</strong></div>
                      <div><span>Tarjeta</span><strong>Q{Number(resumenTurno.total_tarjeta || 0).toFixed(2)}</strong></div>
                      <div><span>Transferencia</span><strong>Q{Number(resumenTurno.total_transferencia || 0).toFixed(2)}</strong></div>
                      <div><span>Efectivo esperado</span><strong>Q{efectivoEsperado.toFixed(2)}</strong></div>
                    </div>

                    {ajustesCaja.length > 0 && (
                      <div className="pos-ajustes-lista">
                        <h3>Ajustes autorizados</h3>
                        {ajustesCaja.map((ajuste) => (
                          <div key={ajuste.id}>
                            <strong>
                              {ajuste.tipo === "aumento" ? "+" : "-"}Q{Number(ajuste.monto || 0).toFixed(2)}
                            </strong>
                            <span>{ajuste.motivo}</span>
                            <small>
                              Autorizo: {ajuste.autorizador_nombre || "-"}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pos-caja-footer">
                      <button type="button" onClick={() => {
                        setDenominaciones(denominacionesVacias());
                        setObservacionCaja("");
                        setModal("cierre");
                      }}>
                        Cerrar caja
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="pos-acciones-vacio">
                    No hay caja abierta para este usuario.
                  </div>
                )}
              </>
            )}

            {modal === "ajuste" && (
              <>
                <h2>Ajuste de caja</h2>
                <p>Registre aumentos o disminuciones con autorizacion de admin.</p>

                {mensaje && <div className="pos-gasto-ok">{mensaje}</div>}

                <form className="pos-caja-form" onSubmit={registrarAjusteCaja}>
                  <div className="pos-tipo-ajuste">
                    <button
                      type="button"
                      className={tipoAjuste === "aumento" ? "activo" : ""}
                      onClick={() => setTipoAjuste("aumento")}
                    >
                      Aumento
                    </button>
                    <button
                      type="button"
                      className={tipoAjuste === "disminucion" ? "activo" : ""}
                      onClick={() => setTipoAjuste("disminucion")}
                    >
                      Disminucion
                    </button>
                  </div>

                  {renderDenominaciones()}

                  <label className="pos-caja-observacion">
                    <span>Motivo obligatorio</span>
                    <textarea
                      value={motivoAjuste}
                      onChange={(e) => setMotivoAjuste(e.target.value)}
                      placeholder="Ejemplo: Cajero olvido registrar monedas iniciales"
                    />
                  </label>

                  <div className="pos-autorizacion-box">
                    <label>
                      <span>Email autorizador</span>
                      <input
                        value={autorizacion.email}
                        onChange={(e) =>
                          setAutorizacion({
                            ...autorizacion,
                            email: e.target.value,
                          })
                        }
                        placeholder="admin@empresa.com"
                      />
                    </label>
                    <label>
                      <span>Password autorizador</span>
                      <input
                        type="password"
                        value={autorizacion.password}
                        onChange={(e) =>
                          setAutorizacion({
                            ...autorizacion,
                            password: e.target.value,
                          })
                        }
                        placeholder="Password"
                      />
                    </label>
                  </div>

                  <div className="pos-caja-total">
                    <span>Total ajuste</span>
                    <strong>Q{totalDenominaciones(denominaciones).toFixed(2)}</strong>
                  </div>

                  <button type="submit">Registrar ajuste</button>
                </form>
              </>
            )}

            {modal === "cierre" && (
              <>
                <h2>Cierre de caja</h2>
                <p>Cuente el efectivo fisico y registre las denominaciones.</p>

                {mensaje && <div className="pos-gasto-ok">{mensaje}</div>}

                <form className="pos-caja-form" onSubmit={cerrarCaja}>
                  <div className="pos-cierre-resumen">
                    <div>
                      <span>Efectivo esperado</span>
                      <strong>Q{efectivoEsperado.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Efectivo contado</span>
                      <strong>Q{totalDenominaciones(denominaciones).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Diferencia</span>
                      <strong>
                        Q{(totalDenominaciones(denominaciones) - efectivoEsperado).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {renderDenominaciones()}

                  <label className="pos-caja-observacion">
                    <span>Observacion</span>
                    <textarea
                      value={observacionCaja}
                      onChange={(e) => setObservacionCaja(e.target.value)}
                      placeholder="Nota opcional de cierre"
                    />
                  </label>

                  <button type="submit">Confirmar cierre</button>
                </form>
              </>
            )}

            {modal === "ventas" && (
              <>
                <h2>Detalle de ventas</h2>
                <p>Transacciones registradas hoy.</p>

                <div className="pos-ventas-lista">
                  {ventas.map((venta) => {
                    const ventaImpresion = normalizarVentaImpresion(venta);

                    return (
                      <div
                        className={
                          venta.estado === "anulada"
                            ? "pos-venta-item anulada"
                            : "pos-venta-item"
                        }
                        key={venta.id}
                      >
                        <div>
                          <strong>Venta #{venta.id}</strong>
                          <span>
                            {new Date(venta.fecha).toLocaleTimeString()} - {venta.tipo_comprobante}
                          </span>
                          <small>
                            {venta.cliente_nombre || "Consumidor Final"} - {venta.usuario_nombre || "-"}
                          </small>
                          {venta.estado === "anulada" && (
                            <small className="pos-venta-anulada">
                              ANULADA - {venta.motivo_anulacion || "Sin motivo"}
                            </small>
                          )}
                        </div>

                        <b>Q{Number(venta.total || 0).toFixed(2)}</b>

                        <div className="pos-venta-actions">
                          {venta.tipo_comprobante !== "Credito" && (
                            <button
                              onClick={() =>
                                imprimirTicket(
                                  ventaADatosPago(ventaImpresion),
                                  ventaImpresion.detalle,
                                  ventaImpresion
                                )
                              }
                            >
                              Factura
                            </button>
                          )}
                          <button onClick={() => imprimirComanda(ventaImpresion)}>
                            Comanda
                          </button>
                          {venta.estado !== "anulada" && (
                            <button
                              className="pos-btn-anular"
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
                        </div>
                      </div>
                    );
                  })}

                  {ventas.length === 0 && (
                    <div className="pos-acciones-vacio">
                      No hay ventas registradas hoy.
                    </div>
                  )}
                </div>
              </>
            )}

            {modal === "resumen" && resumen && (
              <>
                <h2>Credito y efectivo</h2>
                <p>Resumen de ventas del dia.</p>

                <div className="pos-resumen-grid">
                  <div><span>Vendido total</span><strong>Q{Number(resumen.total_vendido || 0).toFixed(2)}</strong></div>
                  <div><span>Efectivo</span><strong>Q{Number(resumen.total_efectivo || 0).toFixed(2)}</strong></div>
                  <div><span>Credito</span><strong>Q{Number(resumen.total_credito || 0).toFixed(2)}</strong></div>
                  <div><span>Tarjeta</span><strong>Q{Number(resumen.total_tarjeta || 0).toFixed(2)}</strong></div>
                  <div><span>Transferencia</span><strong>Q{Number(resumen.total_transferencia || 0).toFixed(2)}</strong></div>
                  <div><span>Gastos caja</span><strong>Q{Number(resumen.total_gastos || 0).toFixed(2)}</strong></div>
                </div>
              </>
            )}

            {modal === "creditos" && (
              <>
                <h2>Cobrar credito</h2>
                <p>Seleccione una o varias cuentas pendientes para agregarlas al carrito.</p>

                <label className="pos-creditos-busqueda">
                  <span>Buscar credito</span>
                  <input
                    value={busquedaCreditos}
                    onChange={(e) => {
                      setBusquedaCreditos(e.target.value);
                      setCreditosSeleccionados([]);
                    }}
                    placeholder="Cliente, codigo, venta, monto o producto"
                  />
                </label>

                <div className="pos-creditos-toolbar">
                  <button
                    type="button"
                    onClick={alternarTodosCreditos}
                    disabled={creditosVisibles.length === 0}
                  >
                    {todosCreditosSeleccionados
                      ? "Quitar seleccion"
                      : "Seleccionar todo"}
                  </button>
                  <button
                    type="button"
                    className="pos-creditos-confirmar"
                    onClick={agregarCreditosSeleccionados}
                    disabled={creditosSeleccionados.length === 0}
                  >
                    Agregar seleccionados
                  </button>
                  <span>{creditosSeleccionados.length} seleccionados</span>
                </div>

                <div className="pos-creditos-lista">
                  {creditosVisibles.map((credito) => (
                    <label className="pos-credito-item" key={credito.id}>
                      <input
                        type="checkbox"
                        checked={creditosSeleccionados.includes(Number(credito.id))}
                        onChange={() => alternarCredito(credito.id)}
                      />
                      <div>
                        <strong>{credito.cliente_nombre || "Cliente"}</strong>
                        <span>
                          Venta #{credito.id} - {new Date(credito.fecha).toLocaleString()}
                        </span>
                        <small>
                          {credito.cliente_codigo || "Sin codigo"} - {Array.isArray(credito.detalle) ? credito.detalle.length : 0} lineas
                        </small>
                      </div>

                      <b>Q{Number(credito.total || 0).toFixed(2)}</b>
                    </label>
                  ))}

                  {creditosVisibles.length === 0 && (
                    <div className="pos-acciones-vacio">
                      No hay creditos pendientes que coincidan o ya fueron agregados al carrito.
                    </div>
                  )}
                </div>
              </>
            )}

            {modal === "gasto" && (
              <>
                <h2>Registrar gasto</h2>
                <p>Gastos pagados con efectivo de caja.</p>

                {mensaje && <div className="pos-gasto-ok">{mensaje}</div>}

                <form className="pos-gasto-form" onSubmit={registrarGasto}>
                  <label>
                    <span>Descripcion</span>
                    <input
                      value={gasto.descripcion}
                      onChange={(e) => setGasto({ ...gasto, descripcion: e.target.value })}
                      placeholder="Compra de pan, tortillas..."
                    />
                  </label>
                  <label>
                    <span>Monto</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={gasto.monto}
                      onChange={(e) => setGasto({ ...gasto, monto: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>Autorizado por</span>
                    <input
                      value={gasto.autorizado_por}
                      onChange={(e) => setGasto({ ...gasto, autorizado_por: e.target.value })}
                      placeholder="Gerente o encargado"
                    />
                  </label>
                  <label>
                    <span>Registrado por</span>
                    <input value={user.nombre} disabled />
                  </label>
                  <button type="submit">Guardar gasto</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {ventaAnular && (
        <div className="pos-modal-overlay">
          <form className="pos-modal-card" onSubmit={anularVenta}>
            <h2>Anular venta #{ventaAnular.id}</h2>
            <p>
              La venta quedara marcada como anulada y no sumara en caja ni
              reportes. Esta accion requiere password de administrador.
            </p>

            <label className="pos-caja-observacion">
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

            <label className="pos-caja-observacion">
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

            <div className="pos-modal-actions">
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

      <ModalAviso
        visible={Boolean(aviso)}
        tipo={aviso?.tipo}
        titulo={aviso?.titulo}
        mensaje={aviso?.mensaje}
        onCerrar={() => setAviso(null)}
      />
    </div>
  );
}
