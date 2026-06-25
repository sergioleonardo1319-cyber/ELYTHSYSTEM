import { Fragment, useEffect, useMemo, useState } from "react";
import { API } from "./config";

const MINUTOS_OBJETIVO = 12;

const fechaLocalHoy = () => {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Cocina({ user }) {
  const [comandas, setComandas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [comandaAbierta, setComandaAbierta] = useState(null);
  const [departamentos, setDepartamentos] = useState([]);
  const [departamentoActivo, setDepartamentoActivo] = useState("TODOS");
  const [ahora, setAhora] = useState(Date.now());
  const [mensaje, setMensaje] = useState("");
  const [filtrosHistorial, setFiltrosHistorial] = useState({
    fecha: fechaLocalHoy(),
    departamento: "TODOS",
    estado: "TODOS",
  });

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
  });

  const cargarDepartamentos = async () => {
    try {
      const res = await fetch(
        `${API}/departamentos?empresa_id=${user.empresa_id}`,
        {
          headers: headers(),
        }
      );
      const data = await res.json();
      setDepartamentos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando departamentos:", error);
    }
  };

  const cargarComandas = async () => {
    try {
      const filtroDepartamento =
        departamentoActivo && departamentoActivo !== "TODOS"
          ? `&departamento=${encodeURIComponent(departamentoActivo)}`
          : "";

      const res = await fetch(
        `${API}/comandas?empresa_id=${user.empresa_id}${filtroDepartamento}`,
        {
          headers: headers(),
        }
      );
      const data = await res.json();

      setComandas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando comandas:", error);
    }
  };

  const cambiarEstado = async (id, estado) => {
    const res = await fetch(`${API}/comandas/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ estado }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensaje(data.error || "No se pudo actualizar la comanda");
      setTimeout(() => setMensaje(""), 3500);
      return;
    }

    cargarComandas();
  };

  const normalizarFiltrosHistorial = (filtros = {}) => ({
    fecha: filtros.fecha || fechaLocalHoy(),
    departamento: filtros.departamento || "TODOS",
    estado: filtros.estado || "TODOS",
  });

  const cargarHistorial = async (filtros = filtrosHistorial) => {
    try {
      const filtrosFinales = normalizarFiltrosHistorial(filtros);
      const params = new URLSearchParams({
        empresa_id: user.empresa_id,
        historial: "1",
        fecha: filtrosFinales.fecha,
      });

      if (filtrosFinales.departamento !== "TODOS") {
        params.set("departamento", filtrosFinales.departamento);
      }

      if (filtrosFinales.estado !== "TODOS") {
        params.set("estado", filtrosFinales.estado);
      }

      const res = await fetch(`${API}/comandas?${params.toString()}`, {
        headers: headers(),
      });
      const data = await res.json();

      setHistorial(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando historial:", error);
      setMensaje("No se pudo cargar el historial de comandas");
      setTimeout(() => setMensaje(""), 3500);
    }
  };

  const abrirHistorial = () => {
    const filtros = normalizarFiltrosHistorial({
      ...filtrosHistorial,
      fecha: filtrosHistorial.fecha || fechaLocalHoy(),
      departamento: departamentoActivo || "TODOS",
      estado: "TODOS",
    });

    setFiltrosHistorial(filtros);
    setMostrarHistorial(true);
    setComandaAbierta(null);
    cargarHistorial(filtros);
  };

  useEffect(() => {
    if (!user) return;

    cargarDepartamentos();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    cargarComandas();
    const recarga = setInterval(cargarComandas, 3000);
    const reloj = setInterval(() => setAhora(Date.now()), 1000);

    return () => {
      clearInterval(recarga);
      clearInterval(reloj);
    };
  }, [user, departamentoActivo]);

  const minutosDesde = (fecha) => {
    if (!fecha) return 0;
    return Math.max(0, Math.floor((ahora - new Date(fecha).getTime()) / 60000));
  };

  const minutosComanda = (comanda) => {
    if (comanda.estado === "LISTO" || comanda.estado === "ENTREGADO") {
      return Math.floor(Number(comanda.minutos || 0));
    }

    return minutosDesde(comanda.fecha);
  };

  const hora = (fecha) =>
    fecha
      ? new Date(fecha).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const textoTiempo = (minutos) => {
    if (minutos < 60) return `${minutos} min`;

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return `${horas}h ${resto}m`;
  };

  const textoComplementos = (complementos) => {
    if (!Array.isArray(complementos) || complementos.length === 0) {
      return null;
    }

    return complementos.map((grupo) => (
      <small key={`${grupo.grupo_id || grupo.nombre}`}>
        {grupo.nombre}:{" "}
        {(grupo.opciones || []).map((opcion) => opcion.nombre).join(", ")}
      </small>
    ));
  };

  const resumen = useMemo(() => {
    return comandas.reduce(
      (acc, comanda) => {
        acc.total += 1;
        acc[comanda.estado] = (acc[comanda.estado] || 0) + 1;

        if (
          ["PENDIENTE", "EN PREPARACION"].includes(comanda.estado) &&
          minutosDesde(comanda.fecha) > MINUTOS_OBJETIVO
        ) {
          acc.atrasadas += 1;
        }

        return acc;
      },
      {
        total: 0,
        PENDIENTE: 0,
        "EN PREPARACION": 0,
        LISTO: 0,
        atrasadas: 0,
      }
    );
  }, [comandas, ahora]);

  const columnas = [
    {
      titulo: "Pendientes",
      estado: "PENDIENTE",
      color: "#3b82f6",
      fondo: "#eff6ff",
    },
    {
      titulo: "En preparacion",
      estado: "EN PREPARACION",
      color: "#f59e0b",
      fondo: "#fffbeb",
    },
    {
      titulo: "Listas",
      estado: "LISTO",
      color: "#22c55e",
      fondo: "#f0fdf4",
    },
  ];

  const estadoPill = (comanda, minutos) => {
    if (comanda.estado === "LISTO") {
      return {
        texto: `Listo ${hora(comanda.fecha_listo)}`,
        fondo: "#dcfce7",
        color: "#166534",
      };
    }

    if (minutos > MINUTOS_OBJETIVO) {
      return {
        texto: "Atrasada",
        fondo: "#fee2e2",
        color: "#991b1b",
      };
    }

    if (minutos < 2) {
      return {
        texto: "Nueva",
        fondo: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    return {
      texto: comanda.estado === "PENDIENTE" ? "En espera" : "Preparando",
      fondo: "#e2e8f0",
      color: "#334155",
    };
  };

  const ComandaCard = ({ comanda, color }) => {
    const minutos = minutosComanda(comanda);
    const pill = estadoPill(comanda, minutos);
    const atrasada =
      ["PENDIENTE", "EN PREPARACION"].includes(comanda.estado) &&
      minutos > MINUTOS_OBJETIVO;

    return (
      <article
        style={{
          border: `1px solid ${atrasada ? "#fecaca" : "#e2e8f0"}`,
          borderLeft: `7px solid ${atrasada ? "#ef4444" : color}`,
          borderRadius: 14,
          background: "white",
          boxShadow: "0 14px 28px rgba(15,23,42,.08)",
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div>
            <h3
              style={{
                color: "#0f172a",
                fontSize: 21,
                margin: 0,
              }}
            >
              Comanda #{comanda.id}
            </h3>
            <p
              style={{
                color: "#64748b",
                fontWeight: 800,
                margin: "4px 0 0",
              }}
            >
              Venta #{comanda.venta_id} · {comanda.departamento}
            </p>
          </div>

          <span
            style={{
              borderRadius: 999,
              background: pill.fondo,
              color: pill.color,
              fontSize: 12,
              fontWeight: 950,
              padding: "8px 10px",
              whiteSpace: "nowrap",
            }}
          >
            {pill.texto}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            marginTop: 12,
          }}
        >
          <Dato label="Recibido" valor={hora(comanda.fecha)} />
          <Dato
            label={comanda.estado === "LISTO" ? "Tiempo prep." : "Tiempo"}
            valor={textoTiempo(minutos)}
            destacado={atrasada}
          />
          <Dato label="Listo" valor={hora(comanda.fecha_listo)} />
        </div>

        <section
          style={{
            borderRadius: 12,
            background: "#f8fafc",
            marginTop: 12,
            padding: 10,
          }}
        >
          <strong
            style={{
              color: "#0f172a",
              display: "block",
              fontSize: 14,
              marginBottom: 3,
            }}
          >
            {comanda.nombre_cliente || "CONSUMIDOR FINAL"}
          </strong>

          {comanda.observacion && (
            <p
              style={{
                borderRadius: 8,
                background: "#fef3c7",
                color: "#92400e",
                fontWeight: 900,
                margin: "8px 0 0",
                padding: 8,
              }}
            >
              Nota: {comanda.observacion}
            </p>
          )}
        </section>

        <div
          style={{
            display: "grid",
            gap: 8,
            marginTop: 12,
          }}
        >
          {comanda.productos?.map((producto, index) => (
            <div
              key={`${producto.producto_id || producto.producto}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                background: "#fff",
                padding: 10,
              }}
            >
              <span>
                <strong
                  style={{
                    color: "#0f172a",
                    display: "block",
                    fontSize: 16,
                  }}
                >
                  {producto.producto}
                </strong>
                <span
                  style={{
                    display: "grid",
                    gap: 4,
                    color: "#475569",
                    marginTop: 5,
                  }}
                >
                  {textoComplementos(producto.complementos)}
                  {producto.observacion && (
                    <small
                      style={{
                        borderRadius: 8,
                        background: "#fef3c7",
                        color: "#92400e",
                        fontWeight: 950,
                        padding: "6px 8px",
                      }}
                    >
                      Nota: {producto.observacion}
                    </small>
                  )}
                </span>
              </span>
              <b
                style={{
                  alignSelf: "start",
                  borderRadius: 10,
                  background: "#0f172a",
                  color: "white",
                  fontSize: 18,
                  padding: "7px 10px",
                }}
              >
                x{Number(producto.cantidad || 0)}
              </b>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 12,
          }}
        >
          {comanda.estado === "PENDIENTE" && (
            <button
              onClick={() => cambiarEstado(comanda.id, "EN PREPARACION")}
              style={boton("#f59e0b")}
            >
              Preparar
            </button>
          )}

          {comanda.estado !== "LISTO" && (
            <button
              onClick={() => cambiarEstado(comanda.id, "LISTO")}
              style={boton("#16a34a")}
            >
              Listo
            </button>
          )}

          {comanda.estado === "LISTO" && (
            <button
              onClick={() => cambiarEstado(comanda.id, "ENTREGADO")}
              style={boton("#64748b")}
            >
              Entregado
            </button>
          )}
        </div>
      </article>
    );
  };

  const Columna = ({ titulo, estado, color, fondo }) => {
    const items = comandas.filter((comanda) => comanda.estado === estado);

    return (
      <section
        style={{
          minWidth: 300,
          border: "1px solid #e2e8f0",
          borderRadius: 18,
          background: fondo,
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              color: "#0f172a",
              fontSize: 20,
              margin: 0,
            }}
          >
            {titulo}
          </h2>
          <strong
            style={{
              borderRadius: 999,
              background: color,
              color: "white",
              minWidth: 38,
              padding: "8px 10px",
              textAlign: "center",
            }}
          >
            {items.length}
          </strong>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {items.map((comanda) => (
            <ComandaCard key={comanda.id} comanda={comanda} color={color} />
          ))}

          {items.length === 0 && (
            <p
              style={{
                border: "1px dashed #cbd5e1",
                borderRadius: 12,
                color: "#64748b",
                fontWeight: 900,
                margin: 0,
                padding: 18,
                textAlign: "center",
              }}
            >
              Sin comandas
            </p>
          )}
        </div>
      </section>
    );
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#eef3f8",
        color: "#0f172a",
        fontFamily: "Arial, sans-serif",
        padding: 20,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <span
            style={{
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            Pantallas
          </span>
          <h1
            style={{
              color: "#0f172a",
              fontSize: 34,
              lineHeight: 1.05,
              margin: "5px 0 6px",
            }}
          >
            Produccion
          </h1>
          <p
            style={{
              color: "#64748b",
              fontSize: 14,
              fontWeight: 800,
              margin: 0,
            }}
          >
            {departamentoActivo === "TODOS"
              ? "Vista general de cocina, bar y departamentos activos."
              : `Mostrando solo comandas de ${departamentoActivo}.`}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 7,
              minWidth: 210,
            }}
          >
            <span
              style={{
                color: "#475569",
                fontSize: 11,
                fontWeight: 950,
                textTransform: "uppercase",
              }}
            >
              Departamento
            </span>
            <select
              value={departamentoActivo}
              onChange={(e) => setDepartamentoActivo(e.target.value)}
              style={{
                minHeight: 48,
                border: "1px solid #bfdbfe",
                borderRadius: 14,
                background: "white",
                color: "#0f172a",
                boxShadow: "0 12px 24px rgba(15,23,42,.07)",
                fontSize: 15,
                fontWeight: 900,
                outline: "none",
                padding: "0 13px",
              }}
            >
              <option value="TODOS">Todos</option>
              {departamentos.map((departamento) => (
                <option key={departamento.id} value={departamento.nombre}>
                  {departamento.nombre}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={abrirHistorial}
            style={{
              minHeight: 48,
              alignSelf: "end",
              border: "none",
              borderRadius: 14,
              background: "#0f172a",
              color: "white",
              boxShadow: "0 12px 24px rgba(15,23,42,.16)",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 950,
              padding: "0 18px",
            }}
          >
            Historial
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(100px, 1fr))",
              gap: 10,
            }}
          >
            <Resumen label="Pendientes" valor={resumen.PENDIENTE} />
            <Resumen label="Preparacion" valor={resumen["EN PREPARACION"]} />
            <Resumen label="Listas" valor={resumen.LISTO} />
            <Resumen label="Atrasadas" valor={resumen.atrasadas} alerta />
          </div>
        </div>
      </header>

      {mensaje && (
        <div
          style={{
            border: "1px solid #fecaca",
            borderRadius: 12,
            background: "#fef2f2",
            color: "#991b1b",
            fontWeight: 900,
            marginBottom: 14,
            padding: "12px 14px",
          }}
        >
          {mensaje}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        {columnas.map((columna) => (
          <Columna key={columna.estado} {...columna} />
        ))}
      </section>

      {mostrarHistorial && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10020,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,.62)",
            backdropFilter: "blur(5px)",
            padding: 18,
          }}
        >
          <section
            style={{
              width: "min(1240px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
              borderRadius: 18,
              background: "white",
              boxShadow: "0 24px 80px rgba(15,23,42,.35)",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <span
                  style={{
                    color: "#2563eb",
                    fontSize: 12,
                    fontWeight: 950,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                  }}
                >
                  Historial
                </span>
                <h2
                  style={{
                    color: "#0f172a",
                    fontSize: 28,
                    margin: "4px 0 3px",
                  }}
                >
                  Comandas del dia
                </h2>
                <p
                  style={{
                    color: "#64748b",
                    fontWeight: 800,
                    margin: 0,
                  }}
                >
                  Consulta comandas listas o entregadas sin regresar a la pantalla activa.
                </p>
              </div>

              <button
                onClick={() => setMostrarHistorial(false)}
                style={{
                  width: 42,
                  height: 42,
                  border: "none",
                  borderRadius: 999,
                  background: "#e2e8f0",
                  color: "#0f172a",
                  cursor: "pointer",
                  fontSize: 20,
                  fontWeight: 950,
                }}
              >
                x
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "end",
                flexWrap: "wrap",
                gap: "1cm",
                marginBottom: 18,
              }}
            >
              <CampoFiltro label="Fecha" width={230}>
                <input
                  type="date"
                  value={filtrosHistorial.fecha}
                  onChange={(e) =>
                    setFiltrosHistorial({
                      ...filtrosHistorial,
                      fecha: e.target.value,
                    })
                  }
                  style={inputFiltro}
                />
              </CampoFiltro>

              <CampoFiltro label="Departamento" width={280}>
                <select
                  value={filtrosHistorial.departamento}
                  onChange={(e) =>
                    setFiltrosHistorial({
                      ...filtrosHistorial,
                      departamento: e.target.value,
                    })
                  }
                  style={inputFiltro}
                >
                  <option value="TODOS">Todos</option>
                  {departamentos.map((departamento) => (
                    <option key={departamento.id} value={departamento.nombre}>
                      {departamento.nombre}
                    </option>
                  ))}
                </select>
              </CampoFiltro>

              <CampoFiltro label="Estado" width={260}>
                <select
                  value={filtrosHistorial.estado}
                  onChange={(e) =>
                    setFiltrosHistorial({
                      ...filtrosHistorial,
                      estado: e.target.value,
                    })
                  }
                  style={inputFiltro}
                >
                  <option value="ENTREGADO">Entregadas</option>
                  <option value="LISTO">Listas</option>
                  <option value="TODOS">Todos</option>
                </select>
              </CampoFiltro>

              <button
                onClick={() => cargarHistorial()}
                style={{
                  ...boton("#2563eb"),
                  alignSelf: "end",
                  flex: "initial",
                  minHeight: 44,
                  width: 220,
                }}
              >
                Buscar
              </button>
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                overflow: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 920,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Comanda",
                      "Venta",
                      "Departamento",
                      "Cliente",
                      "Recibido",
                      "Listo",
                      "Entregado",
                      "Tiempo",
                      "Estado",
                    ].map((titulo) => (
                      <th key={titulo} style={thHistorial}>
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.map((comanda) => (
                    <Fragment key={comanda.id}>
                      <tr
                        onClick={() =>
                          setComandaAbierta(
                            comandaAbierta === comanda.id ? null : comanda.id
                          )
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <td style={tdHistorial}>#{comanda.id}</td>
                        <td style={tdHistorial}>#{comanda.venta_id}</td>
                        <td style={tdHistorial}>{comanda.departamento}</td>
                        <td style={tdHistorial}>
                          {comanda.nombre_cliente || "CONSUMIDOR FINAL"}
                        </td>
                        <td style={tdHistorial}>{hora(comanda.fecha)}</td>
                        <td style={tdHistorial}>{hora(comanda.fecha_listo)}</td>
                        <td style={tdHistorial}>{hora(comanda.fecha_entregado)}</td>
                        <td style={tdHistorial}>
                          {textoTiempo(minutosComanda(comanda))}
                        </td>
                        <td style={tdHistorial}>{comanda.estado}</td>
                      </tr>

                      {comandaAbierta === comanda.id && (
                        <tr key={`${comanda.id}-detalle`}>
                          <td style={tdHistorial} colSpan="9">
                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                                borderRadius: 12,
                                background: "#f8fafc",
                                padding: 10,
                              }}
                            >
                              {comanda.productos?.map((producto, index) => (
                                <div
                                  key={`${producto.producto}-${index}`}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr auto",
                                    gap: 10,
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 10,
                                    background: "white",
                                    padding: 10,
                                  }}
                                >
                                  <span>
                                    <strong>{producto.producto}</strong>
                                    <span
                                      style={{
                                        display: "grid",
                                        gap: 3,
                                        color: "#475569",
                                        marginTop: 4,
                                      }}
                                    >
                                      {textoComplementos(producto.complementos)}
                                      {producto.observacion && (
                                        <small>Nota: {producto.observacion}</small>
                                      )}
                                    </span>
                                  </span>
                                  <b>x{Number(producto.cantidad || 0)}</b>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}

                  {historial.length === 0 && (
                    <tr>
                      <td style={tdHistorial} colSpan="9">
                        No hay comandas con esos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Dato({ label, valor, destacado = false }) {
  return (
    <div
      style={{
        borderRadius: 10,
        background: destacado ? "#fee2e2" : "#f8fafc",
        color: destacado ? "#991b1b" : "#0f172a",
        padding: "8px 9px",
      }}
    >
      <small
        style={{
          display: "block",
          color: destacado ? "#991b1b" : "#64748b",
          fontSize: 10,
          fontWeight: 950,
          textTransform: "uppercase",
        }}
      >
        {label}
      </small>
      <strong style={{ display: "block", fontSize: 14, marginTop: 2 }}>
        {valor}
      </strong>
    </div>
  );
}

function Resumen({ label, valor, alerta = false }) {
  return (
    <div
      style={{
        minWidth: 110,
        border: `1px solid ${alerta ? "#fecaca" : "#bfdbfe"}`,
        borderRadius: 14,
        background: alerta ? "#fef2f2" : "white",
        boxShadow: "0 12px 24px rgba(15,23,42,.07)",
        padding: "13px 14px",
        textAlign: "right",
      }}
    >
      <strong
        style={{
          display: "block",
          color: alerta ? "#dc2626" : "#2563eb",
          fontSize: 28,
          lineHeight: 1,
        }}
      >
        {valor}
      </strong>
      <small
        style={{
          color: "#475569",
          fontSize: 12,
          fontWeight: 950,
        }}
      >
        {label}
      </small>
    </div>
  );
}

function CampoFiltro({ label, children, width = 240 }) {
  return (
    <label
      style={{
        display: "grid",
        gap: 8,
        width,
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          color: "#475569",
          fontSize: 11,
          fontWeight: 950,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function boton(color) {
  return {
    flex: 1,
    minHeight: 42,
    border: "none",
    borderRadius: 10,
    background: color,
    color: "white",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 950,
    padding: "0 12px",
  };
}

const inputFiltro = {
  boxSizing: "border-box",
  width: "100%",
  minHeight: 44,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 800,
  outline: "none",
  padding: "0 12px",
};

const thHistorial = {
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 12,
  fontWeight: 950,
  padding: 12,
  textAlign: "left",
  textTransform: "uppercase",
};

const tdHistorial = {
  borderBottom: "1px solid #e2e8f0",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 800,
  padding: 12,
  verticalAlign: "top",
};
