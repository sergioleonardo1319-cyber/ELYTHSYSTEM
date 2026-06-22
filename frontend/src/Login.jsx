import { useState } from "react";
import ModalAviso from "./components/ModalAviso";
import {
  API,
  ENVIRONMENT_OPTIONS,
  clearSelectedEnvironment,
  setSelectedEnvironment,
} from "./config";
import elythLogo from "./assets/elyth-logo.png";
import iconSeguro from "./assets/elyth-seguro-clean.png";
import iconConfiable from "./assets/elyth-confiable-clean.png";
import iconModerno from "./assets/elyth-moderno-clean.png";
import "./Login.css";

export default function Login({ setUser }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [ambiente, setAmbiente] = useState("production");
  const [aviso, setAviso] = useState(null);

  const login = async () => {
    const ambienteLogin = ambiente;

    try {
      setSelectedEnvironment(ambienteLogin);

      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: usuario,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (!data.token) {
          setAviso({
            tipo: "error",
            titulo: "Login incompleto",
            mensaje: "El servidor no devolvio token.",
          });
          return;
        }

        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
        return;
      }

      setAviso({
        tipo: "error",
        titulo: "No se pudo ingresar",
        mensaje: data.mensaje || "Usuario o password incorrecto.",
      });
    } catch (error) {
      console.error(error);
      clearSelectedEnvironment();

      setAviso({
        tipo: "error",
        titulo: "Servidor no disponible",
        mensaje:
          ambienteLogin === "sandbox"
            ? "No fue posible conectar con el servidor sandbox."
            : "No fue posible conectar con el servidor productivo.",
      });
    }
  };

  return (
    <div className="login-page">
      <div className="login-glow login-glow-primary" />
      <div className="login-glow login-glow-secondary" />

      <main className="login-shell">
        <section className="login-brand">
          <img
            src={elythLogo}
            alt="ELYTH SYSTEMS"
            className="login-brand-logo"
          />

          <h1>
            ELYTH <strong>POS</strong>
          </h1>
          <p className="login-copy">
            Plataforma profesional para punto de venta, control operativo y
            crecimiento empresarial.
          </p>

          <div className="login-features">
            <span>
              <i>
                <img src={iconSeguro} alt="" />
              </i>
              Seguro
            </span>

            <span>
              <i>
                <img src={iconConfiable} alt="" />
              </i>
              Confiable
            </span>

            <span>
              <i>
                <img src={iconModerno} alt="" />
              </i>
              Moderno
            </span>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-header">
            <p className="login-eyebrow">Acceso al sistema</p>
            <h2>Iniciar sesion</h2>
            <span>Ingresa con tu usuario autorizado.</span>
          </div>

          <label className="login-field">
            <span>Usuario o correo</span>
            <div className="login-input-shell">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
              </svg>

              <input
                id="usuario"
                name="usuario"
                type="text"
                autoComplete="username"
                placeholder="Usuario o correo"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="login-input"
              />
            </div>
          </label>

          <div className="login-environment">
            <label>Ambiente</label>

            <div className="login-environment-options">
              {Object.values(ENVIRONMENT_OPTIONS).map((opcion) => (
                <button
                  key={opcion.key}
                  type="button"
                  onClick={() => setAmbiente(opcion.key)}
                  className={
                    ambiente === opcion.key
                      ? "login-environment-btn active"
                      : "login-environment-btn"
                  }
                >
                  {opcion.key === "sandbox" ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M10 2h4" />
                      <path d="M11 2v6l-5.8 9.4A3 3 0 0 0 7.7 22h8.6a3 3 0 0 0 2.5-4.6L13 8V2" />
                      <path d="M8.6 16h6.8" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 7h14" />
                      <path d="M5 12h14" />
                      <path d="M5 17h14" />
                      <path d="M7 5h10v14H7z" />
                    </svg>
                  )}
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>

          <label className="login-field">
            <span>Contrasena</span>
            <div className="login-input-shell">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 10V8a5 5 0 0 1 10 0v2" />
                <path d="M6 10h12v10H6z" />
                <path d="M12 14v2" />
              </svg>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Contrasena"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
              />

              <svg className="login-eye" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </div>
          </label>

          <div className="login-options">
            <label>
              <input type="checkbox" />
              <span>Recordarme</span>
            </label>

            <button type="button">
              Olvidaste tu contrasena?
            </button>
          </div>

          <button
            onClick={login}
            className="login-submit"
          >
            <span>Entrar</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </button>

          <div className="login-secure-text">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3L5 6v5c0 4.2 2.8 8.1 7 10 4.2-1.9 7-5.8 7-10V6l-7-3Z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span>Sistema POS seguro y confiable</span>
          </div>
        </section>
      </main>

      <ModalAviso
        visible={Boolean(aviso)}
        tipo={aviso?.tipo}
        titulo={aviso?.titulo}
        mensaje={aviso?.mensaje}
        onCerrar={() => setAviso(null)}
      />
    </div>
  );
}
