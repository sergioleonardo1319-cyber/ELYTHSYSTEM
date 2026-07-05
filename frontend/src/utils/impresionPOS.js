import { Capacitor, registerPlugin } from "@capacitor/core";

const ElythSunmiPrinter = registerPlugin("ElythSunmiPrinter");

const parseJsonSeguro = (valor) => {
  if (!valor || typeof valor !== "string") return null;

  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
};

const obtenerPuenteLegacy = () => {
  if (typeof window === "undefined") return null;

  return (
    window.ElythSunmiPrinter ||
    window.SunmiPrinter ||
    window.SUNMIPrinter ||
    window.SUNMI ||
    null
  );
};

const baseDiagnostico = ({ user } = {}) => ({
  fecha_frontend: new Date().toLocaleString("es-GT", {
    timeZone: "America/Guatemala",
  }),
  user_agent:
    typeof navigator !== "undefined" ? navigator.userAgent : "No disponible",
  native_user_agent_build:
    typeof navigator !== "undefined"
      ? navigator.userAgent.match(/ELYTH_NATIVE_BUILD\/([^\s]+)/)?.[1] || null
      : null,
  capacitor: Capacitor.isNativePlatform?.() || Capacitor.getPlatform?.() === "android",
  capacitor_platform: Capacitor.getPlatform?.() || "web",
  empresa: user?.empresa_nombre || user?.empresa || user?.empresa_id || "-",
  usuario: user?.nombre || "-",
});

export const obtenerEstadoImpresoraPOS = async ({ user } = {}) => {
  const puente = obtenerPuenteLegacy();
  const metodos = puente
    ? Object.keys(puente).filter((key) => typeof puente[key] === "function")
    : [];
  const base = {
    ...baseDiagnostico({ user }),
    puente_disponible: Boolean(puente),
    legacy_ready:
      typeof window !== "undefined" ? Boolean(window.ElythSunmiPrinterReady) : false,
    metodos,
  };

  if (Capacitor.isNativePlatform?.()) {
    try {
      const estadoPlugin = await ElythSunmiPrinter.getStatus();
      return {
        ...base,
        ...estadoPlugin,
        puente_disponible: true,
        canal: "capacitor-plugin",
      };
    } catch (error) {
      base.plugin_error = error?.message || String(error);
    }
  }

  if (puente?.getStatus) {
    const estadoLegacy = parseJsonSeguro(puente.getStatus());

    if (estadoLegacy) {
      return {
        ...base,
        ...estadoLegacy,
        canal: "javascript-interface",
      };
    }
  }

  return {
    ...base,
    ok: false,
    service_connected: false,
    mensaje: Capacitor.isNativePlatform?.()
      ? "No se detecto plugin ni puente nativo de impresion en el APK."
      : "Puente nativo no disponible. En web es normal.",
  };
};

export const probarImpresoraPOS = async ({ text, user } = {}) => {
  if (Capacitor.isNativePlatform?.()) {
    try {
      const resultadoPlugin = await ElythSunmiPrinter.testPrint({ text });
      return {
        ...resultadoPlugin,
        canal: "capacitor-plugin",
      };
    } catch (error) {
      return {
        ...(await obtenerEstadoImpresoraPOS({ user })),
        ok: false,
        canal: "capacitor-plugin",
        error: error?.message || String(error),
      };
    }
  }

  const puente = obtenerPuenteLegacy();

  if (puente?.testPrint) {
    return (
      parseJsonSeguro(puente.testPrint(text)) || {
        ok: false,
        mensaje: "La prueba nativa no devolvio JSON valido.",
      }
    );
  }

  if (puente?.printHtml) {
    puente.printHtml(`<script type="text/plain" id="elyth-sunmi-text">${text}</script>`);
    return {
      ok: true,
      canal: "javascript-interface",
      mensaje: "Prueba enviada por printHtml.",
    };
  }

  if (puente?.print) {
    puente.print(text);
    return {
      ok: true,
      canal: "javascript-interface",
      mensaje: "Prueba enviada por print.",
    };
  }

  return {
    ok: false,
    mensaje: "No existe puente nativo de impresion en esta vista.",
  };
};

export const enviarHtmlImpresoraPOS = async (html) => {
  if (Capacitor.isNativePlatform?.()) {
    try {
      const resultado = await ElythSunmiPrinter.printHtml({ html });
      return Boolean(resultado?.print_ok || resultado?.ok);
    } catch (error) {
      console.error("Error usando plugin nativo POS:", error);
    }
  }

  const puente = obtenerPuenteLegacy();

  try {
    if (puente?.printHtml) {
      puente.printHtml(html);
      return true;
    }

    if (puente?.print) {
      puente.print(html);
      return true;
    }
  } catch (error) {
    console.error("Error usando puente legacy POS:", error);
  }

  return false;
};
