import { useEffect, useMemo, useState } from "react";
import "./Contabilidad.css";
import { API } from "../config";

const cuentaInicial = {
  codigo: "",
  nombre: "",
  tipo: "activo",
  naturaleza: "deudora",
  cuenta_padre_id: "",
  permite_movimiento: true,
  estado: "activa",
};

const filtrosDiarioInicial = {
  fecha_inicio: "",
  fecha_fin: "",
  origen: "",
  cuenta_id: "",
  texto: "",
};

const filtrosCxCInicial = {
  texto: "",
  estado: "pendientes",
};

const filtrosCxPInicial = {
  texto: "",
  estado: "pendientes",
};

const filtrosReportesInicial = {
  fecha_inicio: "",
  fecha_fin: "",
};

export default function Contabilidad({ user }) {
  const [tab, setTab] = useState("cuentas");
  const [cuentas, setCuentas] = useState([]);
  const [cierres, setCierres] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [cuentasCobrar, setCuentasCobrar] = useState([]);
  const [detalleCxC, setDetalleCxC] = useState(null);
  const [cuentasPagar, setCuentasPagar] = useState([]);
  const [detalleCxP, setDetalleCxP] = useState(null);
  const [reportes, setReportes] = useState(null);
  const [filtrosDiario, setFiltrosDiario] = useState(filtrosDiarioInicial);
  const [filtrosCxC, setFiltrosCxC] = useState(filtrosCxCInicial);
  const [filtrosCxP, setFiltrosCxP] = useState(filtrosCxPInicial);
  const [filtrosReportes, setFiltrosReportes] = useState(filtrosReportesInicial);
  const [formCuenta, setFormCuenta] = useState(cuentaInicial);
  const [cuentaEditando, setCuentaEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const leerRespuesta = async (res) => {
    const texto = await res.text();
    if (!texto) return {};

    try {
      return JSON.parse(texto);
    } catch {
      return { error: "Respuesta no valida del servidor." };
    }
  };

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
  });

  const totalResumen = useMemo(
    () =>
      cierres.reduce(
        (acc, cierre) => {
          acc.efectivo += Number(cierre.ventas_efectivo || 0);
          acc.ajustes += Number(cierre.total_ajustes || 0);
          acc.tarjeta += Number(cierre.ventas_tarjeta || 0);
          acc.transferencia += Number(cierre.ventas_transferencia || 0);
          acc.credito += Number(cierre.ventas_credito || 0);
          acc.gastos += Number(cierre.gastos || 0);
          acc.diferencia += Number(cierre.diferencia || 0);
          return acc;
        },
        {
          efectivo: 0,
          ajustes: 0,
          tarjeta: 0,
          transferencia: 0,
          credito: 0,
          gastos: 0,
          diferencia: 0,
        }
      ),
    [cierres]
  );

  const resumenCuentas = useMemo(
    () =>
      cuentas.reduce((acc, cuenta) => {
        acc.total += 1;
        acc[cuenta.tipo] = (acc[cuenta.tipo] || 0) + 1;
        if (cuenta.estado === "activa") acc.activas += 1;
        return acc;
      }, { total: 0, activas: 0 }),
    [cuentas]
  );

  const resumenDiario = useMemo(
    () =>
      partidas.reduce(
        (acc, partida) => {
          acc.partidas += 1;
          (partida.detalle || []).forEach((linea) => {
            acc.debe += Number(linea.debe || 0);
            acc.haber += Number(linea.haber || 0);
          });
          return acc;
        },
        {
          partidas: 0,
          debe: 0,
          haber: 0,
        }
      ),
    [partidas]
  );

  const resumenCxC = useMemo(
    () =>
      cuentasCobrar.reduce(
        (acc, cliente) => {
          acc.clientes += 1;
          acc.pendiente += Number(cliente.saldo_pendiente || 0);
          acc.favor += Number(cliente.saldo_favor || 0);
          acc.documentos += Number(cliente.documentos_pendientes || 0);
          acc.limite += Number(cliente.limite_credito || 0);
          return acc;
        },
        {
          clientes: 0,
          pendiente: 0,
          favor: 0,
          documentos: 0,
          limite: 0,
        }
      ),
    [cuentasCobrar]
  );

  const resumenCxP = useMemo(
    () =>
      cuentasPagar.reduce(
        (acc, proveedor) => {
          acc.proveedores += 1;
          acc.documentos += Number(proveedor.documentos || 0);
          acc.total += Number(proveedor.total || 0);
          return acc;
        },
        {
          proveedores: 0,
          documentos: 0,
          total: 0,
        }
      ),
    [cuentasPagar]
  );

  const cargarCuentas = async () => {
    try {
      const res = await fetch(
        `${API}/contabilidad/cuentas?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setError(data.error || "No se pudo cargar el catalogo de cuentas.");
        setCuentas([]);
        return;
      }

      setCuentas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
      setCuentas([]);
    }
  };

  const cargarCierres = async () => {
    try {
      const res = await fetch(
        `${API}/contabilidad/cierres-caja?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setError(data.error || "No se pudieron cargar los cierres.");
        setCierres([]);
        return;
      }

      setCierres(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
      setCierres([]);
    }
  };

  const cargarPartidas = async (filtrosOverride = null) => {
    try {
      const filtrosActivos = filtrosOverride || filtrosDiario;
      const params = new URLSearchParams({
        empresa_id: user.empresa_id,
      });

      Object.entries(filtrosActivos).forEach(([key, value]) => {
        if (String(value || "").trim()) {
          params.set(key, value);
        }
      });

      const res = await fetch(
        `${API}/contabilidad/libro-diario?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setError(data.error || "No se pudo cargar el libro diario.");
        setPartidas([]);
        return;
      }

      setPartidas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
      setPartidas([]);
    }
  };

  const cargarCuentasCobrar = async (filtrosOverride = null) => {
    try {
      const filtrosActivos = filtrosOverride || filtrosCxC;
      const params = new URLSearchParams({
        empresa_id: user.empresa_id,
      });

      Object.entries(filtrosActivos).forEach(([key, value]) => {
        if (String(value || "").trim()) {
          params.set(key, value);
        }
      });

      const res = await fetch(
        `${API}/contabilidad/cuentas-cobrar?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setError(data.error || "No se pudieron cargar cuentas por cobrar.");
        setCuentasCobrar([]);
        return;
      }

      setCuentasCobrar(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
      setCuentasCobrar([]);
    }
  };

  const cargarDetalleCxC = async (cliente) => {
    setDetalleCxC({
      cliente,
      documentos: cliente.documentos || [],
      movimientos: [],
      cargando: true,
    });

    try {
      const res = await fetch(
        `${API}/contabilidad/cuentas-cobrar/${cliente.id}?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setError(data.error || "No se pudo cargar el detalle del cliente.");
        return;
      }

      setDetalleCxC({
        ...data,
        cargando: false,
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
    }
  };

  const cargarCuentasPagar = async (filtrosOverride = null) => {
    try {
      const filtrosActivos = filtrosOverride || filtrosCxP;
      const params = new URLSearchParams({
        empresa_id: user.empresa_id,
      });

      Object.entries(filtrosActivos).forEach(([key, value]) => {
        if (String(value || "").trim()) {
          params.set(key, value);
        }
      });

      const res = await fetch(
        `${API}/contabilidad/cuentas-pagar?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setError(data.error || "No se pudieron cargar cuentas por pagar.");
        setCuentasPagar([]);
        return;
      }

      setCuentasPagar(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
      setCuentasPagar([]);
    }
  };

  const cargarDetalleCxP = async (proveedor) => {
    setDetalleCxP({
      proveedor,
      compras: proveedor.compras || [],
      cargando: true,
    });

    try {
      const res = await fetch(
        `${API}/contabilidad/cuentas-pagar/${proveedor.proveedor_id}?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setError(data.error || "No se pudo cargar el detalle del proveedor.");
        return;
      }

      setDetalleCxP({
        ...data,
        cargando: false,
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
    }
  };

  const pagarCompraProveedor = async (compra, metodo_pago = "banco") => {
    const res = await fetch(
      `${API}/contabilidad/cuentas-pagar/${compra.id}/pagar`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          empresa_id: user.empresa_id,
          metodo_pago,
        }),
      }
    );
    const data = await leerRespuesta(res);

    if (!res.ok) {
      setError(data.error || "No se pudo registrar el pago.");
      return;
    }

    setMensaje("Pago registrado");
    await cargarCuentasPagar();
    if (detalleCxP?.proveedor) {
      await cargarDetalleCxP(detalleCxP.proveedor);
    }
    await cargarPartidas();
    setTimeout(() => setMensaje(""), 2200);
  };

  const cargarReportesFinancieros = async (filtrosOverride = null) => {
    try {
      const filtrosActivos = filtrosOverride || filtrosReportes;
      const params = new URLSearchParams({
        empresa_id: user.empresa_id,
      });

      Object.entries(filtrosActivos).forEach(([key, value]) => {
        if (String(value || "").trim()) {
          params.set(key, value);
        }
      });

      const res = await fetch(
        `${API}/contabilidad/reportes-financieros?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setError(data.error || "No se pudieron cargar reportes financieros.");
        setReportes(null);
        return;
      }

      setReportes(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
      setReportes(null);
    }
  };

  const cargarTodo = async () => {
    setCargando(true);
    setError("");
    await Promise.all([
      cargarCuentas(),
      cargarCierres(),
      cargarPartidas(),
      cargarCuentasCobrar(),
      cargarCuentasPagar(),
      cargarReportesFinancieros(),
    ]);
    setCargando(false);
  };

  useEffect(() => {
    cargarTodo();
  }, [user?.empresa_id]);

  const guardarCuenta = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    const url = cuentaEditando
      ? `${API}/contabilidad/cuentas/${cuentaEditando.id}`
      : `${API}/contabilidad/cuentas`;

    const res = await fetch(url, {
      method: cuentaEditando ? "PATCH" : "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        ...formCuenta,
        empresa_id: user.empresa_id,
      }),
    });
    const data = await leerRespuesta(res);

    if (!res.ok) {
      setError(data.error || "No se pudo guardar la cuenta.");
      return;
    }

    setMensaje(cuentaEditando ? "Cuenta actualizada" : "Cuenta creada");
    setFormCuenta(cuentaInicial);
    setCuentaEditando(null);
    await cargarCuentas();
    setTimeout(() => setMensaje(""), 2200);
  };

  const editarCuenta = (cuenta) => {
    setCuentaEditando(cuenta);
    setFormCuenta({
      codigo: cuenta.codigo || "",
      nombre: cuenta.nombre || "",
      tipo: cuenta.tipo || "activo",
      naturaleza: cuenta.naturaleza || "deudora",
      cuenta_padre_id: cuenta.cuenta_padre_id || "",
      permite_movimiento: cuenta.permite_movimiento !== false,
      estado: cuenta.estado || "activa",
    });
  };

  const inactivarCuenta = async (cuenta) => {
    const res = await fetch(`${API}/contabilidad/cuentas/${cuenta.id}`, {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({
        empresa_id: user.empresa_id,
      }),
    });
    const data = await leerRespuesta(res);

    if (!res.ok) {
      setError(data.error || "No se pudo inactivar la cuenta.");
      return;
    }

    setMensaje("Cuenta inactivada");
    await cargarCuentas();
    setTimeout(() => setMensaje(""), 2200);
  };

  const formatoFecha = (fecha) =>
    fecha ? new Date(fecha).toLocaleString() : "-";

  const claseDiferencia = (valor) => {
    const numero = Number(valor || 0);
    if (numero === 0) return "neutral";
    return numero > 0 ? "positivo" : "negativo";
  };

  return (
    <section className="contabilidad-page">
      <div className="contabilidad-header">
        <div>
          <span>CONTABILIDAD</span>
          <h1>Gestion contable</h1>
          <p>Catalogo de cuentas, caja y base para partidas automaticas.</p>
        </div>

        <button type="button" onClick={cargarTodo}>
          Actualizar
        </button>
      </div>

      <div className="contabilidad-tabs">
        <button
          type="button"
          className={tab === "cuentas" ? "activo" : ""}
          onClick={() => setTab("cuentas")}
        >
          Catalogo de cuentas
        </button>
        <button
          type="button"
          className={tab === "caja" ? "activo" : ""}
          onClick={() => setTab("caja")}
        >
          Cierres de caja
        </button>
        <button
          type="button"
          className={tab === "diario" ? "activo" : ""}
          onClick={() => setTab("diario")}
        >
          Libro diario
        </button>
        <button
          type="button"
          className={tab === "cxc" ? "activo" : ""}
          onClick={() => setTab("cxc")}
        >
          Cuentas por cobrar
        </button>
        <button
          type="button"
          className={tab === "cxp" ? "activo" : ""}
          onClick={() => setTab("cxp")}
        >
          Cuentas por pagar
        </button>
        <button
          type="button"
          className={tab === "reportes" ? "activo" : ""}
          onClick={() => setTab("reportes")}
        >
          Reportes financieros
        </button>
      </div>

      {error && <div className="contabilidad-error">{error}</div>}
      {mensaje && <div className="contabilidad-ok">{mensaje}</div>}

      {tab === "cuentas" && (
        <>
          <div className="contabilidad-resumen cuentas">
            <article>
              <span>Total cuentas</span>
              <strong>{resumenCuentas.total}</strong>
            </article>
            <article>
              <span>Activas</span>
              <strong>{resumenCuentas.activas}</strong>
            </article>
            <article>
              <span>Activos</span>
              <strong>{resumenCuentas.activo || 0}</strong>
            </article>
            <article>
              <span>Pasivos</span>
              <strong>{resumenCuentas.pasivo || 0}</strong>
            </article>
            <article>
              <span>Ingresos</span>
              <strong>{resumenCuentas.ingreso || 0}</strong>
            </article>
            <article>
              <span>Gastos</span>
              <strong>{resumenCuentas.gasto || 0}</strong>
            </article>
          </div>

          <div className="contabilidad-grid">
            <div className="contabilidad-card">
              <div className="contabilidad-card-head">
                <div>
                  <h2>{cuentaEditando ? "Editar cuenta" : "Nueva cuenta"}</h2>
                  <p>Clasifique las cuentas que usara la empresa.</p>
                </div>
              </div>

              <form className="cuenta-form" onSubmit={guardarCuenta}>
                <label>
                  <span>Codigo</span>
                  <input
                    value={formCuenta.codigo}
                    onChange={(e) =>
                      setFormCuenta({ ...formCuenta, codigo: e.target.value })
                    }
                    placeholder="Ejemplo: 101.01"
                  />
                </label>

                <label>
                  <span>Nombre</span>
                  <input
                    value={formCuenta.nombre}
                    onChange={(e) =>
                      setFormCuenta({ ...formCuenta, nombre: e.target.value })
                    }
                    placeholder="Nombre de la cuenta"
                  />
                </label>

                <label>
                  <span>Tipo</span>
                  <select
                    value={formCuenta.tipo}
                    onChange={(e) =>
                      setFormCuenta({ ...formCuenta, tipo: e.target.value })
                    }
                  >
                    <option value="activo">Activo</option>
                    <option value="pasivo">Pasivo</option>
                    <option value="patrimonio">Patrimonio</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="costo">Costo</option>
                    <option value="gasto">Gasto</option>
                  </select>
                </label>

                <label>
                  <span>Naturaleza</span>
                  <select
                    value={formCuenta.naturaleza}
                    onChange={(e) =>
                      setFormCuenta({ ...formCuenta, naturaleza: e.target.value })
                    }
                  >
                    <option value="deudora">Deudora</option>
                    <option value="acreedora">Acreedora</option>
                  </select>
                </label>

                <label>
                  <span>Cuenta padre</span>
                  <select
                    value={formCuenta.cuenta_padre_id}
                    onChange={(e) =>
                      setFormCuenta({
                        ...formCuenta,
                        cuenta_padre_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Sin cuenta padre</option>
                    {cuentas.map((cuenta) => (
                      <option key={cuenta.id} value={cuenta.id}>
                        {cuenta.codigo} - {cuenta.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Estado</span>
                  <select
                    value={formCuenta.estado}
                    onChange={(e) =>
                      setFormCuenta({ ...formCuenta, estado: e.target.value })
                    }
                  >
                    <option value="activa">Activa</option>
                    <option value="inactiva">Inactiva</option>
                  </select>
                </label>

                <label className="cuenta-check">
                  <input
                    type="checkbox"
                    checked={formCuenta.permite_movimiento}
                    onChange={(e) =>
                      setFormCuenta({
                        ...formCuenta,
                        permite_movimiento: e.target.checked,
                      })
                    }
                  />
                  <span>Permite movimientos</span>
                </label>

                <div className="cuenta-form-actions">
                  {cuentaEditando && (
                    <button
                      type="button"
                      className="secundario"
                      onClick={() => {
                        setCuentaEditando(null);
                        setFormCuenta(cuentaInicial);
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                  <button type="submit">
                    {cuentaEditando ? "Guardar cambios" : "Crear cuenta"}
                  </button>
                </div>
              </form>
            </div>

            <div className="contabilidad-card">
              <div className="contabilidad-card-head">
                <div>
                  <h2>Catalogo</h2>
                  <p>Cuentas contables de la empresa.</p>
                </div>
              </div>

              {cargando ? (
                <div className="contabilidad-vacio">Cargando cuentas...</div>
              ) : cuentas.length === 0 ? (
                <div className="contabilidad-vacio">Aun no hay cuentas creadas.</div>
              ) : (
                <div className="cuentas-lista">
                  {cuentas.map((cuenta) => (
                    <div className="cuenta-item" key={cuenta.id}>
                      <div>
                        <strong>{cuenta.codigo} - {cuenta.nombre}</strong>
                        <span>
                          {cuenta.tipo} / {cuenta.naturaleza}
                        </span>
                        <small>
                          {cuenta.permite_movimiento
                            ? "Acepta movimientos"
                            : "Cuenta agrupadora"}
                        </small>
                      </div>

                      <span className={`cuenta-estado ${cuenta.estado}`}>
                        {cuenta.estado}
                      </span>

                      <div className="cuenta-actions">
                        <button type="button" onClick={() => editarCuenta(cuenta)}>
                          Editar
                        </button>
                        {cuenta.estado !== "inactiva" && (
                          <button
                            type="button"
                            className="danger"
                            onClick={() => inactivarCuenta(cuenta)}
                          >
                            Inactivar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === "caja" && (
        <>
          <div className="contabilidad-resumen">
            <article>
              <span>Efectivo</span>
              <strong>Q{totalResumen.efectivo.toFixed(2)}</strong>
            </article>
            <article>
              <span>Tarjeta</span>
              <strong>Q{totalResumen.tarjeta.toFixed(2)}</strong>
            </article>
            <article>
              <span>Transferencia</span>
              <strong>Q{totalResumen.transferencia.toFixed(2)}</strong>
            </article>
            <article>
              <span>Credito</span>
              <strong>Q{totalResumen.credito.toFixed(2)}</strong>
            </article>
            <article>
              <span>Gastos</span>
              <strong>Q{totalResumen.gastos.toFixed(2)}</strong>
            </article>
            <article className={claseDiferencia(totalResumen.diferencia)}>
              <span>Diferencia</span>
              <strong>Q{totalResumen.diferencia.toFixed(2)}</strong>
            </article>
          </div>

          <div className="contabilidad-card">
            <div className="contabilidad-card-head">
              <div>
                <h2>Historial de turnos</h2>
                <p>Ultimos cierres y cajas abiertas.</p>
              </div>
            </div>

            {cargando ? (
              <div className="contabilidad-vacio">Cargando cierres...</div>
            ) : cierres.length === 0 ? (
              <div className="contabilidad-vacio">Aun no hay cierres registrados.</div>
            ) : (
              <div className="contabilidad-tabla-wrap">
                <table className="contabilidad-tabla">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Usuario</th>
                      <th>Apertura</th>
                      <th>Cierre</th>
                      <th>Inicial</th>
                      <th>Ajustes</th>
                      <th>Esperado</th>
                      <th>Contado</th>
                      <th>Diferencia</th>
                      <th>Efectivo</th>
                      <th>Tarjeta</th>
                      <th>Transferencia</th>
                      <th>Credito</th>
                      <th>Gastos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cierres.map((cierre) => (
                      <tr key={cierre.id}>
                        <td>
                          <span className={`contabilidad-estado ${cierre.estado}`}>
                            {cierre.estado}
                          </span>
                        </td>
                        <td>{cierre.usuario_nombre || "-"}</td>
                        <td>{formatoFecha(cierre.fecha_apertura)}</td>
                        <td>{formatoFecha(cierre.fecha_cierre)}</td>
                        <td>Q{Number(cierre.monto_apertura || 0).toFixed(2)}</td>
                        <td>Q{Number(cierre.total_ajustes || 0).toFixed(2)}</td>
                        <td>Q{Number(cierre.efectivo_esperado || 0).toFixed(2)}</td>
                        <td>Q{Number(cierre.monto_cierre || 0).toFixed(2)}</td>
                        <td>
                          <span className={`contabilidad-diferencia ${claseDiferencia(cierre.diferencia)}`}>
                            Q{Number(cierre.diferencia || 0).toFixed(2)}
                          </span>
                        </td>
                        <td>Q{Number(cierre.ventas_efectivo || 0).toFixed(2)}</td>
                        <td>Q{Number(cierre.ventas_tarjeta || 0).toFixed(2)}</td>
                        <td>Q{Number(cierre.ventas_transferencia || 0).toFixed(2)}</td>
                        <td>Q{Number(cierre.ventas_credito || 0).toFixed(2)}</td>
                        <td>Q{Number(cierre.gastos || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "diario" && (
        <>
          <div className="contabilidad-resumen diario">
            <article>
              <span>Partidas</span>
              <strong>{resumenDiario.partidas}</strong>
            </article>
            <article>
              <span>Total debe</span>
              <strong>Q{resumenDiario.debe.toFixed(2)}</strong>
            </article>
            <article>
              <span>Total haber</span>
              <strong>Q{resumenDiario.haber.toFixed(2)}</strong>
            </article>
            <article className={claseDiferencia(resumenDiario.debe - resumenDiario.haber)}>
              <span>Diferencia</span>
              <strong>Q{(resumenDiario.debe - resumenDiario.haber).toFixed(2)}</strong>
            </article>
          </div>

          <div className="contabilidad-card">
            <div className="contabilidad-card-head">
              <div>
                <h2>Libro diario</h2>
                <p>Partidas generadas automaticamente por ventas y gastos.</p>
              </div>
            </div>

            <form
              className="diario-filtros"
              onSubmit={(e) => {
                e.preventDefault();
                cargarPartidas();
              }}
            >
              <label>
                <span>Desde</span>
                <input
                  type="date"
                  value={filtrosDiario.fecha_inicio}
                  onChange={(e) =>
                    setFiltrosDiario({
                      ...filtrosDiario,
                      fecha_inicio: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Hasta</span>
                <input
                  type="date"
                  value={filtrosDiario.fecha_fin}
                  onChange={(e) =>
                    setFiltrosDiario({
                      ...filtrosDiario,
                      fecha_fin: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Origen</span>
                <select
                  value={filtrosDiario.origen}
                  onChange={(e) =>
                    setFiltrosDiario({
                      ...filtrosDiario,
                      origen: e.target.value,
                    })
                  }
                >
                  <option value="">Todos</option>
                  <option value="venta">Venta</option>
                  <option value="gasto_caja">Gasto de caja</option>
                  <option value="compra">Compra</option>
                  <option value="pago_proveedor">Pago proveedor</option>
                </select>
              </label>

              <label>
                <span>Cuenta</span>
                <select
                  value={filtrosDiario.cuenta_id}
                  onChange={(e) =>
                    setFiltrosDiario({
                      ...filtrosDiario,
                      cuenta_id: e.target.value,
                    })
                  }
                >
                  <option value="">Todas las cuentas</option>
                  {cuentas
                    .filter((cuenta) => cuenta.permite_movimiento !== false)
                    .map((cuenta) => (
                      <option key={cuenta.id} value={cuenta.id}>
                        {cuenta.codigo} - {cuenta.nombre}
                      </option>
                    ))}
                </select>
              </label>

              <label className="diario-texto">
                <span>Buscar</span>
                <input
                  value={filtrosDiario.texto}
                  onChange={(e) =>
                    setFiltrosDiario({
                      ...filtrosDiario,
                      texto: e.target.value,
                    })
                  }
                  placeholder="Descripcion, referencia o cuenta"
                />
              </label>

              <div className="diario-filtros-actions">
                <button type="submit">Buscar</button>
                <button
                  type="button"
                  className="secundario"
                  onClick={async () => {
                    setFiltrosDiario(filtrosDiarioInicial);
                    cargarPartidas(filtrosDiarioInicial);
                  }}
                >
                  Limpiar
                </button>
              </div>
            </form>

            {cargando ? (
              <div className="contabilidad-vacio">Cargando partidas...</div>
            ) : partidas.length === 0 ? (
              <div className="contabilidad-vacio">No hay partidas para los filtros seleccionados.</div>
            ) : (
              <div className="partidas-lista">
                {partidas.map((partida) => {
                  const totalDebe = (partida.detalle || []).reduce(
                    (sum, linea) => sum + Number(linea.debe || 0),
                    0
                  );
                  const totalHaber = (partida.detalle || []).reduce(
                    (sum, linea) => sum + Number(linea.haber || 0),
                    0
                  );

                  return (
                    <article className="partida-card" key={partida.id}>
                      <header>
                        <div>
                          <strong>{partida.descripcion}</strong>
                          <span>
                            {formatoFecha(partida.fecha)} / {partida.origen} / {partida.referencia_codigo || "-"}
                          </span>
                        </div>
                        <b>{partida.usuario_nombre || "-"}</b>
                      </header>

                      <div className="partida-tabla-wrap">
                        <table className="partida-tabla">
                          <thead>
                            <tr>
                              <th>Cuenta</th>
                              <th>Descripcion</th>
                              <th>Debe</th>
                              <th>Haber</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(partida.detalle || []).map((linea) => (
                              <tr key={linea.id}>
                                <td>
                                  {linea.cuenta_codigo} - {linea.cuenta_nombre}
                                </td>
                                <td>{linea.descripcion || "-"}</td>
                                <td>Q{Number(linea.debe || 0).toFixed(2)}</td>
                                <td>Q{Number(linea.haber || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan="2">Totales</td>
                              <td>Q{totalDebe.toFixed(2)}</td>
                              <td>Q{totalHaber.toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "cxc" && (
        <>
          <div className="contabilidad-resumen cxc">
            <article>
              <span>Clientes</span>
              <strong>{resumenCxC.clientes}</strong>
            </article>
            <article>
              <span>Documentos</span>
              <strong>{resumenCxC.documentos}</strong>
            </article>
            <article>
              <span>Pendiente</span>
              <strong>Q{resumenCxC.pendiente.toFixed(2)}</strong>
            </article>
            <article>
              <span>Saldo a favor</span>
              <strong>Q{resumenCxC.favor.toFixed(2)}</strong>
            </article>
          </div>

          <div className="contabilidad-card">
            <div className="contabilidad-card-head">
              <div>
                <h2>Cuentas por cobrar</h2>
                <p>Clientes con credito, saldos pendientes y movimientos de cuenta.</p>
              </div>
            </div>

            <form
              className="diario-filtros cxc-filtros"
              onSubmit={(e) => {
                e.preventDefault();
                cargarCuentasCobrar();
              }}
            >
              <label className="diario-texto">
                <span>Buscar cliente</span>
                <input
                  value={filtrosCxC.texto}
                  onChange={(e) =>
                    setFiltrosCxC({
                      ...filtrosCxC,
                      texto: e.target.value,
                    })
                  }
                  placeholder="Codigo, nombre, NIT, telefono o correo"
                />
              </label>

              <label>
                <span>Estado</span>
                <select
                  value={filtrosCxC.estado}
                  onChange={(e) =>
                    setFiltrosCxC({
                      ...filtrosCxC,
                      estado: e.target.value,
                    })
                  }
                >
                  <option value="pendientes">Con saldo pendiente</option>
                  <option value="autorizados">Autorizados a credito</option>
                  <option value="con_saldo_favor">Con saldo a favor</option>
                  <option value="todos">Todos</option>
                </select>
              </label>

              <div className="diario-filtros-actions">
                <button type="submit">Buscar</button>
                <button
                  type="button"
                  className="secundario"
                  onClick={() => {
                    setFiltrosCxC(filtrosCxCInicial);
                    cargarCuentasCobrar(filtrosCxCInicial);
                  }}
                >
                  Limpiar
                </button>
              </div>
            </form>

            {cargando ? (
              <div className="contabilidad-vacio">Cargando cuentas por cobrar...</div>
            ) : cuentasCobrar.length === 0 ? (
              <div className="contabilidad-vacio">No hay cuentas por cobrar para los filtros seleccionados.</div>
            ) : (
              <div className="cxc-layout">
                <div className="cxc-lista">
                  {cuentasCobrar.map((cliente) => {
                    const saldoPendiente = Number(cliente.saldo_pendiente || 0);
                    const limite = Number(cliente.limite_credito || 0);
                    const disponible = Math.max(limite - saldoPendiente, 0);

                    return (
                      <button
                        type="button"
                        className={
                          detalleCxC?.cliente?.id === cliente.id
                            ? "cxc-cliente activo"
                            : "cxc-cliente"
                        }
                        key={cliente.id}
                        onClick={() => cargarDetalleCxC(cliente)}
                      >
                        <div>
                          <strong>{cliente.codigo} - {cliente.nombre}</strong>
                          <span>{cliente.nit || "CF"} / {cliente.telefono || "Sin telefono"}</span>
                          <small>
                            Documentos: {Number(cliente.documentos_pendientes || 0)}
                          </small>
                        </div>
                        <div className="cxc-montos">
                          <b>Q{saldoPendiente.toFixed(2)}</b>
                          <small>Disponible Q{disponible.toFixed(2)}</small>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="cxc-detalle">
                  {!detalleCxC ? (
                    <div className="contabilidad-vacio">
                      Seleccione un cliente para ver documentos y movimientos.
                    </div>
                  ) : (
                    <>
                      <div className="cxc-detalle-head">
                        <div>
                          <span>{detalleCxC.cliente?.codigo}</span>
                          <h3>{detalleCxC.cliente?.nombre}</h3>
                          <p>
                            Pendiente Q{Number(detalleCxC.cliente?.saldo_pendiente || 0).toFixed(2)}
                            {" / "}
                            Favor Q{Number(detalleCxC.cliente?.saldo_favor || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="cxc-subcard">
                        <h4>Documentos de credito</h4>
                        {(detalleCxC.documentos || []).length === 0 ? (
                          <div className="contabilidad-vacio">Sin documentos de credito.</div>
                        ) : (
                          <div className="cxc-documentos">
                            {(detalleCxC.documentos || []).map((doc) => (
                              <article key={doc.id}>
                                <div>
                                  <strong>Venta #{doc.id}</strong>
                                  <span>{formatoFecha(doc.fecha)}</span>
                                </div>
                                <span className={`cuenta-estado ${doc.estado_cuenta === "pagada" ? "activa" : "inactiva"}`}>
                                  {doc.estado_cuenta || "pendiente"}
                                </span>
                                <b>Q{Number(doc.total || 0).toFixed(2)}</b>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="cxc-subcard">
                        <h4>Movimientos de cuenta</h4>
                        {(detalleCxC.movimientos || []).length === 0 ? (
                          <div className="contabilidad-vacio">Sin movimientos registrados.</div>
                        ) : (
                          <div className="cxc-movimientos">
                            {(detalleCxC.movimientos || []).map((mov) => (
                              <article key={mov.id}>
                                <div>
                                  <strong>{mov.tipo}</strong>
                                  <span>{mov.motivo || "-"}</span>
                                  <small>
                                    {formatoFecha(mov.fecha)} / {mov.usuario_nombre || "-"}
                                  </small>
                                </div>
                                <b>Q{Number(mov.monto || 0).toFixed(2)}</b>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "cxp" && (
        <>
          <div className="contabilidad-resumen cxc">
            <article>
              <span>Proveedores</span>
              <strong>{resumenCxP.proveedores}</strong>
            </article>
            <article>
              <span>Documentos</span>
              <strong>{resumenCxP.documentos}</strong>
            </article>
            <article>
              <span>Total por pagar</span>
              <strong>Q{resumenCxP.total.toFixed(2)}</strong>
            </article>
            <article>
              <span>Estado</span>
              <strong>{filtrosCxP.estado}</strong>
            </article>
          </div>

          <div className="contabilidad-card">
            <div className="contabilidad-card-head">
              <div>
                <h2>Cuentas por pagar</h2>
                <p>Compras pendientes, proveedores y pagos registrados.</p>
              </div>
            </div>

            <form
              className="diario-filtros cxc-filtros"
              onSubmit={(e) => {
                e.preventDefault();
                cargarCuentasPagar();
              }}
            >
              <label className="diario-texto">
                <span>Buscar proveedor</span>
                <input
                  value={filtrosCxP.texto}
                  onChange={(e) =>
                    setFiltrosCxP({
                      ...filtrosCxP,
                      texto: e.target.value,
                    })
                  }
                  placeholder="Proveedor, telefono, correo o documento"
                />
              </label>

              <label>
                <span>Estado</span>
                <select
                  value={filtrosCxP.estado}
                  onChange={(e) =>
                    setFiltrosCxP({
                      ...filtrosCxP,
                      estado: e.target.value,
                    })
                  }
                >
                  <option value="pendientes">Pendientes</option>
                  <option value="pagadas">Pagadas</option>
                  <option value="todos">Todas</option>
                </select>
              </label>

              <div className="diario-filtros-actions">
                <button type="submit">Buscar</button>
                <button
                  type="button"
                  className="secundario"
                  onClick={() => {
                    setFiltrosCxP(filtrosCxPInicial);
                    cargarCuentasPagar(filtrosCxPInicial);
                  }}
                >
                  Limpiar
                </button>
              </div>
            </form>

            {cargando ? (
              <div className="contabilidad-vacio">Cargando cuentas por pagar...</div>
            ) : cuentasPagar.length === 0 ? (
              <div className="contabilidad-vacio">No hay cuentas por pagar para los filtros seleccionados.</div>
            ) : (
              <div className="cxc-layout">
                <div className="cxc-lista">
                  {cuentasPagar.map((proveedor) => (
                    <button
                      type="button"
                      className={
                        detalleCxP?.proveedor?.id === proveedor.proveedor_id ||
                        detalleCxP?.proveedor?.proveedor_id === proveedor.proveedor_id
                          ? "cxc-cliente activo"
                          : "cxc-cliente"
                      }
                      key={proveedor.proveedor_id}
                      onClick={() => cargarDetalleCxP(proveedor)}
                    >
                      <div>
                        <strong>{proveedor.proveedor}</strong>
                        <span>{proveedor.telefono || "Sin telefono"} / {proveedor.email || "Sin correo"}</span>
                        <small>Documentos: {Number(proveedor.documentos || 0)}</small>
                      </div>
                      <div className="cxc-montos">
                        <b>Q{Number(proveedor.total || 0).toFixed(2)}</b>
                        <small>{filtrosCxP.estado}</small>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="cxc-detalle">
                  {!detalleCxP ? (
                    <div className="contabilidad-vacio">
                      Seleccione un proveedor para ver compras y pagos.
                    </div>
                  ) : (
                    <>
                      <div className="cxc-detalle-head">
                        <div>
                          <span>Proveedor</span>
                          <h3>{detalleCxP.proveedor?.nombre || detalleCxP.proveedor?.proveedor}</h3>
                          <p>
                            {detalleCxP.proveedor?.telefono || "Sin telefono"}
                            {" / "}
                            {detalleCxP.proveedor?.email || "Sin correo"}
                          </p>
                        </div>
                      </div>

                      <div className="cxc-subcard">
                        <h4>Compras del proveedor</h4>
                        {(detalleCxP.compras || []).length === 0 ? (
                          <div className="contabilidad-vacio">Sin compras registradas.</div>
                        ) : (
                          <div className="cxc-documentos">
                            {(detalleCxP.compras || []).map((compra) => {
                              const pagada = compra.estado_pago === "pagada";

                              return (
                                <article key={compra.id}>
                                  <div>
                                    <strong>Compra #{compra.id}</strong>
                                    <span>
                                      {compra.documento || "Sin documento"} / {formatoFecha(compra.fecha)}
                                    </span>
                                    <small>
                                      {pagada
                                        ? `Pagada ${formatoFecha(compra.fecha_pago)}`
                                        : "Pendiente de pago"}
                                    </small>
                                  </div>
                                  <span className={`cuenta-estado ${pagada ? "activa" : "inactiva"}`}>
                                    {pagada ? "pagada" : "pendiente"}
                                  </span>
                                  <b>Q{Number(compra.total || 0).toFixed(2)}</b>
                                  {!pagada && (
                                    <div className="cxp-pago-actions">
                                      <button
                                        type="button"
                                        onClick={() => pagarCompraProveedor(compra, "banco")}
                                      >
                                        Pagar banco
                                      </button>
                                      <button
                                        type="button"
                                        className="secundario"
                                        onClick={() => pagarCompraProveedor(compra, "efectivo")}
                                      >
                                        Pagar efectivo
                                      </button>
                                    </div>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "reportes" && (
        <>
          <div className="contabilidad-resumen reportes">
            <article>
              <span>Ingresos</span>
              <strong>Q{Number(reportes?.estado_resultados?.ingresos || 0).toFixed(2)}</strong>
            </article>
            <article>
              <span>Costos y gastos</span>
              <strong>
                Q
                {(
                  Number(reportes?.estado_resultados?.costos || 0) +
                  Number(reportes?.estado_resultados?.gastos || 0)
                ).toFixed(2)}
              </strong>
            </article>
            <article className={Number(reportes?.estado_resultados?.utilidad || 0) >= 0 ? "neutral" : "negativo"}>
              <span>Utilidad</span>
              <strong>Q{Number(reportes?.estado_resultados?.utilidad || 0).toFixed(2)}</strong>
            </article>
            <article className={claseDiferencia(reportes?.balance_general?.diferencia || 0)}>
              <span>Balance diferencia</span>
              <strong>Q{Number(reportes?.balance_general?.diferencia || 0).toFixed(2)}</strong>
            </article>
          </div>

          <div className="contabilidad-card">
            <div className="contabilidad-card-head">
              <div>
                <h2>Reportes financieros</h2>
                <p>Estado de resultados, balance general y flujo de efectivo basico.</p>
              </div>
            </div>

            <form
              className="diario-filtros reportes-filtros"
              onSubmit={(e) => {
                e.preventDefault();
                cargarReportesFinancieros();
              }}
            >
              <label>
                <span>Desde</span>
                <input
                  type="date"
                  value={filtrosReportes.fecha_inicio}
                  onChange={(e) =>
                    setFiltrosReportes({
                      ...filtrosReportes,
                      fecha_inicio: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Hasta</span>
                <input
                  type="date"
                  value={filtrosReportes.fecha_fin}
                  onChange={(e) =>
                    setFiltrosReportes({
                      ...filtrosReportes,
                      fecha_fin: e.target.value,
                    })
                  }
                />
              </label>

              <div className="diario-filtros-actions">
                <button type="submit">Generar</button>
                <button
                  type="button"
                  className="secundario"
                  onClick={() => {
                    setFiltrosReportes(filtrosReportesInicial);
                    cargarReportesFinancieros(filtrosReportesInicial);
                  }}
                >
                  Limpiar
                </button>
              </div>
            </form>

            {!reportes ? (
              <div className="contabilidad-vacio">No hay reportes financieros generados.</div>
            ) : (
              <div className="reportes-grid">
                <section className="reporte-card">
                  <header>
                    <h3>Estado de resultados</h3>
                    <span>Periodo seleccionado</span>
                  </header>

                  <div className="reporte-lineas">
                    <div>
                      <span>Ingresos</span>
                      <strong>Q{Number(reportes.estado_resultados.ingresos || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Costos</span>
                      <strong>Q{Number(reportes.estado_resultados.costos || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Gastos</span>
                      <strong>Q{Number(reportes.estado_resultados.gastos || 0).toFixed(2)}</strong>
                    </div>
                    <div className="total">
                      <span>Utilidad neta</span>
                      <strong>Q{Number(reportes.estado_resultados.utilidad || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </section>

                <section className="reporte-card">
                  <header>
                    <h3>Balance general</h3>
                    <span>Acumulado hasta la fecha final</span>
                  </header>

                  <div className="reporte-lineas">
                    <div>
                      <span>Activos</span>
                      <strong>Q{Number(reportes.balance_general.activos || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Pasivos</span>
                      <strong>Q{Number(reportes.balance_general.pasivos || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Patrimonio</span>
                      <strong>Q{Number(reportes.balance_general.patrimonio || 0).toFixed(2)}</strong>
                    </div>
                    <div className="total">
                      <span>Diferencia</span>
                      <strong>Q{Number(reportes.balance_general.diferencia || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </section>

                <section className="reporte-card">
                  <header>
                    <h3>Flujo de efectivo</h3>
                    <span>Caja y bancos</span>
                  </header>

                  <div className="reporte-lineas">
                    <div>
                      <span>Entradas</span>
                      <strong>Q{Number(reportes.flujo_efectivo.entradas || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Salidas</span>
                      <strong>Q{Number(reportes.flujo_efectivo.salidas || 0).toFixed(2)}</strong>
                    </div>
                    <div className="total">
                      <span>Flujo neto</span>
                      <strong>Q{Number(reportes.flujo_efectivo.neto || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {reportes && (
              <div className="reportes-detalle">
                <section>
                  <h3>Cuentas de resultado</h3>
                  <table className="partida-tabla">
                    <thead>
                      <tr>
                        <th>Cuenta</th>
                        <th>Tipo</th>
                        <th>Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportes.estado_resultados.cuentas || []).map((cuenta) => (
                        <tr key={`${cuenta.codigo}-${cuenta.tipo}`}>
                          <td>{cuenta.codigo} - {cuenta.nombre}</td>
                          <td>{cuenta.tipo}</td>
                          <td>Q{Number(cuenta.saldo || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section>
                  <h3>Cuentas de balance</h3>
                  <table className="partida-tabla">
                    <thead>
                      <tr>
                        <th>Cuenta</th>
                        <th>Tipo</th>
                        <th>Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportes.balance_general.cuentas || []).map((cuenta) => (
                        <tr key={`${cuenta.codigo}-${cuenta.tipo}`}>
                          <td>{cuenta.codigo} - {cuenta.nombre}</td>
                          <td>{cuenta.tipo}</td>
                          <td>Q{Number(cuenta.saldo || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
