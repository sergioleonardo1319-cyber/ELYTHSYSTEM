import { useEffect, useState } from "react";
import "./App.css";

import Caja from "./components/Caja";
import ModalVaciarCarrito from "./components/ModalVaciarCarrito";
import ListaCategorias from "./components/ListaCategorias";
import Cocina from "./Cocina";
import Productos from "./pages/Productos";
import Categorias from "./pages/Categorias";
import Departamentos from "./pages/Departamentos";
import Inventario from "./pages/Inventario";
import Compras from "./pages/Compras";
import Clientes from "./pages/Clientes";
import Contabilidad from "./pages/Contabilidad";
import VentasDiarias from "./pages/VentasDiarias";
import ListaProductos from "./components/ListaProductos";
import POSLayout from "./components/POSLayout";
import "./components/POSLayout.css";
import POSStatusBar from "./components/POSStatusBar";
import NavbarPOS from "./components/NavbarPOS";
import useCarrito from "./hooks/useCarrito";
import ModalCobro from "./components/ModalCobro";
import ModalImprimirComprobante from "./components/ModalImprimirComprobante";
import ModalComplementos from "./components/ModalComplementos";
import ModalAviso from "./components/ModalAviso";
import POSAcciones from "./components/POSAcciones";
import Login from "./Login";
import Admin from "./Admin";
import {
  API,
  APP_VERSION,
  clearSelectedEnvironment,
  getSelectedEnvironment,
} from "./config";
import {
  aplicarClaseDispositivoPOS,
  detectarDispositivoPOS,
} from "./utils/dispositivoPOS";
import { enviarHtmlImpresoraPOS } from "./utils/impresionPOS";
import { usePOSModalLayer } from "./utils/posModalLayer";
import "./components/POSModalLayer.css";

