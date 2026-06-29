import { useEffect, useMemo, useState } from "react";
import "./ModalComplementos.css";

export default function ModalComplementos({
  producto,
  grupos,
  onCancelar,
  onAgregar,
}) {
  const [seleccion, setSeleccion] = useState({});
  const [error, setError] = useState("");
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    setSeleccion({});
    setError("");
    setObservacion("");
  }, [producto?.id, grupos]);

  const requierePreparacion = Boolean(
    String(producto?.departamento || "").trim() &&
      String(producto?.departamento || "").trim().toUpperCase() !== "NO APLICA"
  );

  const gruposVisibles = useMemo(() => {
    const visibles = [];

    const agregarGrupo = (grupo) => {
      visibles.push(grupo);

      const ids = seleccion[grupo.id] || [];

      (grupo.opciones || [])
        .filter((opcion) => ids.includes(opcion.id))
        .forEach((opcion) => {
          (opcion.subgrupos || []).forEach(agregarGrupo);
        });
    };

    grupos.forEach(agregarGrupo);

    return visibles;
  }, [grupos, seleccion]);

  const totalExtras = useMemo(() => {
    return gruposVisibles.reduce((sum, grupo) => {
      const ids = seleccion[grupo.id] || [];
      const opciones = grupo.opciones || [];

      return (
        sum +
        opciones
          .filter((opcion) => ids.includes(opcion.id))
          .reduce((sub, opcion) => sub + Number(opcion.precio_extra || 0), 0)
      );
    }, 0);
  }, [gruposVisibles, seleccion]);

  if (!producto) return null;

  const cambiarSeleccion = (grupo, opcion) => {
    setError("");

    setSeleccion((prev) => {
      const actual = prev[grupo.id] || [];
      const maximo = Number(grupo.maximo || 1);

      if (grupo.seleccion_multiple) {
        const existe = actual.includes(opcion.id);

        if (maximo <= 1) {
          return {
            ...prev,
            [grupo.id]: existe ? [] : [opcion.id],
          };
        }

        const nuevo = existe
          ? actual.filter((id) => id !== opcion.id)
          : [...actual, opcion.id];

        return {
          ...prev,
          [grupo.id]: nuevo.slice(0, maximo || nuevo.length),
        };
      }

      return {
        ...prev,
        [grupo.id]: [opcion.id],
      };
    });
  };

  const confirmar = () => {
    const complementos = [];

    for (const grupo of gruposVisibles) {
      const ids = seleccion[grupo.id] || [];
      const minimo = grupo.obligatorio ? Number(grupo.minimo || 1) : 0;
      const maximo = Number(grupo.maximo || 1);

      if (ids.length < minimo) {
        setError(`Seleccione ${grupo.nombre}.`);
        return;
      }

      if (ids.length > maximo) {
        setError(`Seleccione maximo ${maximo} en ${grupo.nombre}.`);
        return;
      }

      const opciones = (grupo.opciones || []).filter((opcion) =>
        ids.includes(opcion.id)
      );

      if (opciones.length > 0) {
        complementos.push({
          grupo_id: grupo.id,
          nombre: grupo.nombre,
          opciones: opciones.map((opcion) => ({
            opcion_id: opcion.id,
            nombre: opcion.nombre,
            precio_extra: Number(opcion.precio_extra || 0),
          })),
        });
      }
    }

    onAgregar(producto, {
      complementos,
      observacion: requierePreparacion ? observacion.trim() : "",
    });
  };

  return (
    <div className="complementos-overlay" onClick={onCancelar}>
      <div
        className="complementos-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="complementos-header">
          <div>
            <span>Configurar producto</span>
            <h2>{producto.nombre}</h2>
          </div>
          <button onClick={onCancelar}>x</button>
        </div>

        <div className="complementos-body">
          {gruposVisibles.length === 0 && requierePreparacion && (
            <section className="complementos-grupo">
              <div>
                <h3>Preparacion</h3>
                <p>Agregue una observacion si cocina o bar debe tomarla en cuenta.</p>
              </div>
            </section>
          )}

          {gruposVisibles.map((grupo) => (
            <section key={grupo.id} className="complementos-grupo">
              <div>
                <h3>{grupo.nombre}</h3>
                <p>
                  {grupo.seleccion_multiple
                    ? `Seleccione hasta ${grupo.maximo || 1}`
                    : "Seleccione una opcion"}
                </p>
              </div>

              <div className="complementos-opciones">
                {(grupo.opciones || []).map((opcion) => {
                  const activo = (seleccion[grupo.id] || []).includes(opcion.id);

                  return (
                    <button
                      key={opcion.id}
                      className={activo ? "activo" : ""}
                      onClick={() => cambiarSeleccion(grupo, opcion)}
                    >
                      <strong>{opcion.nombre}</strong>
                      {Number(opcion.precio_extra || 0) > 0 && (
                        <span>+Q{Number(opcion.precio_extra).toFixed(2)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {requierePreparacion && (
            <section className="complementos-observacion">
              <label>
                <span>Observacion para cocina/bar</span>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Ejemplo: sin cebolla, poco picante, entregar primero..."
                />
              </label>
            </section>
          )}

          {error && <div className="complementos-error">{error}</div>}
        </div>

        <div className="complementos-footer">
          <div>
            <small>Total producto</small>
            <strong>
              Q{(Number(producto.precio || 0) + totalExtras).toFixed(2)}
            </strong>
          </div>

          <button className="secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="principal" onClick={confirmar}>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
