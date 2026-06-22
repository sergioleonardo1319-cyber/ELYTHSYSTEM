import { useEffect, useMemo, useState } from "react";
import "./Categorias.css";
import { API } from "../config";

export default function Departamentos({
  user,
  onDepartamentosActualizados,
}) {
  const [departamentos, setDepartamentos] = useState([]);
  const [nombre, setNombre] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [departamentoEliminar, setDepartamentoEliminar] = useState(null);
  const [toast, setToast] = useState("");
  const [cargando, setCargando] = useState(false);

  const mostrarToast = (mensaje) => {
    setToast(mensaje);

    setTimeout(() => {
      setToast("");
    }, 3000);
  };

  const leerRespuesta = async (res) => {
    const texto = await res.text();

    if (!texto) return {};

    try {
      return JSON.parse(texto);
    } catch {
      return {
        error: "Respuesta no valida del servidor.",
      };
    }
  };

  const cargarDepartamentos = async () => {
    try {
      setCargando(true);

      const res = await fetch(
        `${API}/departamentos?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
      console.error("Error al cargar departamentos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (user) {
      cargarDepartamentos();
    }
  }, [user]);

  const limpiar = () => {
    setNombre("");
    setEditandoId(null);
  };

  const refrescarDepartamentos = async () => {
    await cargarDepartamentos();

    if (onDepartamentosActualizados) {
      await onDepartamentosActualizados();
    }
  };

  const guardar = async () => {
    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      mostrarToast("Ingresa el nombre del departamento");
      return;
    }

    try {
      const url = editandoId
        ? `${API}/departamentos/${editandoId}`
        : `${API}/departamentos`;

      const method = editandoId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          nombre: nombreLimpio,
          empresa_id: user.empresa_id,
        }),
      });

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(
          data.error ||
          data.mensaje ||
          "Error al guardar departamento"
        );
      }

      limpiar();
      await refrescarDepartamentos();
      mostrarToast(
        editandoId
          ? "Departamento actualizado correctamente"
          : "Departamento creado correctamente"
      );
    } catch (error) {
      console.error("Error al guardar departamento:", error);
      mostrarToast(error.message);
    }
  };

  const editar = (departamento) => {
    setNombre(departamento.nombre || "");
    setEditandoId(departamento.id);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const confirmarEliminar = async () => {
    if (!departamentoEliminar) return;

    try {
      const res = await fetch(
        `${API}/departamentos/${departamentoEliminar.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(
          data.error ||
          data.mensaje ||
          "Error al eliminar departamento"
        );
      }

      if (editandoId === departamentoEliminar.id) {
        limpiar();
      }

      setDepartamentoEliminar(null);
      await refrescarDepartamentos();
      mostrarToast("Departamento eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar departamento:", error);
      mostrarToast(error.message);
    }
  };

  const departamentosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return departamentos;

    return departamentos.filter((departamento) =>
      departamento.nombre?.toLowerCase().includes(texto)
    );
  }, [departamentos, busqueda]);

  return (
    <div className="categorias-page">
      {toast && (
        <div className="categorias-toast">
          {toast}
        </div>
      )}

      <section className="categorias-hero">
        <div>
          <span>Produccion</span>
          <h1>Departamentos</h1>
          <p>
            Define las areas donde se mostraran comandas como cocina, bar o mostrador.
          </p>
        </div>

        <div className="categorias-resumen">
          <strong>{departamentos.length}</strong>
          <small>Departamentos registrados</small>
        </div>
      </section>

      <section className="categorias-card">
        <div className="categorias-form-header">
          <div>
            <span>
              {editandoId ? "Editando departamento" : "Nuevo departamento"}
            </span>
            <h2>
              {editandoId ? "Actualizar departamento" : "Crear departamento"}
            </h2>
          </div>
        </div>

        <div className="categorias-form">
          <label>
            <span>Nombre del departamento</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  guardar();
                }
              }}
            />
          </label>

          <button
            className="categorias-btn-primary"
            onClick={guardar}
          >
            {editandoId ? "Actualizar" : "Crear departamento"}
          </button>

          {editandoId && (
            <button
              className="categorias-btn-secondary"
              onClick={limpiar}
            >
              Cancelar
            </button>
          )}
        </div>
      </section>

      <section className="categorias-card">
        <div className="categorias-list-header">
          <div>
            <h2>Listado de departamentos</h2>
            <p>Administra las pantallas de preparacion y produccion.</p>
          </div>

          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar departamento..."
          />
        </div>

        <div className="categorias-table-wrap">
          <table className="categorias-table">
            <thead>
              <tr>
                <th>Departamento</th>
                <th>Identificador</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="3">
                    Cargando departamentos...
                  </td>
                </tr>
              ) : departamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="3">
                    Aun no hay departamentos para mostrar.
                  </td>
                </tr>
              ) : (
                departamentosFiltrados.map((departamento) => (
                  <tr key={departamento.id}>
                    <td>
                      <div className="categoria-nombre">
                        <span>
                          {departamento.nombre?.slice(0, 1).toUpperCase() || "D"}
                        </span>
                        <strong>{departamento.nombre}</strong>
                      </div>
                    </td>
                    <td>#{departamento.id}</td>
                    <td>
                      <button
                        className="categoria-btn-editar"
                        title="Editar departamento"
                        onClick={() => editar(departamento)}
                      >
                        Editar
                      </button>

                      <button
                        className="categoria-btn-eliminar"
                        title="Eliminar departamento"
                        onClick={() => setDepartamentoEliminar(departamento)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {departamentoEliminar && (
        <div className="categorias-modal-overlay">
          <div className="categorias-modal">
            <h2>Eliminar departamento</h2>
            <p>
              Esta accion eliminara el departamento
              <strong> {departamentoEliminar.nombre}</strong>.
            </p>

            <div className="categorias-modal-actions">
              <button
                className="categorias-btn-secondary"
                onClick={() => setDepartamentoEliminar(null)}
              >
                Cancelar
              </button>

              <button
                className="categorias-btn-danger"
                onClick={confirmarEliminar}
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
