export const detectarDispositivoPOS = () => {
  const userAgent =
    typeof navigator !== "undefined"
      ? navigator.userAgent || ""
      : "";
  const plataforma =
    typeof navigator !== "undefined"
      ? navigator.platform || ""
      : "";
  const capacitor =
    typeof window !== "undefined"
      ? window.Capacitor || null
      : null;
  const capacitorPlatform =
    capacitor && typeof capacitor.getPlatform === "function"
      ? capacitor.getPlatform()
      : "";
  const texto = `${userAgent} ${plataforma} ${capacitorPlatform}`.toUpperCase();

  const esAndroid = texto.includes("ANDROID") || capacitorPlatform === "android";
  const esCapacitor = Boolean(capacitor?.isNativePlatform?.() || capacitorPlatform);
  const esSunmi = texto.includes("SUNMI");
  const esSunmiD3 = esSunmi && /\bD3\b/.test(texto);
  const esPOSAndroid = esAndroid && (esSunmi || texto.includes("POS"));

  return {
    nombre: esSunmiD3
      ? "SUNMI D3"
      : esSunmi
        ? "SUNMI"
        : esPOSAndroid
          ? "POS Android"
          : esAndroid
            ? "Android"
            : "Navegador",
    userAgent,
    plataforma,
    capacitorPlatform,
    esAndroid,
    esCapacitor,
    esSunmi,
    esSunmiD3,
    esPOSAndroid,
    soportaImpresionNativa:
      typeof window !== "undefined" &&
      Boolean(
        window.ElythSunmiPrinter ||
        window.SunmiPrinter ||
        window.SUNMIPrinter ||
        window.SUNMI
      ),
  };
};

export const aplicarClaseDispositivoPOS = (dispositivo) => {
  if (typeof document === "undefined" || !dispositivo) return;

  document.body.dataset.posDispositivo = dispositivo.nombre;
  document.body.classList.toggle("pos-device-android", dispositivo.esAndroid);
  document.body.classList.toggle("pos-device-sunmi", dispositivo.esSunmi);
  document.body.classList.toggle("pos-device-sunmi-d3", dispositivo.esSunmiD3);
  document.body.classList.toggle("pos-device-capacitor", dispositivo.esCapacitor);
};
