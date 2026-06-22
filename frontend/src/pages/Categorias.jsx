import { useEffect, useMemo, useState } from "react";
import "./Categorias.css";
import { API } from "../config";

export default function Categorias({
  user,
  onCategoriasActualizadas,
}) {
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [categoriaEliminar, setCategoriaEliminar] = useState(null);
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

  const cargarCategorias = async () => {
    try {
      setCargando(true);

      const token = sessionStorage.getItem("token");

      const res = await fetch(
        `${API}/categorias?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await leerRespuesta(res);

      if (!res.ok) {
        console.error(data);
        return;
      }

      setCategorias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar categorias:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (user) {
      cargarCategorias();
    }
  }, [user]);

  const limpiar = () => {
    setNombre("");
    setEditandoId(null);
  };

  const refrescarCategorias = async () => {
    await cargarCategorias();

    if (onCategoriasActualizadas) {
      await onCategoriasActualizadas();
    }
  };

  const guardar = async () => {
    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      mostrarToast("Ingresa el nombre de la categoria");
      return;
    }

    try {
      const url = editandoId
        ? `${API}/categorias/${editandoId}`
        : `${API}/categorias`;

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
          rol: user.rol,
        }),
      });

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(
          data.error ||
          data.mensaje ||
          "Error al guardar categoria"
        );
      }

      limpiar();
      await refrescarCategorias();
      mostrarToast(
        editandoId
          ? "Categoria actualizada correctamente"
          : "Categoria creada correctamente"
      );
    } catch (error) {
      console.error("Error al guardar categoria:", error);
      mostrarToast(error.message);
    }
  };

  const editar = (categoria) => {
    setNombre(categoria.nombre || "");
    setEditandoId(categoria.id);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const confirmarEliminar = async () => {
    if (!categoriaEliminar) return;

    try {
      const res = await fetch(
        `${API}/categorias/${categoriaEliminar.id}`,
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
          "Error al eliminar categoria"
        );
      }

      if (editandoId === categoriaEliminar.id) {
        limpiar();
      }

      setCategoriaEliminar(null);
      await refrescarCategorias();
      mostrarToast("Categoria eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar categoria:", error);
      mostrarToast(error.message);
    }
  };

  const categoriasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return categorias;

    return categorias.filter((categoria) =>
      categoria.nombre?.toLowerCase().includes(texto)
    );
  }, [categorias, busqueda]);

  return (
    <div className="categorias-page">
      {toast && (
        <div className="categorias-toast">
          {toast}
        </div>
      )}

      <section className="categorias-hero">
        <div>
          <span>Catalogo</span>
          <h1>Categorias</h1>
          <p>
            Organiza los productos que aparecen en el POS por grupos claros.
          </p>
        </div>

        <div className="categorias-resumen">
          <strong>{categorias.length}</strong>
          <small>Categorias registradas</small>
        </div>
      </section>

      <section className="categorias-card">
        <div className="categorias-form-header">
          <div>
            <span>
              {editandoId ? "Editando categoria" : "Nueva categoria"}
            </span>
            <h2>
              {editandoId ? "Actualizar categoria" : "Crear categoria"}
            </h2>
          </div>
        </div>

        <div className="categorias-form">
          <label>
            <span>Nombre de la categoria</span>
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
            {editandoId ? "Actualizar" : "Crear categoria"}
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
            <h2>Listado de categorias</h2>
            <p>Administra los grupos que se muestran en productos y POS.</p>
          </div>

          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar categoria..."
          />
        </div>

        <div className="categorias-table-wrap">
          <table className="categorias-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Identificador</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="3">
                    Cargando categorias...
                  </td>
                </tr>
              ) : categoriasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="3">
                    Aun no hay categorias para mostrar.
                  </td>
                </tr>
              ) : (
                categoriasFiltradas.map((categoria) => (
                  <tr key={categoria.id}>
                    <td>
                      <div className="categoria-nombre">
                        <span>
                          {categoria.nombre?.slice(0, 1).toUpperCase() || "C"}
                        </span>
                        <strong>{categoria.nombre}</strong>
                      </div>
                    </td>
                    <td>#{categoria.id}</td>
                    <td>
                      <button
                        className="categoria-btn-editar"
                        title="Editar categoria"
                        onClick={() => editar(categoria)}
                      >
                        Editar
                      </button>

                      <button
                        className="categoria-btn-eliminar"
                        title="Eliminar categoria"
                        onClick={() => setCategoriaEliminar(categoria)}
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

      {categoriaEliminar && (
        <div className="categorias-modal-overlay">
          <div className="categorias-modal">
            <h2>Eliminar categoria</h2>
            <p>
              Esta accion eliminara la categoria
              <strong> {categoriaEliminar.nombre}</strong>.
            </p>

            <div className="categorias-modal-actions">
              <button
                className="categorias-btn-secondary"
                onClick={() => setCategoriaEliminar(null)}
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
