import { useEffect, useMemo, useState } from "react";
import "./ModalCobro.css";
import { API } from "../config";

export default function ModalCobro({
  visible,
  total,
  tieneProductosPreparacion = false,
  onCancelar,
  onConfirmar,
}) {
  const [efectivo, setEfectivo] = useState("");
  const [tarjetaMonto, setTarjetaMonto] = useState("");
  const [transferenciaMonto, setTransferenciaMonto] = useState("");
  const [saldoFavorUsado, setSaldoFavorUsado] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState("Factura");
  const [clienteNit, setClienteNit] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [descuentoTipo, setDescuentoTipo] = useState("monto");
  const [descuentoValor, setDescuentoValor] = useState("");
  const [tarjetaAutorizacion, setTarjetaAutorizacion] = useState("");
  const [transferenciaCodigo, setTransferenciaCodigo] = useState("");
  const [comandaNombre, setComandaNombre] = useState("");
  const [alertaPago, setAlertaPago] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [claveOperacion, setClaveOperacion] = useState("");

  const generarCodigoRecibo = () =>
    `REC-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

  useEffect(() => {
    if (visible) {
      setEfectivo("");
      setTarjetaMonto("");
      setTransferenciaMonto("");
      setSaldoFavorUsado("");
      setTipoComprobante("Factura");
      setClienteNit("CF");
      setClienteNombre("CONSUMIDOR FINAL");
      setClienteDireccion("CIUDAD");
      setClienteId("");
      setClienteBusqueda("");
      setDescuentoTipo("monto");
      setDescuentoValor("");
      setTarjetaAutorizacion("");
      setTransferenciaCodigo("");
      setComandaNombre("");
      setAlertaPago(null);
      setProcesando(false);
      setClaveOperacion(
        `VENTA-${Date.now().toString(36).toUpperCase()}-${Math.random()
          .toString(36)
          .slice(2, 10)
          .toUpperCase()}`
      );

      fetch(`${API}/clientes?activos=1`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          setClientes(Array.isArray(data) ? data : []);
        })
        .catch(() => setClientes([]));
    }
  }, [visible]);

  const redondear = (valor) =>
    Math.round(Number(valor || 0) * 100) / 100;

  const descuentoMonto = useMemo(() => {
    const valor = Number(descuentoValor || 0);

    if (valor <= 0) return 0;

    if (descuentoTipo === "porcentaje") {
      return total * Math.min(valor, 100) / 100;
    }

    return Math.min(valor, total);
  }, [descuentoTipo, descuentoValor, total]);

  const totalFinal = useMemo(
    () => Math.max(total - descuentoMonto, 0),
    [total, descuentoMonto]
  );

  const totalPagado = useMemo(() => {
    return (
      Number(efectivo || 0) +
      Number(tarjetaMonto || 0) +
      Number(transferenciaMonto || 0) +
      Number(saldoFavorUsado || 0)
    );
  }, [efectivo, tarjetaMonto, transferenciaMonto, saldoFavorUsado]);

  const cambio = useMemo(
    () => totalPagado - totalFinal,
    [totalPagado, totalFinal]
  );

  const normalizarMonto = (valor) => {
    const limpio = String(valor || "")
      .replace(",", ".")
      .replace(/[^\d.]/g, "");
    const partes = limpio.split(".");
    const enteros = partes[0] || "";
    const decimales = partes.length > 1 ? partes.slice(1).join("").slice(0, 2) : "";

    if (!enteros && !decimales && limpio.includes(".")) return "0.";
    if (partes.length > 1) return `${enteros || "0"}.${decimales}`;
    return enteros;
  };

  const validarMontoDigitado = (valor, etiqueta) => {
    const monto = Number(valor || 0);

    if (monto > 0 && monto - totalFinal >= 100) {
      setAlertaPago({
        titulo: "Monto inusual",
        mensaje: `${etiqueta} es Q${monto.toFixed(2)} y supera demasiado el total de la venta. Verifique el monto antes de continuar.`,
      });
    }
  };

  const actualizarMonto = (setter, etiqueta) => (evento) => {
    const valor = normalizarMonto(evento.target.value);
    setter(valor);
    validarMontoDigitado(valor, etiqueta);
  };

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => String(cliente.id) === String(clienteId)),
    [clientes, clienteId]
  );

  const clientesFiltrados = useMemo(() => {
    const texto = clienteBusqueda.trim().toLowerCase();

    if (!texto) return clientes;

    return clientes.filter((cliente) => {
      const valores = [
        cliente.codigo,
        cliente.nombre,
        cliente.nit,
        cliente.telefono,
        cliente.correo,
        cliente.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return valores.includes(texto);
    });
  }, [clientes, clienteBusqueda]);

  const clientesVisibles = clientesFiltrados.slice(0, 8);

  if (!visible) return null;

  const confirmarPago = async () => {
    if (procesando) return;

    const esCredito = tipoComprobante === "Credito";
    const saldoFavorDisponible = Number(clienteSeleccionado?.saldo_favor || 0);
    const saldoFavorFinal = esCredito ? 0 : Number(saldoFavorUsado || 0);

    if (esCredito) {
      if (!clienteSeleccionado) {
        setAlertaPago({
          titulo: "Cliente requerido",
          mensaje: "Seleccione un cliente autorizado para credito.",
        });
        return;
      }

      if (
        !clienteSeleccionado.permite_credito ||
        clienteSeleccionado.estado !== "activo"
      ) {
        setAlertaPago({
          titulo: "Credito no autorizado",
          mensaje: "El cliente seleccionado no tiene credito activo.",
        });
        return;
      }

      const saldoFavor = Number(clienteSeleccionado.saldo_favor || 0);
      const saldoPendiente = Number(clienteSeleccionado.saldo_pendiente || 0);
      const limiteCredito = Number(clienteSeleccionado.limite_credito || 0);

      if (saldoFavor >= totalFinal) {
        setAlertaPago({
          titulo: "Saldo a favor disponible",
          mensaje: "El cliente tiene saldo a favor suficiente. Use Factura o Recibo para evitar cargarlo a credito.",
        });
        return;
      }

      if (saldoPendiente + totalFinal > limiteCredito) {
        setAlertaPago({
          titulo: "Limite de credito",
          mensaje: "El consumo supera el limite autorizado para este cliente.",
        });
        return;
      }
    }

    if (saldoFavorFinal > 0 && !clienteSeleccionado) {
      setAlertaPago({
        titulo: "Cliente requerido",
        mensaje: "Seleccione un cliente para usar saldo a favor.",
      });
      return;
    }

    if (saldoFavorFinal > saldoFavorDisponible) {
      setAlertaPago({
        titulo: "Saldo insuficiente",
        mensaje: "El monto ingresado supera el saldo a favor disponible.",
      });
      return;
    }

    if (saldoFavorFinal > totalFinal) {
      setAlertaPago({
        titulo: "Saldo mayor al total",
        mensaje: "El saldo a favor usado no puede ser mayor al total de la venta.",
      });
      return;
    }

    const diferencia = redondear(totalPagado - totalFinal);

    if (!esCredito && diferencia < 0) {
      setAlertaPago({
        titulo: "Pago incompleto",
        mensaje: `Falta Q${Math.abs(diferencia).toFixed(2)} para completar el pago.`,
      });
      return;
    }

    if (!esCredito && diferencia >= 100) {
      setAlertaPago({
        titulo: "Cambio inusualmente alto",
        mensaje: `El cambio calculado es Q${diferencia.toFixed(2)}. Verifique los montos ingresados antes de finalizar la venta.`,
      });
      return;
    }

    if (
      !esCredito &&
      Number(tarjetaMonto || 0) > 0 &&
      !tarjetaAutorizacion.trim()
    ) {
      setAlertaPago({
        titulo: "Autorizacion requerida",
        mensaje: "Ingrese el codigo de autorizacion de la tarjeta.",
      });
      return;
    }

    if (
      !esCredito &&
      Number(transferenciaMonto || 0) > 0 &&
      !transferenciaCodigo.trim()
    ) {
      setAlertaPago({
        titulo: "Transferencia requerida",
        mensaje: "Ingrese el codigo de transferencia.",
      });
      return;
    }

    const metodos = [];

    if (Number(saldoFavorUsado || 0) > 0) metodos.push("Saldo a favor");
    if (Number(efectivo || 0) > 0) metodos.push("Efectivo");
    if (Number(tarjetaMonto || 0) > 0) metodos.push("Tarjeta");
    if (Number(transferenciaMonto || 0) > 0) metodos.push("Transferencia");

    const metodoFinal =
      esCredito
        ? "Credito"
        : metodos.length > 1
        ? "Mixto"
        : metodos[0] || "Efectivo";

    const codigoReciboFinal =
      tipoComprobante === "Recibo"
        ? generarCodigoRecibo()
        : "";

    setProcesando(true);

    try {
      await onConfirmar({
      metodo_pago: metodoFinal,
      efectivo_recibido: esCredito ? 0 : Number(efectivo || 0),
      cambio: esCredito ? 0 : Math.max(cambio, 0),
      cliente_id: clienteSeleccionado?.id || "",
      cliente_nit: clienteNit.trim(),
      cliente_nombre: clienteNombre.trim(),
      cliente_direccion: clienteDireccion.trim(),
      descuento_tipo: descuentoTipo,
      descuento_valor: Number(descuentoValor || 0),
      descuento_monto: descuentoMonto,
      total_final: totalFinal,
      tarjeta_autorizacion:
        !esCredito && Number(tarjetaMonto || 0) > 0
          ? tarjetaAutorizacion.trim()
          : "",
      tarjeta_monto: esCredito ? 0 : Number(tarjetaMonto || 0),
      transferencia_monto: esCredito ? 0 : Number(transferenciaMonto || 0),
      transferencia_codigo: esCredito ? "" : transferenciaCodigo.trim(),
      saldo_favor_usado: saldoFavorFinal,
      tipo_comprobante: tipoComprobante,
      recibo_codigo: codigoReciboFinal,
      clave_operacion: claveOperacion,
      comanda_nombre: tieneProductosPreparacion
        ? comandaNombre.trim()
        : "",
      });
    } finally {
      setProcesando(false);
    }
  };

  const seleccionarCliente = (valor) => {
    setClienteId(valor);

    if (!valor) {
      setSaldoFavorUsado("");
      setClienteBusqueda("");
      usarConsumidorFinal();
      if (tieneProductosPreparacion) {
        setComandaNombre("");
      }
      return;
    }

    const cliente = clientes.find((item) => String(item.id) === String(valor));

    if (cliente) {
      setClienteBusqueda(`${cliente.codigo || ""} ${cliente.nombre || ""}`.trim());
      setClienteNit((cliente.nit || "CF").toUpperCase());
      setClienteNombre((cliente.nombre || "CONSUMIDOR FINAL").toUpperCase());
      setClienteDireccion("CIUDAD");
    }

    if (cliente && tieneProductosPreparacion) {
      setComandaNombre((cliente.nombre || "").toUpperCase());
    }
  };

  const buscarNit = async () => {
    const nitBuscado = clienteNit.trim().toUpperCase();

    if (!nitBuscado || nitBuscado === "CF") {
      usarConsumidorFinal();
      return;
    }

    try {
      const response = await fetch(
        `${API}/sat/consulta-nit/${encodeURIComponent(nitBuscado)}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setAlertaPago({
          titulo: "Consulta SAT pendiente",
          mensaje:
            data.error ||
            "No fue posible consultar los datos fiscales del NIT.",
        });
        return;
      }

      setClienteNit((data.nit || nitBuscado).toUpperCase());
      setClienteNombre((data.nombre || "").toUpperCase());
      setClienteDireccion((data.direccion || "").toUpperCase());
    } catch (error) {
      setAlertaPago({
        titulo: "No se pudo consultar",
        mensaje:
          "No fue posible conectar con la consulta de NIT en este momento.",
      });
    }
  };

  const usarConsumidorFinal = () => {
    setClienteNit("CF");
    setClienteNombre("CONSUMIDOR FINAL");
    setClienteDireccion("CIUDAD");
  };

  const prepararIngresoNit = () => {
    setClienteNit("");
    setClienteNombre("");
    setClienteDireccion("");
  };

  const cambiarTipoComprobante = (tipo) => {
    setTipoComprobante(tipo);

    if (tipo === "Credito") {
      setEfectivo("");
      setTarjetaMonto("");
      setTransferenciaMonto("");
      setSaldoFavorUsado("");
      setTarjetaAutorizacion("");
      setTransferenciaCodigo("");
    }
  };

  return (
    <div
      className="cobro-overlay"
      onClick={onCancelar}
    >
      <div
        className="cobro-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cobro-header">
          <div>
            <h2>FINALIZAR VENTA</h2>
          </div>
        </div>

        <div className="cobro-contenido">
          <section className="cobro-seccion">
            <div className="cobro-bloque">
              <h3>Datos fiscales</h3>

              <div className="cobro-nit-linea">
                <label className="cobro-field">
                  <span>NIT</span>
                  <input
                    value={clienteNit}
                    onChange={(e) => setClienteNit(e.target.value.toUpperCase())}
                    onFocus={prepararIngresoNit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        buscarNit();
                      }
                    }}
                    placeholder="CF o NIT"
                  />
                </label>

                <button
                  type="button"
                  className="cobro-mini-btn"
                  onClick={buscarNit}
                >
                  Buscar
                </button>

                <button
                  type="button"
                  className="cobro-mini-btn secundario"
                  onClick={usarConsumidorFinal}
                >
                  CF
                </button>
              </div>

              <label className="cobro-field">
                <span>Nombre</span>
                <input
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value.toUpperCase())}
                  placeholder="Nombre del cliente"
                />
              </label>

              <label className="cobro-field">
                <span>Direccion</span>
                <input
                  value={clienteDireccion}
                  onChange={(e) => setClienteDireccion(e.target.value.toUpperCase())}
                  placeholder="Direccion de facturacion"
                />
              </label>
            </div>

            <div className="cobro-bloque">
              <div className="cobro-bloque-header">
                <h3>Cliente registrado</h3>
                {clienteSeleccionado && (
                  <button
                    type="button"
                    onClick={() => seleccionarCliente("")}
                  >
                    Quitar
                  </button>
                )}
              </div>

              {!clienteSeleccionado && (
                <>
                  <label className="cobro-field">
                    <span>Buscar cliente interno</span>
                    <input
                      value={clienteBusqueda}
                      onChange={(e) => {
                        setClienteBusqueda(e.target.value);
                        setClienteId("");
                        setSaldoFavorUsado("");
                      }}
                      placeholder="Nombre, codigo, NIT o telefono"
                    />
                  </label>

                  {clienteBusqueda.trim() && (
                    <div className="cobro-clientes-resultados">
                      {clientesVisibles.map((cliente) => (
                        <button
                          type="button"
                          key={cliente.id}
                          onClick={() => seleccionarCliente(cliente.id)}
                        >
                          <strong>{cliente.codigo}</strong>
                          <span>{cliente.nombre}</span>
                          <small>
                            Favor Q{Number(cliente.saldo_favor || 0).toFixed(2)}
                            {" | "}
                            Pendiente Q{Number(cliente.saldo_pendiente || 0).toFixed(2)}
                          </small>
                        </button>
                      ))}

                      {clientesFiltrados.length === 0 && (
                        <div className="cobro-busqueda-vacia">
                          No se encontraron clientes con esa busqueda.
                        </div>
                      )}

                      {clientesFiltrados.length > clientesVisibles.length && (
                        <div className="cobro-busqueda-ayuda">
                          Escriba mas datos para reducir los resultados.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {clienteSeleccionado && (
                <div className="cobro-cliente-resumen">
                  <strong>{clienteSeleccionado.codigo}</strong>
                  <span>{clienteSeleccionado.nombre}</span>
                  <small>
                    Favor Q{Number(clienteSeleccionado.saldo_favor || 0).toFixed(2)}
                    {" | "}
                    Pendiente Q{Number(clienteSeleccionado.saldo_pendiente || 0).toFixed(2)}
                    {" | "}
                    Limite Q{Number(clienteSeleccionado.limite_credito || 0).toFixed(2)}
                  </small>
                </div>
              )}
            </div>

            {tieneProductosPreparacion && (
              <div className="cobro-bloque cobro-comanda-box">
                <h3>Datos para comanda</h3>

                <label className="cobro-field">
                  <span>Nombre para comanda</span>
                  <input
                    value={comandaNombre}
                    onChange={(e) =>
                      setComandaNombre(e.target.value.toUpperCase())
                    }
                    placeholder="Ejemplo: Mesa 4, Carlos, para llevar"
                  />
                </label>
              </div>
            )}

            <div className="cobro-descuento-compacto">
              <label className="cobro-field">
                <span>Tipo descuento</span>
                <select
                  value={descuentoTipo}
                  onChange={(e) => setDescuentoTipo(e.target.value)}
                >
                  <option value="monto">Monto directo</option>
                  <option value="porcentaje">Porcentaje</option>
                </select>
              </label>

              <label className="cobro-field">
                <span>
                  {descuentoTipo === "porcentaje"
                    ? "Porcentaje"
                    : "Monto"}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={descuentoValor}
                  onChange={actualizarMonto(setDescuentoValor, "El descuento")}
                  placeholder={descuentoTipo === "porcentaje" ? "0%" : "Q0.00"}
                />
              </label>
            </div>
          </section>

          <section className="cobro-seccion">
            <h3>Pago</h3>

            <div className="cobro-resumen">
              <div>
                <span>Subtotal</span>
                <b>Q{Number(total).toFixed(2)}</b>
              </div>
              <div>
                <span>Descuento</span>
                <b>Q{descuentoMonto.toFixed(2)}</b>
              </div>
              <div>
                <span>Total</span>
                <b>Q{totalFinal.toFixed(2)}</b>
              </div>
            </div>

            <div className="cobro-metodos">
              {["Factura", "Recibo", "Credito"].map((tipo) => (
                <button
                  key={tipo}
                  className={tipoComprobante === tipo ? "activo" : ""}
                  onClick={() => cambiarTipoComprobante(tipo)}
                >
                  {tipo === "Credito" ? "Credito cliente" : tipo}
                </button>
              ))}
            </div>

            {tipoComprobante === "Credito" ? (
              <div className="cobro-credito-info">
                <strong>No genera factura ni recibo</strong>
                <span>
                  Este consumo quedara pendiente en la cuenta del cliente.
                </span>
              </div>
            ) : (
              <>
                {clienteSeleccionado &&
                  Number(clienteSeleccionado.saldo_favor || 0) > 0 && (
                    <label className="cobro-field cobro-saldo-favor">
                      <span>
                        Saldo a favor disponible Q
                        {Number(clienteSeleccionado.saldo_favor || 0).toFixed(2)}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={saldoFavorUsado}
                        onChange={actualizarMonto(
                          setSaldoFavorUsado,
                          "El saldo a favor usado"
                        )}
                        placeholder="Q0.00"
                      />
                    </label>
                  )}

                <label className="cobro-field">
                  <span>Efectivo recibido</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={efectivo}
                    onChange={actualizarMonto(setEfectivo, "El efectivo recibido")}
                    autoFocus
                  />
                </label>

                <div className="cobro-tarjeta-linea">
                  <label className="cobro-field">
                    <span>Pago con tarjeta</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tarjetaMonto}
                      onChange={actualizarMonto(setTarjetaMonto, "El pago con tarjeta")}
                    />
                  </label>

                  <label className="cobro-field">
                    <span>Codigo autorizacion</span>
                    <input
                      value={tarjetaAutorizacion}
                      onChange={(e) => setTarjetaAutorizacion(e.target.value)}
                      placeholder="Ejemplo: 123456"
                      disabled={Number(tarjetaMonto || 0) <= 0}
                    />
                  </label>
                </div>

                <div className="cobro-tarjeta-linea">
                  <label className="cobro-field">
                    <span>Transferencia</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={transferenciaMonto}
                      onChange={actualizarMonto(
                        setTransferenciaMonto,
                        "La transferencia"
                      )}
                    />
                  </label>

                  <label className="cobro-field">
                    <span>Codigo transferencia</span>
                    <input
                      value={transferenciaCodigo}
                      onChange={(e) => setTransferenciaCodigo(e.target.value)}
                      placeholder="No. operacion"
                      disabled={Number(transferenciaMonto || 0) <= 0}
                    />
                  </label>
                </div>

                <div className="cobro-cambio">
                  <span>
                    {cambio >= 0 ? "Cambio" : "Faltante"}
                  </span>
                  <strong className={cambio >= 0 ? "" : "negativo"}>
                    Q{Math.abs(cambio).toFixed(2)}
                  </strong>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="cobro-actions">
          <button
            className="cobro-btn-secondary"
            onClick={onCancelar}
            disabled={procesando}
          >
            Cancelar
          </button>

          <button
            className="cobro-btn-primary"
            onClick={confirmarPago}
            disabled={procesando}
          >
            {procesando ? "Procesando venta..." : "Confirmar pago"}
          </button>
        </div>

        {alertaPago && (
          <div
            className="cobro-alerta-overlay"
            onClick={() => setAlertaPago(null)}
          >
            <div
              className="cobro-alerta"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cobro-alerta-icono">!</div>
              <h3>{alertaPago.titulo}</h3>
              <p>{alertaPago.mensaje}</p>
              <button onClick={() => setAlertaPago(null)}>
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
