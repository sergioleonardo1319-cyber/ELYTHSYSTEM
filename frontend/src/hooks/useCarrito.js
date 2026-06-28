import { useState } from "react";

const calcularPrecioComplementos = (complementos) =>
  complementos.reduce(
    (sum, grupo) =>
      sum +
      (Array.isArray(grupo.opciones)
        ? grupo.opciones.reduce(
            (sub, opcion) => sub + Number(opcion.precio_extra || 0),
            0
          )
        : 0),
    0
  );

export default function useCarrito(onAviso) {
  const [carrito, setCarrito] = useState([]);

  const agregarAlCarrito = (producto, configuracion = {}) => {
    setCarrito((prev) => {
      const complementos = Array.isArray(configuracion.complementos)
        ? configuracion.complementos
        : [];
      const observacion = String(configuracion.observacion || "").trim();
      const firmaComplementos = JSON.stringify({
        complementos,
        observacion,
      });
      const lineaId = `${producto.id}-${firmaComplementos}`;
      const existe = prev.find((p) => p.linea_id === lineaId);
      const existencia = Number(producto.existencia || 0);
      const controlaStock = producto.controla_stock !== false;
      const precioBase = Number(producto.precio || 0);
      const precio = precioBase + calcularPrecioComplementos(complementos);

      if (producto.habilitado_venta === false) {
        onAviso?.({
          tipo: "error",
          titulo: "Producto no disponible",
          mensaje: "Este producto no esta habilitado para venta.",
        });
        return prev;
      }

      if (controlaStock && existencia <= 0) {
        onAviso?.({
          tipo: "error",
          titulo: "Sin existencia",
          mensaje: "El producto no tiene existencia disponible.",
        });
        return prev;
      }

      if (existe) {
        return prev.map((p) =>
          p.linea_id === lineaId
            ? {
                ...p,
                cantidad:
                  !p.controlaStock || p.cantidad < p.existencia
                    ? p.cantidad + 1
                    : p.cantidad,
              }
            : p
        );
      }

      return [
        ...prev,
        {
          linea_id: lineaId,
          producto_id: producto.id,
          nombre: producto.nombre,
          precio,
          precio_base: precioBase,
          imagen_url: producto.imagen_url || "",
          cantidad: 1,
          existencia,
          controlaStock,
          departamento: producto.departamento || "",
          complementos,
          observacion,
        },
      ];
    });
  };

  const agregarCreditoAlCarrito = (credito) => {
    setCarrito((prev) => {
      const lineaId = `credito-${credito.id}`;
      const existe = prev.find((p) => p.linea_id === lineaId);

      if (existe) {
        onAviso?.({
          tipo: "info",
          titulo: "Credito ya agregado",
          mensaje: "Este credito pendiente ya esta en el carrito.",
        });
        return prev;
      }

      const detalle = Array.isArray(credito.detalle)
        ? credito.detalle
        : [];
      const monto = Number(credito.total || 0);

      return [
        ...prev,
        {
          linea_id: lineaId,
          tipo_linea: "credito_pendiente",
          venta_credito_id: credito.id,
          cliente_id: credito.cliente_id,
          cliente_nombre: credito.cliente_nombre,
          nombre: `Cobro credito #${credito.id}`,
          precio: monto,
          precio_base: monto,
          cantidad: 1,
          existencia: 1,
          controlaStock: false,
          departamento: "",
          complementos: detalle.length
            ? [
                {
                  grupo_id: `credito-${credito.id}`,
                  nombre: "Detalle",
                  opciones: detalle.map((item) => ({
                    nombre: `${Number(item.cantidad || 0)}x ${item.nombre}`,
                    precio_extra: 0,
                  })),
                },
              ]
            : [],
        },
      ];
    });
  };

  const eliminarItem = (id) => {
    setCarrito((prev) =>
      prev.filter((p) => p.linea_id !== id)
    );
  };

  const cambiarCantidad = (id, cantidad) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.linea_id === id
          ? { ...item, cantidad }
          : item
      )
    );
  };

  const actualizarCantidadDirecta = (id, valor) => {
    if (valor === "") return;

    const cantidad = Number(valor);

    if (isNaN(cantidad) || cantidad < 1) return;

    setCarrito((prev) =>
      prev.map((item) =>
        item.linea_id === id
          ? {
              ...item,
              cantidad: item.tipo_linea === "credito_pendiente"
                ? 1
                : item.controlaStock
                ? Math.min(
                    cantidad,
                    Number(item.existencia || cantidad)
                  )
                : cantidad,
            }
          : item
      )
    );
  };

  const vaciarCarrito = () => {
    setCarrito([]);
  };

  const total = carrito.reduce(
    (sum, item) => sum + item.precio * item.cantidad,
    0
  );

  return {
    carrito,
    setCarrito,
    agregarAlCarrito,
    agregarCreditoAlCarrito,
    eliminarItem,
    cambiarCantidad,
    actualizarCantidadDirecta,
    vaciarCarrito,
    total,
  };
}
