export const APP_ENV =
  import.meta.env.VITE_APP_ENV ||
  "development";

export const APP_VERSION =
  import.meta.env.VITE_APP_VERSION ||
  "1.0.0";

const PRODUCTIVE_API =
  import.meta.env.VITE_PRODUCTION_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const SANDBOX_API =
  import.meta.env.VITE_SANDBOX_API_URL ||
  "http://localhost:3001";

const ENV_STORAGE_KEY = "selectedEnvironment";

export const ENVIRONMENT_OPTIONS = {
  production: {
    key: "production",
    label: "Productivo",
    api: PRODUCTIVE_API,
  },
  sandbox: {
    key: "sandbox",
    label: "Sandbox",
    api: SANDBOX_API,
  },
};

export const ENV_SELECTOR_USERS = (
  import.meta.env.VITE_ENV_SELECTOR_USERS ||
  "sergioleonardo1319@hotmail.com"
)
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

export const canSelectEnvironment = (identifier) =>
  ENV_SELECTOR_USERS.includes(String(identifier || "").trim().toLowerCase());

export const getSelectedEnvironment = () => {
  const saved = sessionStorage.getItem(ENV_STORAGE_KEY);

  if (saved === "sandbox" || saved === "production") {
    return saved;
  }

  return APP_ENV === "sandbox" ? "sandbox" : "production";
};

export const setSelectedEnvironment = (environment) => {
  if (environment === "sandbox" || environment === "production") {
    sessionStorage.setItem(ENV_STORAGE_KEY, environment);
  }
};

export const clearSelectedEnvironment = () => {
  sessionStorage.removeItem(ENV_STORAGE_KEY);
};

export const getApiBase = () =>
  ENVIRONMENT_OPTIONS[getSelectedEnvironment()]?.api ||
  PRODUCTIVE_API;

export const isSandboxSelected = () =>
  getSelectedEnvironment() === "sandbox";

export const FEATURE_POS_CATEGORIAS_ALTURA_COMPLETA =
  import.meta.env.VITE_FEATURE_POS_CATEGORIAS_ALTURA_COMPLETA === "true";

export const FEATURE_POS_CATEGORIAS_ALTURA_COMPLETA_EMPRESAS = (
  import.meta.env.VITE_FEATURE_POS_CATEGORIAS_ALTURA_COMPLETA_EMPRESAS ||
  ""
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export const featureCategoriasAlturaCompletaActiva = (empresaId) =>
  FEATURE_POS_CATEGORIAS_ALTURA_COMPLETA &&
  isSandboxSelected() &&
  FEATURE_POS_CATEGORIAS_ALTURA_COMPLETA_EMPRESAS.includes(
    String(empresaId || "")
  );

export const API = {
  toString() {
    return getApiBase();
  },
  valueOf() {
    return getApiBase();
  },
  [Symbol.toPrimitive]() {
    return getApiBase();
  },
};

export const IS_SANDBOX = isSandboxSelected();
