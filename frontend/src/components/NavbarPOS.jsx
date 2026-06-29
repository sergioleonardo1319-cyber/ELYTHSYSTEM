import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  BadgeDollarSign,
  Boxes,
  ChevronDown,
  CircleUserRound,
  LogOut,
  ReceiptText,
  Store,
} from "lucide-react";
import "./NavbarPOS.css";
import { API } from "../config";

export default function NavbarPOS({
  user,
  vista,
  setVista,
  logout,
  dispositivoPOS,
}) {
  const [cumpleaneros, setCumpleaneros] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);

  const cargarCumpleaneros = async () => {
    if (!user?.empresa_id || user?.rol === "superadmin") return;

    try {
      const res = await fetch(`${API}/clientes/cumpleaneros/hoy`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      });
      const data = await res.json();

      setCumpleaneros(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando cumpleaneros:", error);
    }
  };

  useEffect(() => {
    cargarCumpleaneros();
  }, [user?.empresa_id]);

  if (!user) return null;

  const nombreEmpresa =
    user?.empresa_nombre ||
    user?.empresa ||
    "Mi Empresa";

  const inicialesEmpresa = nombreEmpresa
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  const puedeVer = (...roles) => roles.includes(user?.rol);

  const grupos = [];

  if (user?.rol !== "superadmin") {
    const posItems = [
      {
        label: "POS",
        vista: "pos",
        visible: puedeVer("admin", "cajero"),
      },
      {
        label: "Pantallas",
        vista: "cocina",
        visible: puedeVer("admin", "cocina"),
      },
    ].filter((item) => item.visible);

    const operacionItems = [
      {
        label: "Productos",
        vista: "productos",
        visible: puedeVer("admin"),
      },
      {
        label: "Categorias",
        vista: "categorias",
        visible: puedeVer("admin"),
      },
      {
        label: "Departamentos",
        vista: "departamentos",
        visible: puedeVer("admin"),
      },
      {
        label: "Clientes",
        vista: "clientes",
        visible: puedeVer("admin"),
      },
      {
        label: "Compras",
        vista: "compras",
        visible: puedeVer("admin", "compras"),
      },
      {
        label: "Inventario",
        vista: "inventario",
        visible: puedeVer("admin", "inventario"),
      },
    ].filter((item) => item.visible);

    const administracionItems = [
      {
        label: "Ventas diarias",
        vista: "ventas-diarias",
        visible: puedeVer("admin"),
      },
      {
        label: "Contabilidad",
        vista: "contabilidad",
        visible: puedeVer("admin"),
      },
    ].filter((item) => item.visible);

    if (posItems.length > 0) {
      grupos.push({
        label: "POS",
        Icono: BadgeDollarSign,
        items: posItems,
      });
    }

    if (operacionItems.length > 0) {
      grupos.push({
        label: "Operacion",
        Icono: Boxes,
        items: operacionItems,
      });
    }

    if (administracionItems.length > 0) {
      grupos.push({
        label: "Administracion",
        Icono: BarChart3,
        items: administracionItems,
      });
    }
  }

  if (user?.rol === "superadmin") {
    grupos.push({
      label: "Admin SaaS",
      Icono: BarChart3,
      items: [
        {
          label: "Empresas y usuarios",
          vista: "admin",
        },
      ],
    });
  }

  const grupoActivo = (grupo) =>
    grupo.items.some((item) => item.vista === vista);

  return (
    <nav className="nav-pos pos-header">
      <div className="nav-pos-marca header-brand">
        <span className="nav-pos-logo brand-logo">
          {inicialesEmpresa || "POS"}
        </span>
        <span className="nav-pos-titulos brand-text">
          <strong className="brand-name">{nombreEmpresa}</strong>
          <small className="brand-powered">Powered by ELYTH SYSTEMS</small>
        </span>
      </div>

      <div className="nav-pos-links header-navigation">
        {grupos.map((grupo) => {
          const Icono = grupo.Icono || Boxes;

          return (
            <div
              className={
                grupoActivo(grupo)
                  ? "nav-pos-grupo activo"
                  : "nav-pos-grupo"
              }
              key={grupo.label}
            >
              <button
                type="button"
                className="nav-pos-grupo-btn nav-button"
                onClick={() => {
                  if (grupo.items.length === 1) {
                    setVista(grupo.items[0].vista);
                  }
                }}
              >
                <Icono className="nav-icon" aria-hidden="true" />
                <span>{grupo.label}</span>
                {grupo.items.length > 1 && (
                  <ChevronDown className="nav-chevron" aria-hidden="true" />
                )}
              </button>

              {grupo.items.length > 1 && (
                <div className="nav-pos-menu">
                  {grupo.items.map((item) => (
                    <button
                      type="button"
                      className={
                        vista === item.vista
                          ? "nav-pos-menu-item activo"
                          : "nav-pos-menu-item"
                      }
                      key={item.vista}
                      onClick={() => setVista(item.vista)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="nav-pos-actions header-actions">
        <span className="nav-pos-status-pill header-card">
          <Store className="header-card-icon" aria-hidden="true" />
          <span className="header-card-text">
            <span className="header-card-label">Sucursal</span>
            <span className="header-card-value">Sucursal Central</span>
          </span>
          <ChevronDown className="header-card-chevron" aria-hidden="true" />
        </span>

        <span className="nav-pos-status-pill header-card">
          <ReceiptText className="header-card-icon" aria-hidden="true" />
          <span className="header-card-text">
            <span className="header-card-label">Caja</span>
            <span className="header-card-value">Caja 1</span>
          </span>
          <ChevronDown className="header-card-chevron" aria-hidden="true" />
        </span>

        <div className="nav-pos-user-menu">
          <button
            type="button"
            className="nav-pos-status-pill header-card user-card"
            aria-expanded={mostrarMenuUsuario}
            onClick={() => setMostrarMenuUsuario((actual) => !actual)}
          >
            <CircleUserRound className="header-card-icon" aria-hidden="true" />
            <span className="header-card-text">
              <span className="header-card-label">{user?.rol || "Usuario"}</span>
              <span className="header-card-value">{user?.nombre || "Usuario"}</span>
            </span>
            <ChevronDown className="header-card-chevron" aria-hidden="true" />
          </button>

          {mostrarMenuUsuario && (
            <div className="nav-pos-user-dropdown">
              <div className="nav-pos-user-summary">
                <strong>{user?.nombre || "Usuario"}</strong>
                <span>{user?.rol || "Sin rol"}</span>
              </div>

              <button
                type="button"
                className="nav-pos-user-logout"
                onClick={logout}
              >
                <LogOut aria-hidden="true" />
                Cerrar sesion
              </button>
            </div>
          )}
        </div>

        {(dispositivoPOS?.esSunmi || dispositivoPOS?.esPOSAndroid) && (
          <span
            className={
              dispositivoPOS?.esSunmiD3
                ? "nav-pos-device sunmi"
                : "nav-pos-device"
            }
            title={
              dispositivoPOS?.soportaImpresionNativa
                ? "Impresion nativa disponible"
                : "Dispositivo POS detectado"
            }
          >
            {dispositivoPOS.nombre}
          </span>
        )}

        {user?.rol !== "superadmin" && (
          <button
            type="button"
            className="nav-pos-notificaciones header-icon-button"
            aria-label="Ver notificaciones"
            title="Notificaciones"
            onClick={() => {
              cargarCumpleaneros();
              setMostrarNotificaciones(true);
            }}
          >
            <Bell aria-hidden="true" />
            {cumpleaneros.length > 0 && (
              <span>{cumpleaneros.length}</span>
            )}
          </button>
        )}

      </div>

      {mostrarNotificaciones && (
        <div className="nav-pos-modal-overlay">
          <section className="nav-pos-modal">
            <div className="nav-pos-modal-header">
              <div>
                <span>Notificaciones</span>
                <h2>Cumpleaneros de hoy</h2>
                <p>
                  Clientes activos con fecha de cumpleanos registrada para hoy.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMostrarNotificaciones(false)}
              >
                x
              </button>
            </div>

            <div className="nav-pos-cumple-list">
              {cumpleaneros.map((cliente) => (
                <article
                  className="nav-pos-cumple-card"
                  key={cliente.id}
                >
                  <div className="nav-pos-cumple-avatar">
                    {cliente.nombre?.slice(0, 1).toUpperCase() || "C"}
                  </div>

                  <div>
                    <strong>{cliente.nombre}</strong>
                    <span>{cliente.codigo || "Sin codigo"}</span>
                    <small>
                      {cliente.telefono || "Sin telefono"}
                      {cliente.correo ? ` | ${cliente.correo}` : ""}
                    </small>
                  </div>
                </article>
              ))}

              {cumpleaneros.length === 0 && (
                <div className="nav-pos-cumple-empty">
                  No hay cumpleaneros registrados para hoy.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </nav>
  );
}