export default function App() {

  // =========================
  // AUTH
  // =========================

  const [user, setUser] = useState(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    const savedUser = sessionStorage.getItem("user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  const logout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("supportOriginalUser");
    sessionStorage.removeItem("supportOriginalToken");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    clearSelectedEnvironment();

    setUser(null);
  };

  const entrarComoSoporte = ({ token, user: soporteUser }) => {
    const tokenActual = sessionStorage.getItem("token");
    const userActual = sessionStorage.getItem("user");

    if (tokenActual && userActual && user?.rol === "superadmin") {
      sessionStorage.setItem("supportOriginalToken", tokenActual);
      sessionStorage.setItem("supportOriginalUser", userActual);
    }

    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(soporteUser));
    setUser(soporteUser);
    setVista("pos");
  };

  const salirModoSoporte = () => {
    const tokenOriginal = sessionStorage.getItem("supportOriginalToken");
    const userOriginal = sessionStorage.getItem("supportOriginalUser");

    if (!tokenOriginal || !userOriginal) {
      logout();
      return;
    }

    sessionStorage.setItem("token", tokenOriginal);
    sessionStorage.setItem("user", userOriginal);
    sessionStorage.removeItem("supportOriginalToken");
    sessionStorage.removeItem("supportOriginalUser");
    setUser(JSON.parse(userOriginal));
    setVista("admin");
  };

  // =========================
  // POS STATE
  // =========================

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [reporte, setReporte] = useState(null);
  const [featuresEmpresa, setFeaturesEmpresa] = useState({});
  const [dispositivoPOS] = useState(() => detectarDispositivoPOS());

  const [mostrarModalVaciar, setMostrarModalVaciar] =
    useState(false);

  const [mostrarModalCobro, setMostrarModalCobro] =
    useState(false);
  const [comprobantePendiente, setComprobantePendiente] =
    useState(null);
  const [aviso, setAviso] = useState(null);
  const [productoComplementos, setProductoComplementos] =
    useState(null);
  const [gruposComplementos, setGruposComplementos] =
    useState([]);

  const [vista, setVista] = useState("pos");
  const [compraSugerida, setCompraSugerida] = useState(null);
  const [cajaActual, setCajaActual] = useState(null);

  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState("");
  const [busquedaPOS, setBusquedaPOS] = useState("");

  usePOSModalLayer(
    mostrarModalVaciar ||
      mostrarModalCobro ||
      Boolean(comprobantePendiente) ||
      Boolean(aviso) ||
      Boolean(productoComplementos)
  );

  useEffect(() => {
    aplicarClaseDispositivoPOS(dispositivoPOS);
    sessionStorage.setItem(
      "pos_dispositivo",
      JSON.stringify({
        nombre: dispositivoPOS.nombre,
        esAndroid: dispositivoPOS.esAndroid,
        esCapacitor: dispositivoPOS.esCapacitor,
        esSunmi: dispositivoPOS.esSunmi,
        esSunmiD3: dispositivoPOS.esSunmiD3,
        esPOSAndroid: dispositivoPOS.esPOSAndroid,
        soportaImpresionNativa: dispositivoPOS.soportaImpresionNativa,
      })
    );
  }, [dispositivoPOS]);

  useEffect(() => {
    const actualizarViewportPOS = () => {
      const altoVisual = window.visualViewport?.height;
      const altoVentana = window.innerHeight;
      const alto = Math.round(altoVisual || altoVentana || 0);

      if (alto > 0) {
        document.documentElement.style.setProperty(
          "--pos-viewport-height",
          `${alto}px`
        );
      }
    };

    actualizarViewportPOS();

    window.addEventListener("resize", actualizarViewportPOS);
    window.addEventListener("orientationchange", actualizarViewportPOS);
    window.visualViewport?.addEventListener("resize", actualizarViewportPOS);

    return () => {
      window.removeEventListener("resize", actualizarViewportPOS);
      window.removeEventListener("orientationchange", actualizarViewportPOS);
      window.visualViewport?.removeEventListener(
        "resize",
        actualizarViewportPOS
      );
      document.documentElement.style.removeProperty("--pos-viewport-height");
    };
  }, []);

  // =========================
  // CARRITO
  // =========================

  const {
    carrito,
    agregarAlCarrito,
    agregarCreditoAlCarrito,
    eliminarItem,
    actualizarCantidadDirecta,
    vaciarCarrito,
    total,
  } = useCarrito(setAviso);

  // =========================
  // LOAD DATA
  // =========================

  const cargarProductos = async () => {
    try {

      const token = sessionStorage.getItem("token");

      const res = await fetch(
        `${API}/productos?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (res.status === 401) {
        logout();
        return;
      }

      setProductos(Array.isArray(data) ? data : []);

    } catch (error) {

      console.error(error);
      setProductos([]);

    }
  };

  const cargarCategorias = async () => {
    try {

      const token = sessionStorage.getItem("token");

      const res = await fetch(
        `${API}/categorias?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (res.status === 401) {
        logout();
        return;
      }

      setCategorias(Array.isArray(data) ? data : []);

      if (
        Array.isArray(data) &&
        data.length > 0 &&
        !categoriaSeleccionada
      ) {
        setCategoriaSeleccionada(data[0].nombre);
      }

    } catch (error) {

      console.error(error);
      setCategorias([]);

    }
  };

  const cargarDepartamentos = async () => {
    try {

      const token = sessionStorage.getItem("token");

      const res = await fetch(
        `${API}/departamentos?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (res.status === 401) {
        logout();
        return;
      }

      setDepartamentos(Array.isArray(data) ? data : []);

    } catch (error) {

      console.error(error);
      setDepartamentos([]);

    }
  };

  const cargarReporte = async () => {
    try {

      const token = sessionStorage.getItem("token");

      const res = await fetch(
        `${API}/reporte/hoy?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (res.status === 401) {
        logout();
        return;
      }

      setReporte(data);

    } catch (error) {

      console.error(error);
      setReporte(null);

    }
  };

  const cargarFeatures = async () => {
    try {
      const token = sessionStorage.getItem("token");

      const res = await fetch(`${API}/features`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.status === 401) {
        logout();
        return;
      }

      setFeaturesEmpresa(data && typeof data === "object" ? data : {});
    } catch (error) {
      console.error(error);
      setFeaturesEmpresa({});
    }
  };

  const cargarCajaActual = async () => {
    if (!user?.empresa_id || user?.rol === "superadmin") {
      setCajaActual(null);
      return null;
    }

    try {
      const token = sessionStorage.getItem("token");

      const res = await fetch(
        `${API}/caja/turno-actual?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await leerRespuesta(res);

      if (res.status === 401) {
        logout();
        return null;
      }

      if (!res.ok) {
        setCajaActual(null);
        return null;
      }

      const caja = data.abierta ? data : null;
      setCajaActual(caja);
      return caja;
    } catch (error) {
      console.error(error);
      setCajaActual(null);
      return null;
    }
  };

  // =========================
  // INIT
  // =========================

  useEffect(() => {

    if (!user) return;

    if (user.rol === "superadmin") {
      setVista("admin");
      setProductos([]);
      setCategorias([]);
      setDepartamentos([]);
      setReporte(null);
      setCajaActual(null);
      setFeaturesEmpresa({});
      return;
    } else if (user.rol === "compras") {
      setVista("compras");
    } else if (user.rol === "inventario") {
      setVista("inventario");
    } else if (user.rol === "cocina") {
      setVista("cocina");
    } else {
      setVista("pos");
    }

    cargarProductos();
    cargarCategorias();
    cargarDepartamentos();
    cargarReporte();
    cargarCajaActual();
    cargarFeatures();

  }, [user]);

  // =========================
  // LOGIN GUARD
  // =========================

  if (!user) {
    return <Login setUser={setUser} />;
  }

  // =========================
  // GUARDAR VENTA
  // =========================

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

  const guardarVenta = async (datosPago, carritoVenta = carrito) => {
    const productosVenta = carritoVenta.filter(
      (item) => item.tipo_linea !== "credito_pendiente"
    );
    const creditosPendientes = carritoVenta.filter(
      (item) => item.tipo_linea === "credito_pendiente"
    );

    const res = await fetch(`${API}/ventas`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },

      body: JSON.stringify({
        productos: productosVenta.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          departamento: i.departamento || "",
          complementos: i.complementos || [],
          observacion: i.observacion || "",
        })),
        creditos_pendientes: creditosPendientes.map((i) => ({
          venta_credito_id: i.venta_credito_id,
        })),

        pago: datosPago,
        empresa_id: user.empresa_id,
      }),
    });

    const data = await leerRespuesta(res);

    if (res.status === 401) {
      logout();
      return null;
    }

    if (!res.ok) {
      setAviso({
        tipo: "error",
        titulo: "Venta no registrada",
        mensaje: data.error || "No fue posible registrar la venta.",
      });
      return null;
    }

    vaciarCarrito();

    cargarProductos();

    cargarReporte();

    cargarCajaActual();

    return data;
  };

  // =========================
  // COBRO
  // =========================

  const abrirModalCobro = async () => {

    if (carrito.length === 0) {
      setAviso({
        tipo: "info",
        titulo: "Carrito vacio",
        mensaje: "Agrega productos antes de finalizar la venta.",
      });
      return;
    }

    const caja = await cargarCajaActual();

    if (!caja?.abierta) {
      setAviso({
        tipo: "info",
        titulo: "Caja sin apertura",
        mensaje: "Debe aperturar caja antes de realizar ventas.",
      });
      return;
    }

    setMostrarModalCobro(true);
  };

  const tieneProductosPreparacion = carrito.some((item) => {
    if (item.tipo_linea === "credito_pendiente") return false;

    const departamento = String(item.departamento || "").trim().toUpperCase();
    return departamento && departamento !== "NO APLICA";
  });

  const obtenerDetalleComanda = (carritoVenta) =>
    carritoVenta.filter((item) => {
      if (item.tipo_linea === "credito_pendiente") return false;

      const departamento = String(item.departamento || "").trim().toUpperCase();
      return departamento && departamento !== "NO APLICA";
    });

  const usarImpresionInternaPOS = Boolean(
    dispositivoPOS?.esCapacitor ||
    dispositivoPOS?.esPOSAndroid ||
    dispositivoPOS?.esSunmi
  );

  const imprimirHtmlInternoPOS = (html) => {
    if (usarImpresionInternaPOS) {
      enviarHtmlImpresoraPOS(html);
      return true;
    }

    const iframe = document.createElement("iframe");
    iframe.title = "Impresion POS";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const documento = iframe.contentWindow?.document;

    if (!documento) {
      iframe.remove();
      return false;
    }

    documento.open();
    documento.write(html);
    documento.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (error) {
        console.error("Error imprimiendo en WebView POS:", error);
      }

      setTimeout(() => iframe.remove(), 1800);
    }, 350);

    return true;
  };

  const anchoTicketTermico = 42;

  const textoPlanoImpresion = (valor) =>
    String(valor ?? "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const cortarTextoTicket = (valor, largo = anchoTicketTermico) =>
    textoPlanoImpresion(valor).slice(0, largo);

  const lineaTicket = (caracter = "-") =>
    caracter.repeat(anchoTicketTermico);

  const centrarTicket = (valor) => {
    const texto = cortarTextoTicket(valor);
    const espacio = Math.max(0, Math.floor((anchoTicketTermico - texto.length) / 2));
    return `${" ".repeat(espacio)}${texto}`;
  };

  const filaTicket = (label, valor) => {
    const izquierda = cortarTextoTicket(label, 26);
    const derecha = cortarTextoTicket(valor, 14);
    const espacios = Math.max(1, anchoTicketTermico - izquierda.length - derecha.length);
    return `${izquierda}${" ".repeat(espacios)}${derecha}`;
  };

  const monedaTicket = (valor) => `Q${Number(valor || 0).toFixed(2)}`;

  const detalleComplementosTicket = (item) => {
    if (!Array.isArray(item.complementos) || item.complementos.length === 0) {
      return [];
    }

    return item.complementos.flatMap((grupo) => {
      const opciones = (grupo.opciones || [])
        .map((opcion) => opcion.nombre)
        .filter(Boolean)
        .join(", ");

      return opciones
        ? [`  ${cortarTextoTicket(`${grupo.nombre}: ${opciones}`, 38)}`]
        : [];
    });
  };

  const crearTextoTicketTermico = (datosPago, carritoVenta, venta = null) => {
    const tipoComprobante = datosPago.tipo_comprobante || "Factura";
    const esFactura = tipoComprobante === "Factura";
    const nombreEmpresa = user?.empresa_nombre || user?.empresa || "Mi Empresa";
    const razonSocial = user?.empresa_razon_social || nombreEmpresa;
    const nitEmpresa = user?.empresa_nit || "Pendiente";
    const direccionEmpresa = user?.empresa_direccion || "Pendiente";
    const fecha = venta?.fecha
      ? new Date(venta.fecha).toLocaleString()
      : new Date().toLocaleString();
    const subtotalDocumento = carritoVenta.reduce(
      (sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 0),
      0
    );
    const descuentoDocumento = Number(datosPago.descuento_monto || 0);
    const totalDocumento = Number(
      datosPago.total_final || venta?.total || subtotalDocumento
    );
    const ivaIncluido = esFactura ? totalDocumento - totalDocumento / 1.12 : 0;
    const lineas = [
      centrarTicket(nombreEmpresa.toUpperCase()),
      centrarTicket(razonSocial),
      centrarTicket(`NIT: ${nitEmpresa}`),
      centrarTicket(direccionEmpresa),
      lineaTicket("="),
      centrarTicket(esFactura ? "FACTURA ELECTRONICA" : "RECIBO INTERNO"),
      filaTicket("Venta", venta?.id || "Pendiente"),
      filaTicket("Fecha", fecha),
      lineaTicket("-"),
      "RECEPTOR",
      cortarTextoTicket(datosPago.cliente_nit || "CF"),
      cortarTextoTicket(datosPago.cliente_nombre || "CONSUMIDOR FINAL"),
      cortarTextoTicket(datosPago.cliente_direccion || "CIUDAD"),
      lineaTicket("-"),
    ];

    carritoVenta.forEach((item) => {
      const cantidad = Number(item.cantidad || 0);
      const precio = Number(item.precio || 0);
      lineas.push(cortarTextoTicket(`${cantidad} x ${item.nombre}`, anchoTicketTermico));
      detalleComplementosTicket(item).forEach((linea) => lineas.push(linea));

      if (item.observacion) {
        lineas.push(`  ${cortarTextoTicket(`Nota: ${item.observacion}`, 38)}`);
      }

      lineas.push(filaTicket(`  ${monedaTicket(precio)} c/u`, monedaTicket(precio * cantidad)));
    });

    lineas.push(
      lineaTicket("-"),
      filaTicket("Subtotal", monedaTicket(subtotalDocumento)),
      filaTicket("Descuento", monedaTicket(descuentoDocumento))
    );

    if (esFactura) {
      lineas.push(filaTicket("IVA incluido", monedaTicket(ivaIncluido)));
    }

    lineas.push(
      lineaTicket("="),
      filaTicket("TOTAL", monedaTicket(totalDocumento)),
      lineaTicket("="),
      esFactura
        ? "Documento preliminar sujeto a FEL."
        : "Recibo interno. No sustituye factura FEL.",
      centrarTicket("Gracias por su compra")
    );

    return lineas.join("\n");
  };

  const crearTextoComandaTermica = (venta) => {
    const detalle = venta.detalle || [];
    const fecha = venta.fecha
      ? new Date(venta.fecha).toLocaleString()
      : new Date().toLocaleString();
    const lineas = [
      centrarTicket("COMANDA"),
      filaTicket("Venta", venta.id || ""),
      filaTicket("Fecha", fecha),
      cortarTextoTicket(venta.cliente_nombre || "Consumidor Final"),
      lineaTicket("="),
    ];

    detalle.forEach((item) => {
      lineas.push(cortarTextoTicket(`${Number(item.cantidad || 0)}x ${item.nombre}`));
      detalleComplementosTicket(item).forEach((linea) => lineas.push(linea));

      if (item.observacion) {
        lineas.push(`  ${cortarTextoTicket(`Nota: ${item.observacion}`, 38)}`);
      }
    });

    lineas.push(lineaTicket("="), centrarTicket("PREPARACION"));

    return lineas.join("\n");
  };

  const crearBloqueTextoSunmi = (texto) =>
    `<script type="text/plain" id="elyth-sunmi-text">${String(texto)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")}</script>`;

  const crearDestinoImpresion = (ventanaDestino = null) => {
    if (ventanaDestino) return ventanaDestino;

    if (usarImpresionInternaPOS) {
      let html = "";

      return {
        document: {
          write: (contenido) => {
            html += contenido;
          },
          close: () => {
            const impreso = imprimirHtmlInternoPOS(html);

            if (!impreso) {
              setAviso({
                tipo: "error",
                titulo: "Impresion no disponible",
                mensaje:
                  "No fue posible enviar el documento a impresion desde el dispositivo POS.",
              });
            }
          },
        },
        close: () => {},
      };
    }

    return window.open("", "_blank");
  };

  // =========================
  // TICKET
  // =========================

  const imprimirTicket = (
    datosPago,
    carritoVenta = carrito,
    venta = null,
    ventanaDestino = null
  ) => {

    const ventana = crearDestinoImpresion(ventanaDestino);

    if (!ventana) {
      setAviso({
        tipo: "error",
        titulo: "Impresion bloqueada",
        mensaje:
          "El navegador bloqueo la ventana de impresion. Permite ventanas emergentes para este sistema.",
      });
      return;
    }

    const escapeHtml = (valor) =>
      String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const fecha = venta?.fecha
      ? new Date(venta.fecha).toLocaleString()
      : new Date().toLocaleString();

    const tipoComprobante = datosPago.tipo_comprobante || "Factura";
    const esFactura = tipoComprobante === "Factura";
    const nombreEmpresa =
      user?.empresa_nombre ||
      user?.empresa ||
      "Mi Empresa";
    const nitEmpresa = user?.empresa_nit || "Pendiente";
    const razonSocial = user?.empresa_razon_social || nombreEmpresa;
    const direccionEmpresa = user?.empresa_direccion || "Pendiente";
    const codigoEstablecimiento =
      user?.empresa_codigo_establecimiento || "Pendiente";
    const subtotalDocumento = carritoVenta.reduce(
      (sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 0),
      0
    );
    const descuentoDocumento = Number(datosPago.descuento_monto || 0);
    const totalDocumento = Number(
      datosPago.total_final || venta?.total || subtotalDocumento
    );
    const ivaIncluido = esFactura
      ? totalDocumento - totalDocumento / 1.12
      : 0;
    const estadoFel = venta?.fel_estado || "pendiente";
    const saldoFavorUsado = Number(datosPago.saldo_favor_usado || 0);
    const efectivoRecibido = Number(datosPago.efectivo_recibido || 0);
    const tarjetaMonto = Number(datosPago.tarjeta_monto || 0);
    const transferenciaMonto = Number(datosPago.transferencia_monto || 0);

    const mediosPago = [
      saldoFavorUsado > 0
        ? {
            nombre: "Saldo a favor",
            monto: saldoFavorUsado,
            detalle: "Aplicacion de saldo previamente registrado",
          }
        : null,
      efectivoRecibido > 0
        ? {
            nombre: "Efectivo",
            monto: efectivoRecibido,
          }
        : null,
      tarjetaMonto > 0
        ? {
            nombre: "Tarjeta",
            monto: tarjetaMonto,
            detalle: datosPago.tarjeta_autorizacion
              ? `Autorizacion ${datosPago.tarjeta_autorizacion}`
              : "",
          }
        : null,
      transferenciaMonto > 0
        ? {
            nombre: "Transferencia",
            monto: transferenciaMonto,
            detalle: datosPago.transferencia_codigo
              ? `Operacion ${datosPago.transferencia_codigo}`
              : "",
          }
        : null,
    ].filter(Boolean);
    const textoSunmi = crearTextoTicketTermico(datosPago, carritoVenta, venta);

    ventana.document.write(`
      <html>
        <head>
          <title>${escapeHtml(tipoComprobante)} ${venta?.id || ""}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              color: #111827;
              font-family: Arial, sans-serif;
              font-size: 12px;
              margin: 0;
              padding: 18px;
            }
            .doc {
              margin: 0 auto;
              max-width: 80mm;
            }
            .head {
              border-bottom: 2px solid #111827;
              padding-bottom: 12px;
              text-align: center;
            }
            h1, h2, h3, p { margin: 0 0 3px; }
            h1 { font-size: 15px; text-transform: uppercase; }
            h2 { font-size: 13px; margin-top: 6px; }
            .muted { color: #6b7280; }
            .right { text-align: right; }
            .box {
              border-top: 1px dashed #9ca3af;
              border-radius: 0;
              margin-top: 12px;
              padding: 8px 0 0;
            }
            .grid {
              display: block;
            }
            .label {
              color: #374151;
              display: block;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
            }
            table {
              border-collapse: collapse;
              margin-top: 8px;
              width: 100%;
            }
            th {
              border-bottom: 1px solid #111827;
              background: transparent;
              color: #111827;
              font-size: 11px;
              padding: 5px 2px;
              text-align: left;
            }
            td {
              border-bottom: 1px solid #e5e7eb;
              padding: 5px 2px;
              vertical-align: top;
            }
            .num { text-align: right; white-space: nowrap; }
            .totales {
              display: grid;
              gap: 6px;
              margin-left: auto;
              margin-top: 8px;
              max-width: none;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
            }
            .gran-total {
              border-top: 2px solid #111827;
              font-size: 16px;
              font-weight: 800;
              padding-top: 8px;
            }
            .aviso {
              background: #fff7ed;
              border: 1px solid #fdba74;
              border-radius: 8px;
              color: #7c2d12;
              font-weight: 700;
              margin-top: 12px;
              padding: 10px;
            }
            .firma {
              border-top: 1px dashed #9ca3af;
              margin-top: 18px;
              padding-top: 10px;
              text-align: center;
            }
            @media print {
              @page { size: 80mm auto; margin: 4mm; }
              body { padding: 0; }
              .doc { max-width: none; }
            }
          </style>
        </head>
        <body>
          ${crearBloqueTextoSunmi(textoSunmi)}
          <main class="doc">
            <section class="head">
              <div>
                <h1>${escapeHtml(nombreEmpresa)}</h1>
                <p>${escapeHtml(razonSocial)}</p>
                <p><strong>NIT:</strong> ${escapeHtml(nitEmpresa)}</p>
                <p>${escapeHtml(direccionEmpresa)}</p>
                <p><strong>Establecimiento:</strong> ${escapeHtml(codigoEstablecimiento)}</p>
              </div>
              <div>
                <h2>
                  ${
                    esFactura
                      ? "FACTURA ELECTRONICA"
                      : "RECIBO INTERNO"
                  }
                </h2>
                <p><strong>${esFactura ? "Tipo DTE" : "Documento"}:</strong> ${
                  esFactura ? "FACT" : "RECIBO"
                }</p>
                <p><strong>Venta:</strong> ${venta?.id || "Pendiente"}</p>
                <p><strong>Fecha emision:</strong> ${escapeHtml(fecha)}</p>
              </div>
            </section>

            ${
              esFactura
                ? `
                  <section class="box">
                    <div class="grid">
                      <div>
                        <span class="label">Estado FEL</span>
                        ${estadoFel === "certificada" ? "Certificada" : "Pendiente de certificacion FEL"}
                      </div>
                      <div>
                        <span class="label">Numero autorizacion</span>
                        ${escapeHtml(venta?.fel_numero_autorizacion || "Pendiente")}
                      </div>
                      <div>
                        <span class="label">Serie</span>
                        ${escapeHtml(venta?.fel_serie || "Pendiente")}
                      </div>
                      <div>
                        <span class="label">Numero DTE</span>
                        ${escapeHtml(venta?.fel_numero || "Pendiente")}
                      </div>
                      <div>
                        <span class="label">Fecha certificacion</span>
                        ${escapeHtml(venta?.fel_fecha_certificacion || "Pendiente")}
                      </div>
                      <div>
                        <span class="label">NIT certificador</span>
                        ${escapeHtml(venta?.fel_nit_certificador || "Pendiente")}
                      </div>
                    </div>
                  </section>
                  ${
                    estadoFel !== "certificada"
                      ? `<div class="aviso">Documento preliminar. Para validez fiscal debe certificarse como DTE en el regimen FEL de SAT Guatemala.</div>`
                      : ""
                  }
                `
                : `<div class="aviso">Recibo interno del sistema. No sustituye factura electronica FEL ni otorga credito fiscal.</div>`
            }

            <section class="box grid">
              <div>
                <span class="label">NIT receptor</span>
                ${escapeHtml(datosPago.cliente_nit || "CF")}
              </div>
              <div>
                <span class="label">Nombre receptor</span>
                ${escapeHtml(datosPago.cliente_nombre || "Consumidor Final")}
              </div>
              <div>
                <span class="label">Direccion receptor</span>
                ${escapeHtml(datosPago.cliente_direccion || "Ciudad")}
              </div>
              <div>
                <span class="label">Moneda</span>
                GTQ
              </div>
            </section>

            <table>
              <thead>
                <tr>
                  <th>Cant.</th>
                  <th>Descripcion</th>
                  <th class="num">P. unitario</th>
                  <th class="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${carritoVenta
                  .map((item) => {
                    const cantidad = Number(item.cantidad || 0);
                    const precio = Number(item.precio || 0);
                    return `
                      <tr>
                        <td>${cantidad}</td>
                        <td>
                          ${escapeHtml(item.nombre)}
                          ${
                            Array.isArray(item.complementos) &&
                            item.complementos.length > 0
                              ? `<br><small>${item.complementos
                                  .map(
                                    (grupo) =>
                                      `${escapeHtml(grupo.nombre)}: ${escapeHtml(
                                        (grupo.opciones || [])
                                          .map((opcion) => opcion.nombre)
                                          .join(", ")
                                      )}`
                                  )
                                  .join("<br>")}</small>`
                              : ""
                          }
                          ${
                            item.observacion
                              ? `<br><small><strong>Nota:</strong> ${escapeHtml(item.observacion)}</small>`
                              : ""
                          }
                        </td>
                        <td class="num">Q${precio.toFixed(2)}</td>
                        <td class="num">Q${(precio * cantidad).toFixed(2)}</td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>

            <section class="totales">
              <div class="total-row">
                <span>Subtotal</span>
                <strong>Q${subtotalDocumento.toFixed(2)}</strong>
              </div>
              <div class="total-row">
                <span>Descuento</span>
                <strong>Q${descuentoDocumento.toFixed(2)}</strong>
              </div>
              ${
                esFactura
                  ? `
                    <div class="total-row">
                      <span>IVA incluido estimado</span>
                      <strong>Q${ivaIncluido.toFixed(2)}</strong>
                    </div>
                  `
                  : ""
              }
              <div class="total-row gran-total">
                <span>Gran total</span>
                <strong>Q${totalDocumento.toFixed(2)}</strong>
              </div>
            </section>

            <section class="box">
              <h3>Medios de pago</h3>
              ${
                mediosPago.length
                  ? mediosPago
                      .map(
                        (medio) => `
                          <p>
                            <strong>${escapeHtml(medio.nombre)}:</strong>
                            Q${Number(medio.monto || 0).toFixed(2)}
                            ${medio.detalle ? ` - ${escapeHtml(medio.detalle)}` : ""}
                          </p>
                        `
                      )
                      .join("")
                  : `<p>${escapeHtml(datosPago.metodo_pago || "Efectivo")}</p>`
              }
              ${
                saldoFavorUsado > 0 && esFactura
                  ? `<p class="muted">Nota interna: se aplico saldo a favor registrado del cliente como parte del pago.</p>`
                  : ""
              }
            </section>

            ${
              esFactura
                ? `<section class="firma">Sujeto a certificacion FEL por certificador autorizado SAT.</section>`
                : `<section class="firma">Recibo generado por el sistema.</section>`
            }
          </main>

          <script>
            window.onafterprint = () => window.close();
            window.setTimeout(() => window.print(), 250);
          </script>

        </body>
      </html>
    `);

    ventana.document.close();
  };

  const imprimirComanda = (venta, ventanaDestino = null) => {
    const ventana = crearDestinoImpresion(ventanaDestino);

    if (!ventana) {
      setAviso({
        tipo: "error",
        titulo: "Impresion bloqueada",
        mensaje:
          "El navegador bloqueo la ventana de comanda. Permite ventanas emergentes para este sistema.",
      });
      return;
    }

    const detalle = venta.detalle || [];
    const fecha = venta.fecha
      ? new Date(venta.fecha).toLocaleString()
      : new Date().toLocaleString();

    const escapeHtml = (valor) =>
      String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    const textoSunmi = crearTextoComandaTermica({
      ...venta,
      detalle,
    });

    ventana.document.write(`
      <html>
        <head>
          <title>Comanda ${venta.id}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; margin: 0; padding: 10px; }
            .doc { max-width: 80mm; margin: 0 auto; }
            h1, p { margin: 0 0 6px; text-align: center; }
            .linea { border-top: 1px dashed #111; margin: 10px 0; }
            .item { display: flex; gap: 8px; justify-content: space-between; margin: 8px 0; }
            .cant { font-size: 18px; font-weight: 900; }
            .nombre { flex: 1; font-size: 16px; font-weight: 800; }
            @media print { @page { size: 80mm auto; margin: 4mm; } body { padding: 0; } }
          </style>
        </head>
        <body>
          ${crearBloqueTextoSunmi(textoSunmi)}
          <main class="doc">
            <h1>COMANDA</h1>
            <p>Venta #${venta.id}</p>
            <p>${escapeHtml(fecha)}</p>
            <p>${escapeHtml(venta.cliente_nombre || "Consumidor Final")}</p>
            <div class="linea"></div>
            ${detalle.map((item) => `
              <div class="item">
                <span class="cant">${Number(item.cantidad || 0)}x</span>
                <span class="nombre">
                  ${escapeHtml(item.nombre)}
                  ${
                    Array.isArray(item.complementos) &&
                    item.complementos.length > 0
                      ? `<br><small>${item.complementos
                          .map(
                            (grupo) =>
                              `${escapeHtml(grupo.nombre)}: ${escapeHtml(
                                (grupo.opciones || [])
                                  .map((opcion) => opcion.nombre)
                                  .join(", ")
                              )}`
                          )
                          .join("<br>")}</small>`
                      : ""
                  }
                  ${
                    item.observacion
                      ? `<br><small><strong>Nota:</strong> ${escapeHtml(item.observacion)}</small>`
                      : ""
                  }
                </span>
              </div>
            `).join("")}
            <div class="linea"></div>
            <p>Preparacion</p>
          </main>
          <script>
            window.onafterprint = () => window.close();
            window.setTimeout(() => window.print(), 250);
          </script>
        </body>
      </html>
    `);

    ventana.document.close();
  };

  const imprimirComandaVenta = (
    datosPago,
    carritoVenta,
    venta,
    ventanaDestino = null
  ) => {
    const detalleComanda = obtenerDetalleComanda(carritoVenta);

    if (detalleComanda.length === 0) return;

    imprimirComanda(
      {
        ...venta,
        detalle: detalleComanda,
        cliente_nombre:
          datosPago.comanda_nombre ||
          datosPago.cliente_nombre ||
          "Consumidor Final",
      },
      ventanaDestino
    );
  };

  const imprimirTicketYComanda = (
    datosPago,
    carritoVenta,
    venta,
    ventanaDestino = null
  ) => {
    const ventana = crearDestinoImpresion(ventanaDestino);

    if (!ventana) {
      setAviso({
        tipo: "error",
        titulo: "Impresion bloqueada",
        mensaje:
          "El navegador bloqueo la ventana de impresion. Permite ventanas emergentes para este sistema.",
      });
      return;
    }

    const escapeHtml = (valor) =>
      String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const fecha = venta?.fecha
      ? new Date(venta.fecha).toLocaleString()
      : new Date().toLocaleString();
    const tipoComprobante = datosPago.tipo_comprobante || "Factura";
    const esFactura = tipoComprobante === "Factura";
    const nombreEmpresa = user?.empresa_nombre || user?.empresa || "Mi Empresa";
    const nitEmpresa = user?.empresa_nit || "Pendiente";
    const razonSocial = user?.empresa_razon_social || nombreEmpresa;
    const direccionEmpresa = user?.empresa_direccion || "Pendiente";
    const codigoEstablecimiento =
      user?.empresa_codigo_establecimiento || "Pendiente";
    const subtotalDocumento = carritoVenta.reduce(
      (sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 0),
      0
    );
    const descuentoDocumento = Number(datosPago.descuento_monto || 0);
    const totalDocumento = Number(
      datosPago.total_final || venta?.total || subtotalDocumento
    );
    const ivaIncluido = esFactura
      ? totalDocumento - totalDocumento / 1.12
      : 0;
    const detalleComanda = obtenerDetalleComanda(carritoVenta);
    const clienteComanda =
      datosPago.comanda_nombre ||
      datosPago.cliente_nombre ||
      "Consumidor Final";

    const renderComplementos = (item) =>
      Array.isArray(item.complementos) && item.complementos.length > 0
        ? `<br><small>${item.complementos
            .map(
              (grupo) =>
                `${escapeHtml(grupo.nombre)}: ${escapeHtml(
                  (grupo.opciones || [])
                    .map((opcion) => opcion.nombre)
                    .join(", ")
                )}`
            )
            .join("<br>")}</small>`
        : "";
    const textoSunmi = [
      crearTextoTicketTermico(datosPago, carritoVenta, venta),
      crearTextoComandaTermica({
        ...venta,
        detalle: detalleComanda,
        cliente_nombre: clienteComanda,
      }),
    ].join("\n\n");

    ventana.document.write(`
      <html>
        <head>
          <title>Venta ${venta?.id || ""}</title>
          <style>
            * { box-sizing: border-box; }
            body { color: #111827; font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 18px; }
            .doc { margin: 0 auto; max-width: 80mm; }
            .head { border-bottom: 2px solid #111827; padding-bottom: 10px; text-align: center; }
            h1, h2, h3, p { margin: 0 0 4px; }
            h1 { font-size: 15px; text-transform: uppercase; }
            h2 { font-size: 13px; margin-top: 6px; }
            .muted { color: #6b7280; }
            .box { border-top: 1px dashed #9ca3af; margin-top: 10px; padding-top: 8px; }
            .label { color: #374151; display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; }
            table { border-collapse: collapse; margin-top: 8px; width: 100%; }
            th { border-bottom: 1px solid #111827; font-size: 11px; padding: 5px 2px; text-align: left; }
            td { border-bottom: 1px solid #e5e7eb; padding: 5px 2px; vertical-align: top; }
            .num { text-align: right; white-space: nowrap; }
            .total-row { display: flex; justify-content: space-between; margin-top: 5px; }
            .gran-total { border-top: 2px solid #111827; font-size: 16px; font-weight: 900; padding-top: 8px; }
            .aviso { background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; color: #7c2d12; font-weight: 700; margin-top: 10px; padding: 8px; }
            .firma { border-top: 1px dashed #9ca3af; margin-top: 14px; padding-top: 8px; text-align: center; }
            .comanda-doc { break-before: page; page-break-before: always; padding-top: 8px; }
            .linea { border-top: 1px dashed #111; margin: 10px 0; }
            .item { display: flex; gap: 8px; justify-content: space-between; margin: 8px 0; }
            .cant { font-size: 18px; font-weight: 900; }
            .nombre { flex: 1; font-size: 16px; font-weight: 800; }
            .center { text-align: center; }
            @media print { @page { size: 80mm auto; margin: 4mm; } body { padding: 0; } .doc { max-width: none; } }
          </style>
        </head>
        <body>
          ${crearBloqueTextoSunmi(textoSunmi)}
          <main class="doc">
            <section class="head">
              <h1>${escapeHtml(nombreEmpresa)}</h1>
              <p>${escapeHtml(razonSocial)}</p>
              <p><strong>NIT:</strong> ${escapeHtml(nitEmpresa)}</p>
              <p>${escapeHtml(direccionEmpresa)}</p>
              <p><strong>Establecimiento:</strong> ${escapeHtml(codigoEstablecimiento)}</p>
              <h2>${esFactura ? "FACTURA ELECTRONICA" : "RECIBO INTERNO"}</h2>
              <p><strong>Venta:</strong> ${venta?.id || "Pendiente"}</p>
              <p><strong>Fecha:</strong> ${escapeHtml(fecha)}</p>
            </section>

            ${
              esFactura
                ? `<section class="box">
                    <span class="label">Estado FEL</span>
                    ${venta?.fel_estado === "certificada" ? "Certificada" : "Pendiente de certificacion FEL"}
                    <span class="label">Autorizacion</span>
                    ${escapeHtml(venta?.fel_numero_autorizacion || "Pendiente")}
                    <span class="label">Serie / Numero DTE</span>
                    ${escapeHtml(venta?.fel_serie || "Pendiente")} / ${escapeHtml(venta?.fel_numero || "Pendiente")}
                  </section>
                  ${
                    venta?.fel_estado !== "certificada"
                      ? `<div class="aviso">Documento preliminar. Para validez fiscal debe certificarse como DTE FEL.</div>`
                      : ""
                  }`
                : `<div class="aviso">Recibo interno del sistema. No sustituye factura electronica FEL.</div>`
            }

            <section class="box">
              <span class="label">Receptor</span>
              <p>${escapeHtml(datosPago.cliente_nit || "CF")}</p>
              <p>${escapeHtml(datosPago.cliente_nombre || "Consumidor Final")}</p>
              <p>${escapeHtml(datosPago.cliente_direccion || "Ciudad")}</p>
            </section>

            <table>
              <thead>
                <tr>
                  <th>Cant.</th>
                  <th>Descripcion</th>
                  <th class="num">P/U</th>
                  <th class="num">Total</th>
                </tr>
              </thead>
              <tbody>
                ${carritoVenta
                  .map((item) => {
                    const cantidad = Number(item.cantidad || 0);
                    const precio = Number(item.precio || 0);
                    return `
                      <tr>
                        <td>${cantidad}</td>
                        <td>
                          ${escapeHtml(item.nombre)}
                          ${renderComplementos(item)}
                          ${
                            item.observacion
                              ? `<br><small><strong>Nota:</strong> ${escapeHtml(item.observacion)}</small>`
                              : ""
                          }
                        </td>
                        <td class="num">Q${precio.toFixed(2)}</td>
                        <td class="num">Q${(precio * cantidad).toFixed(2)}</td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>

            <section class="box">
              <div class="total-row"><span>Subtotal</span><strong>Q${subtotalDocumento.toFixed(2)}</strong></div>
              <div class="total-row"><span>Descuento</span><strong>Q${descuentoDocumento.toFixed(2)}</strong></div>
              ${
                esFactura
                  ? `<div class="total-row"><span>IVA incluido estimado</span><strong>Q${ivaIncluido.toFixed(2)}</strong></div>`
                  : ""
              }
              <div class="total-row gran-total"><span>Total</span><strong>Q${totalDocumento.toFixed(2)}</strong></div>
            </section>

            <section class="firma">
              ${esFactura ? "Sujeto a certificacion FEL por certificador autorizado SAT." : "Recibo generado por el sistema."}
            </section>
          </main>

          <main class="doc comanda-doc">
            <h1 class="center">COMANDA</h1>
            <p class="center">Venta #${venta?.id || ""}</p>
            <p class="center">${escapeHtml(fecha)}</p>
            <p class="center">${escapeHtml(clienteComanda)}</p>
            <div class="linea"></div>
            ${detalleComanda
              .map(
                (item) => `
                  <div class="item">
                    <span class="cant">${Number(item.cantidad || 0)}x</span>
                    <span class="nombre">
                      ${escapeHtml(item.nombre)}
                      ${renderComplementos(item)}
                      ${
                        item.observacion
                          ? `<br><small><strong>Nota:</strong> ${escapeHtml(item.observacion)}</small>`
                          : ""
                      }
                    </span>
                  </div>
                `
              )
              .join("")}
            <div class="linea"></div>
            <p class="center">Preparacion</p>
          </main>

          <script>
            window.onafterprint = () => window.close();
            window.setTimeout(() => window.print(), 250);
          </script>
        </body>
      </html>
    `);

    ventana.document.close();
  };

  // =========================
  // FILTRO PRODUCTOS
  // =========================

  const textoBusquedaPOS =
    busquedaPOS.trim().toLowerCase();

  const productosDisponiblesPOS = productos.filter(
    (p) => p.habilitado_venta !== false
  );

  const productosFiltrados =
    textoBusquedaPOS
      ? productosDisponiblesPOS.filter((p) => {
          const nombre = (p.nombre || "").toLowerCase();
          const codigo = (p.codigo || "").toLowerCase();
          const upc = (p.upc || "").toLowerCase();

          return (
            nombre.includes(textoBusquedaPOS) ||
            codigo.includes(textoBusquedaPOS) ||
            upc.includes(textoBusquedaPOS)
          );
        })
      : categoriaSeleccionada === ""
      ? []
      : productosDisponiblesPOS.filter(
          (p) =>
            (p.categoria || "General") ===
            categoriaSeleccionada
        );

  const agregarProductoPOS = async (producto) => {
    try {
      const res = await fetch(
        `${API}/productos/${producto.id}/complementos?empresa_id=${user.empresa_id}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );

      const data = await leerRespuesta(res);
      const requierePreparacion = Boolean(
        String(producto.departamento || "").trim() &&
          String(producto.departamento || "").trim().toUpperCase() !== "NO APLICA"
      );

      if (
        res.ok &&
        ((Array.isArray(data) && data.length > 0) || requierePreparacion)
      ) {
        setProductoComplementos(producto);
        setGruposComplementos(Array.isArray(data) ? data : []);
        setBusquedaPOS("");
        return;
      }
    } catch (error) {
      console.error(error);
    }

    agregarAlCarrito(producto);
    setBusquedaPOS("");
  };

  const agregarProductoConComplementos = (producto, configuracion) => {
    agregarAlCarrito(producto, configuracion);
    setProductoComplementos(null);
    setGruposComplementos([]);
    setBusquedaPOS("");
  };

  const agregarProductoPorBusqueda = () => {
    const texto = busquedaPOS.trim().toLowerCase();

    if (!texto) return;

    const producto = productosDisponiblesPOS.find((p) => {
      const codigo = String(p.codigo || "").toLowerCase();
      const upc = String(p.upc || "").toLowerCase();

      return codigo === texto || upc === texto;
    });

    if (producto) {
      agregarProductoPOS(producto);
      return;
    }

    setAviso({
      tipo: "error",
      titulo: "Producto no encontrado",
      mensaje: "El codigo no corresponde a un producto disponible en POS.",
    });
  };

  // =========================
  // SUPER ADMIN
  // =========================

  const ambienteActual = getSelectedEnvironment();
  const esSandbox = ambienteActual === "sandbox";
  const usarCategoriasAlturaCompleta =
    featuresEmpresa.pos_categorias_altura_completa === true;

  if (user.rol === "superadmin") {

    return (
      <div className={esSandbox ? "app-shell sandbox-mode" : "app-shell"}>

        {esSandbox && (
          <div className="sandbox-banner">
            <strong>SANDBOX</strong>
            <span>Ambiente de pruebas</span>
            <small>v{APP_VERSION}</small>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 24px",
            background: "white",
            color: "#0f172a",
            borderBottom: "1px solid #dbe3ef",
            boxShadow: "0 10px 28px rgba(15, 23, 42, .08)",
          }}
        >

          <h2>Panel Admin SaaS</h2>

          <button
            onClick={logout}
            style={{
              background: "#fff1f2",
              color: "#be123c",
              border: "none",
              borderRadius: 10,
              fontWeight: 900,
              padding: "12px 18px",
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>

        </div>

        <Admin onImpersonar={entrarComoSoporte} />

      </div>
    );
  }

  // =========================
  // UI POS
  // =========================

  return (
    <div
      className={[
        "app-shell",
        esSandbox ? "sandbox-mode" : "",
        vista === "pos" ? "pos-mode" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      {esSandbox && (
        <div className="sandbox-banner">
          <strong>SANDBOX</strong>
          <span>Ambiente de pruebas</span>
          <small>v{APP_VERSION}</small>
        </div>
      )}

      <div className={vista === "pos" ? "pos-page" : ""} style={vista === "pos" ? undefined : { padding: 8 }}>

      <NavbarPOS
        user={user}
        logout={logout}
        vista={vista}
        setVista={setVista}
        dispositivoPOS={dispositivoPOS}
      />

      {user?.soporte_activo && (
        <div className="support-session-banner">
          <div>
            <strong>Modo soporte activo</strong>
            <span>
              Viendo {user.empresa_nombre} como admin.
            </span>
          </div>

          <button
            type="button"
            onClick={salirModoSoporte}
          >
            Salir de soporte
          </button>
        </div>
      )}

      {vista === "pos" && (
        <>
          <POSLayout>

            <ListaCategorias
              categorias={categorias}
              categoriaSeleccionada={categoriaSeleccionada}
              setCategoriaSeleccionada={setCategoriaSeleccionada}
              alturaCompleta={usarCategoriasAlturaCompleta}
            />

            <ListaProductos
              productosFiltrados={productosFiltrados}
              categoriaSeleccionada={categoriaSeleccionada}
              busquedaPOS={busquedaPOS}
              setBusquedaPOS={setBusquedaPOS}
              agregarProductoPorBusqueda={agregarProductoPorBusqueda}
              agregarAlCarrito={agregarProductoPOS}
              accionesSlot={
                <POSAcciones
                  user={user}
                  imprimirTicket={imprimirTicket}
                  imprimirComanda={imprimirComanda}
                  onAgregarCredito={agregarCreditoAlCarrito}
                  cajaActual={cajaActual}
                  onCajaActualizada={setCajaActual}
                  creditosAgregados={carrito
                    .filter((item) => item.tipo_linea === "credito_pendiente")
                    .map((item) => item.venta_credito_id)}
                />
              }
            />

            <Caja
              carrito={carrito}
              total={total}
              actualizarCantidadDirecta={actualizarCantidadDirecta}
              eliminarItem={eliminarItem}
              abrirModalVaciar={() =>
                setMostrarModalVaciar(true)
              }
              abrirModalCobro={abrirModalCobro}
            />

          </POSLayout>

          <POSStatusBar cajaActual={cajaActual} />
        </>
      )}

      {vista === "productos" && (
        <Productos
          user={user}
          onProductosActualizados={cargarProductos}
        />
      )}

      {vista === "categorias" && (
        <Categorias
          user={user}
          onCategoriasActualizadas={cargarCategorias}
        />
      )}

      {vista === "departamentos" && (
        <Departamentos
          user={user}
          onDepartamentosActualizados={cargarDepartamentos}
        />
      )}

      {vista === "inventario" && (
        <Inventario
          user={user}
          onComprarProducto={(producto) => {
            setCompraSugerida(producto);
            setVista("compras");
          }}
        />
      )}

      {vista === "compras" && (
        <Compras
          user={user}
          compraInicial={compraSugerida}
          onCompraInicialUsada={() => setCompraSugerida(null)}
        />
      )}

      {vista === "clientes" && (
        <Clientes user={user} />
      )}

      {vista === "contabilidad" && (
        <Contabilidad user={user} />
      )}

      {vista === "ventas-diarias" && (
        <VentasDiarias user={user} />
      )}

      {vista === "cocina" && (
        <Cocina user={user} />
      )}

      {vista === "admin" && (
        <Admin onImpersonar={entrarComoSoporte} />
      )}

      {/* MODALES */}

      <ModalVaciarCarrito
        visible={mostrarModalVaciar}
        onConfirmar={() => {
          vaciarCarrito();
          setMostrarModalVaciar(false);
        }}
        onCancelar={() =>
          setMostrarModalVaciar(false)
        }
      />

      <ModalCobro
        visible={mostrarModalCobro}
        total={total}
        tieneProductosPreparacion={tieneProductosPreparacion}
        onCancelar={() =>
          setMostrarModalCobro(false)
        }
        onConfirmar={async (datosPago) => {

          const carritoVenta = carrito.map((item) => ({
            ...item,
          }));

          const debeImprimirComandaAuto =
            user?.empresa_imprimir_comanda_auto === true &&
            tieneProductosPreparacion;
          const debeImprimirFacturaAuto =
            user?.empresa_imprimir_factura_auto === true &&
            datosPago.tipo_comprobante !== "Credito";
          const debeImprimirAmbosAuto =
            debeImprimirFacturaAuto && debeImprimirComandaAuto;
          const abrirVentanaAuto =
            !usarImpresionInternaPOS &&
            (debeImprimirFacturaAuto || debeImprimirComandaAuto);
          const ventanaAuto = abrirVentanaAuto
            ? window.open("", "_blank")
            : null;

          const venta = await guardarVenta(
            datosPago,
            carritoVenta
          );

          if (!venta) {
            ventanaAuto?.close();
            return;
          }

          if (debeImprimirAmbosAuto) {
            imprimirTicketYComanda(
              datosPago,
              carritoVenta,
              venta,
              ventanaAuto
            );
          } else if (debeImprimirComandaAuto) {
            imprimirComandaVenta(datosPago, carritoVenta, venta, ventanaAuto);
          }

          if (datosPago.tipo_comprobante === "Credito") {
            setAviso({
              tipo: "exito",
              titulo: "Credito registrado",
              mensaje:
                "El consumo fue cargado correctamente a la cuenta del cliente.",
            });
          } else {
            if (debeImprimirFacturaAuto) {
              if (!debeImprimirAmbosAuto) {
                imprimirTicket(datosPago, carritoVenta, venta, ventanaAuto);
              }
            } else {
              setComprobantePendiente({
                datosPago,
                carritoVenta,
                venta,
              });
            }
          }

          setMostrarModalCobro(false);

        }}
      />

      <ModalImprimirComprobante
        visible={Boolean(comprobantePendiente)}
        tipo={comprobantePendiente?.datosPago?.tipo_comprobante}
        onOmitir={() => setComprobantePendiente(null)}
        onImprimir={() => {
          if (comprobantePendiente) {
            imprimirTicket(
              comprobantePendiente.datosPago,
              comprobantePendiente.carritoVenta,
              comprobantePendiente.venta
            );
          }

          setComprobantePendiente(null);
        }}
      />

      <ModalComplementos
        producto={productoComplementos}
        grupos={gruposComplementos}
        onCancelar={() => {
          setProductoComplementos(null);
          setGruposComplementos([]);
        }}
        onAgregar={agregarProductoConComplementos}
      />

      <ModalAviso
        visible={Boolean(aviso)}
        tipo={aviso?.tipo}
        titulo={aviso?.titulo}
        mensaje={aviso?.mensaje}
        onCerrar={() => setAviso(null)}
      />

      </div>

    </div>
  );
}
