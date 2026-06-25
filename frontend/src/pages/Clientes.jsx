import { useEffect, useMemo, useState } from "react";
import "./Clientes.css";
import { API } from "../config";

const clienteInicial = {
  nombre: "",
  nit: "",
  direccion: "",
  telefono: "",
  correo: "",
  fecha_cumpleanos: "",
  permite_credito: false,
  limite_credito: "",
  saldo_favor: "",
  estado: "activo",
};

const columnasImportacionClientes = [
  "nombre",
  "nit",
  "direccion",
  "telefono",
  "correo",
  "fecha_cumpleanos",
  "permite_credito",
  "limite_credito",
  "saldo_favor",
  "estado",
];

const ejemploImportacionClientes = [
  [
    "SERGIO LEONARDO",
    "1234567",
    "CIUDAD",
    "5555-0000",
    "cliente@email.com",
    "1990-06-19",
    "si",
    "200.00",
    "0",
    "activo",
  ],
  [
    "CONSUMIDOR FRECUENTE",
    "CF",
    "CIUDAD",
    "4444-0000",
    "",
    "1988-12-05",
    "no",
    "0",
    "50.00",
    "activo",
  ],
];

export default function Clientes({ user }) {
  const [clientes, setClientes] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [clienteActivo, setClienteActivo] = useState(null);
  const [form, setForm] = useState(clienteInicial);
  const [editandoId, setEditandoId] = useState(null);
  const [clienteEliminar, setClienteEliminar] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [importacion, setImportacion] = useState({
    archivo: "",
    filas: [],
    errores: [],
  });

  const token = sessionStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const puedeGestionar = user?.rol === "admin";

  const cargarClientes = async () => {
    const res = await fetch(`${API}/clientes?empresa_id=${user.empresa_id}&activos=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const texto = await res.text();
    const data = texto ? JSON.parse(texto) : {};

    if (res.ok) {
      setClientes(Array.isArray(data) ? data : []);
    }
  };

  const cargarMovimientos = async (cliente) => {
    setClienteActivo(cliente);

    const res = await fetch(
      `${API}/clientes/${cliente.id}/movimientos?empresa_id=${user.empresa_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    if (res.ok) {
      setMovimientos(Array.isArray(data) ? data : []);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return clientes;

    return clientes.filter((cliente) =>
      [
        cliente.codigo,
        cliente.nombre,
        cliente.nit,
        cliente.telefono,
        cliente.correo,
        cliente.fecha_cumpleanos,
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto)
    );
  }, [clientes, busqueda]);

  const limpiar = () => {
    setForm(clienteInicial);
    setEditandoId(null);
  };

  const descargarPlantillaClientes = () => {
    const escaparCsv = (valor) => {
      const texto = String(valor ?? "");
      const necesitaComillas = /[",\n\r]/.test(texto);
      const limpio = texto.replace(/"/g, '""');

      return necesitaComillas ? `"${limpio}"` : limpio;
    };

    const contenido = [
      "sep=,",
      columnasImportacionClientes.map(escaparCsv).join(","),
      ...ejemploImportacionClientes.map((fila) =>
        fila.map(escaparCsv).join(",")
      ),
    ].join("\r\n");
    const blob = new Blob(["\ufeff", contenido], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "plantilla_clientes.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const parsearCsvClientes = (texto) => {
    const lineas = texto
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter(Boolean)
      .filter((linea) => !/^sep\s*=/i.test(linea));

    if (lineas.length < 2) return [];

    const separador =
      lineas[0].split(";").length >= lineas[0].split(",").length
        ? ";"
        : ",";
    const encabezados = lineas[0]
      .split(separador)
      .map((columna) => columna.trim());

    return lineas.slice(1).map((linea) => {
      const valores = linea.split(separador);

      return encabezados.reduce((fila, encabezado, index) => {
        fila[encabezado] = (valores[index] || "").trim();
        return fila;
      }, {});
    });
  };

  const validarFilasClientes = (filas) => {
    const errores = [];

    filas.forEach((fila, index) => {
      const filaNumero = index + 2;

      if (!String(fila.nombre || "").trim()) {
        errores.push(`Fila ${filaNumero}: falta nombre`);
      }

      if (
        fila.limite_credito &&
        Number.isNaN(Number(fila.limite_credito))
      ) {
        errores.push(`Fila ${filaNumero}: limite_credito invalido`);
      }

      if (fila.saldo_favor && Number.isNaN(Number(fila.saldo_favor))) {
        errores.push(`Fila ${filaNumero}: saldo_favor invalido`);
      }

      if (
        fila.fecha_cumpleanos &&
        Number.isNaN(new Date(fila.fecha_cumpleanos).getTime())
      ) {
        errores.push(`Fila ${filaNumero}: fecha_cumpleanos invalida`);
      }

      if (
        fila.estado &&
        !["activo", "bloqueado"].includes(String(fila.estado).toLowerCase())
      ) {
        errores.push(`Fila ${filaNumero}: estado debe ser activo o bloqueado`);
      }
    });

    return errores;
  };

  const cargarArchivoClientes = (e) => {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    const reader = new FileReader();

    reader.onload = () => {
      const filas = parsearCsvClientes(String(reader.result || ""));
      const errores = validarFilasClientes(filas);

      setImportacion({
        archivo: archivo.name,
        filas,
        errores,
      });
    };

    reader.onerror = () => {
      setMensaje("No se pudo leer el archivo");
      setTimeout(() => setMensaje(""), 2500);
    };

    reader.readAsText(archivo, "UTF-8");
    e.target.value = "";
  };

  const confirmarImportacionClientes = async () => {
    if (!puedeGestionar) return;

    if (importacion.errores.length > 0) {
      setMensaje("Corrige los errores antes de importar");
      setTimeout(() => setMensaje(""), 2500);
      return;
    }

    if (importacion.filas.length === 0) {
      setMensaje("Carga un archivo con clientes");
      setTimeout(() => setMensaje(""), 2500);
      return;
    }

    const res = await fetch(`${API}/clientes/importar`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filas: importacion.filas,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.error || "No se pudo importar clientes");
      setTimeout(() => setMensaje(""), 2500);
      return;
    }

    setMensaje(`${data.insertados || 0} clientes importados correctamente`);
    setImportacion({
      archivo: "",
      filas: [],
      errores: [],
    });
    await cargarClientes();

    setTimeout(() => setMensaje(""), 2500);
  };

  const guardarCliente = async (e) => {
    e.preventDefault();

    if (!puedeGestionar) return;

    const url = editandoId
      ? `${API}/clientes/${editandoId}`
      : `${API}/clientes`;

    const res = await fetch(url, {
      method: editandoId ? "PUT" : "POST",
      headers,
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.error || "No se pudo guardar el cliente");
      setTimeout(() => setMensaje(""), 2500);
      return;
    }

    setMensaje(editandoId ? "Cliente actualizado" : "Cliente creado");
    limpiar();
    await cargarClientes();

    setTimeout(() => setMensaje(""), 2500);
  };

  const editarCliente = (cliente) => {
    setEditandoId(cliente.id);
    setForm({
      nombre: cliente.nombre || "",
      nit: cliente.nit || "",
      direccion: cliente.direccion || "",
      telefono: cliente.telefono || "",
      correo: cliente.correo || "",
      fecha_cumpleanos: cliente.fecha_cumpleanos
        ? String(cliente.fecha_cumpleanos).slice(0, 10)
        : "",
      permite_credito: Boolean(cliente.permite_credito),
      limite_credito: cliente.limite_credito || "",
      saldo_favor: cliente.saldo_favor || "",
      estado: cliente.estado || "activo",
    });
  };

  const eliminarCliente = async (cliente) => {
    if (!puedeGestionar) return;

    setClienteEliminar(cliente);
  };

  const confirmarEliminarCliente = async () => {
    if (!clienteEliminar || !puedeGestionar) return;

    const res = await fetch(`${API}/clientes/${clienteEliminar.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.error || "No se pudo eliminar el cliente");
      setTimeout(() => setMensaje(""), 2500);
      return;
    }

    setMensaje(data.mensaje || "Cliente eliminado de la lista activa");
    setClienteActivo(null);
    setClienteEliminar(null);
    setMovimientos([]);
    await cargarClientes();

    setTimeout(() => setMensaje(""), 2500);
  };

  return (
    <main className="clientes-page">
      <header className="clientes-header">
        <div>
          <span>Clientes y credito</span>
          <h1>Clientes</h1>
          <p>Administra clientes autorizados, saldos y movimientos de cuenta.</p>
        </div>

        <div className="clientes-metricas">
          <div>
            <strong>{clientes.length}</strong>
            <small>Clientes</small>
          </div>
          <div>
            <strong>
              Q
              {clientes
                .reduce((sum, item) => sum + Number(item.saldo_pendiente || 0), 0)
                .toFixed(2)}
            </strong>
            <small>Pendiente</small>
          </div>
        </div>
      </header>

      {mensaje && <div className="clientes-mensaje">{mensaje}</div>}

      {puedeGestionar && (
        <section className="clientes-card">
          <div className="clientes-section-title">
            <span>{editandoId ? "Edicion" : "Nuevo cliente"}</span>
            <h2>{editandoId ? "Editar cliente" : "Crear cliente"}</h2>
          </div>

          <form className="clientes-form" onSubmit={guardarCliente}>
            <label>
              <span>Nombre</span>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </label>

            <label>
              <span>NIT</span>
              <input
                value={form.nit}
                onChange={(e) => setForm({ ...form, nit: e.target.value })}
              />
            </label>

            <label>
              <span>Telefono</span>
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </label>

            <label>
              <span>Correo</span>
              <input
                type="email"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
              />
            </label>

            <label>
              <span>Cumpleanos</span>
              <input
                type="date"
                value={form.fecha_cumpleanos}
                onChange={(e) =>
                  setForm({ ...form, fecha_cumpleanos: e.target.value })
                }
              />
            </label>

            <label className="clientes-form-full">
              <span>Direccion</span>
              <input
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              />
            </label>

            <label>
              <span>Limite de credito</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.limite_credito}
                onChange={(e) =>
                  setForm({ ...form, limite_credito: e.target.value })
                }
              />
            </label>

            {!editandoId && (
              <label>
                <span>Saldo a favor inicial</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.saldo_favor}
                  onChange={(e) =>
                    setForm({ ...form, saldo_favor: e.target.value })
                  }
                />
              </label>
            )}

            <label>
              <span>Estado</span>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                <option value="activo">Activo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </label>

            <label className="clientes-switch">
              <input
                type="checkbox"
                checked={form.permite_credito}
                onChange={(e) =>
                  setForm({ ...form, permite_credito: e.target.checked })
                }
              />
              <span>Permite credito</span>
            </label>

            <div className="clientes-actions clientes-form-full">
              <button type="submit">
                {editandoId ? "Guardar cambios" : "Crear cliente"}
              </button>

              {editandoId && (
                <button type="button" className="secundario" onClick={limpiar}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {puedeGestionar && (
        <section className="clientes-card clientes-import-card">
          <div className="clientes-lista-head">
            <div className="clientes-section-title">
              <span>Carga masiva</span>
              <h2>Importar clientes</h2>
            </div>

            <div className="clientes-import-actions">
              <button type="button" onClick={descargarPlantillaClientes}>
                Descargar plantilla
              </button>

              <label className="clientes-upload-btn">
                Subir CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={cargarArchivoClientes}
                />
              </label>
            </div>
          </div>

          <div className="clientes-import-status">
            <strong>
              {importacion.archivo || "Sin archivo seleccionado"}
            </strong>
            <span>
              {importacion.filas.length} filas listas para revisar
            </span>
          </div>

          {importacion.errores.length > 0 && (
            <div className="clientes-import-errors">
              {importacion.errores.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}

          {importacion.filas.length > 0 && (
            <div className="clientes-tabla-wrap">
              <table className="clientes-tabla clientes-preview-table">
                <thead>
                  <tr>
                    {columnasImportacionClientes.map((columna) => (
                      <th key={columna}>{columna}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importacion.filas.slice(0, 8).map((fila, index) => (
                    <tr key={`${fila.nombre}-${index}`}>
                      {columnasImportacionClientes.map((columna) => (
                        <td key={columna}>{fila[columna] || "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="clientes-actions clientes-import-confirm">
            <button
              type="button"
              disabled={
                importacion.filas.length === 0 ||
                importacion.errores.length > 0
              }
              onClick={confirmarImportacionClientes}
            >
              Confirmar importacion
            </button>
          </div>
        </section>
      )}

      <section className="clientes-card">
        <div className="clientes-lista-head">
          <div className="clientes-section-title">
            <span>Detalle</span>
            <h2>Clientes creados</h2>
          </div>

          <input
            className="clientes-busqueda"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, codigo o NIT..."
          />
        </div>

        <div className="clientes-tabla-wrap">
          <table className="clientes-tabla">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Credito</th>
                <th>Saldos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.codigo}</td>
                  <td>
                    <strong>{cliente.nombre}</strong>
                    <small>{cliente.nit || "Sin NIT"}</small>
                  </td>
                  <td>
                    <span>{cliente.telefono || "Sin telefono"}</span>
                    <small>{cliente.correo || "Sin correo"}</small>
                    <small>
                      Cumpleanos:{" "}
                      {cliente.fecha_cumpleanos
                        ? new Date(cliente.fecha_cumpleanos).toLocaleDateString()
                        : "Sin fecha"}
                    </small>
                  </td>
                  <td>
                    {cliente.permite_credito ? (
                      <span className="pill verde">
                        Q{Number(cliente.limite_credito || 0).toFixed(2)}
                      </span>
                    ) : (
                      <span className="pill gris">Sin credito</span>
                    )}
                  </td>
                  <td>
                    <span>
                      Pendiente: Q{Number(cliente.saldo_pendiente || 0).toFixed(2)}
                    </span>
                    <small>
                      Favor: Q{Number(cliente.saldo_favor || 0).toFixed(2)}
                    </small>
                  </td>
                  <td>
                    <span className={`pill ${cliente.estado === "activo" ? "verde" : "rojo"}`}>
                      {cliente.estado}
                    </span>
                  </td>
                  <td>
                    <div className="clientes-row-actions">
                      <button onClick={() => cargarMovimientos(cliente)}>
                        Historial
                      </button>
                      {puedeGestionar && (
                        <>
                          <button className="secundario" onClick={() => editarCliente(cliente)}>
                            Editar
                          </button>
                          <button className="peligro" onClick={() => eliminarCliente(cliente)}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan="7">Aun no hay clientes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {clienteActivo && (
        <section className="clientes-card">
          <div className="clientes-section-title">
            <span>Historial</span>
            <h2>{clienteActivo.nombre}</h2>
          </div>

          <div className="clientes-tabla-wrap">
            <table className="clientes-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Motivo</th>
                  <th>Saldo pendiente</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((mov) => (
                  <tr key={mov.id}>
                    <td>{new Date(mov.fecha).toLocaleString()}</td>
                    <td>{mov.tipo}</td>
                    <td>Q{Number(mov.monto || 0).toFixed(2)}</td>
                    <td>{mov.motivo || "-"}</td>
                    <td>
                      Q{Number(mov.saldo_pendiente_nuevo || 0).toFixed(2)}
                    </td>
                    <td>{mov.usuario_nombre || "-"}</td>
                  </tr>
                ))}

                {movimientos.length === 0 && (
                  <tr>
                    <td colSpan="6">Este cliente aun no tiene movimientos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {clienteEliminar && (
        <div className="clientes-modal-overlay">
          <div className="clientes-modal">
            <h2>Eliminar cliente</h2>
            <p>
              Desea eliminar o bloquear al cliente{" "}
              <strong>{clienteEliminar.nombre}</strong>?
            </p>
            <div className="clientes-modal-actions">
              <button onClick={() => setClienteEliminar(null)}>
                Cancelar
              </button>
              <button
                className="peligro"
                onClick={confirmarEliminarCliente}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
