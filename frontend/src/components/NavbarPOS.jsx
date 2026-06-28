import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  CircleUserRound,
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
        Icono: ReceiptText,
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
    <nav className="nav-pos">
      <div className="nav-pos-marca">
        <span className="nav-pos-logo">
          {inicialesEmpresa || "POS"}
        </span>
        <span className="nav-pos-titulos">
          <strong>{nombreEmpresa}</strong>
          <small>Powered by ELYTH SYSTEMS</small>
        </span>
      </div>

      <div className="nav-pos-links">
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
                className="nav-pos-grupo-btn"
                onClick={() => {
                  if (grupo.items.length === 1) {
                    setVista(grupo.items[0].vista);
                  }
                }}
              >
                <Icono aria-hidden="true" />
                {grupo.label}
                {grupo.items.length > 1 && <span>v</span>}
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

      <div className="nav-pos-actions">
        <span className="nav-pos-status-pill">
          <Store aria-hidden="true" />
          Sucursal
        </span>

        <span className="nav-pos-status-pill">
          <ReceiptText aria-hidden="true" />
          Caja
        </span>

        <span className="nav-pos-status-pill">
          <CircleUserRound aria-hidden="true" />
          {user?.nombre || "Usuario"}
        </span>

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
            className="nav-pos-notificaciones"
            aria-label="Ver notificaciones"
            title="Notificaciones"
            onClick={() => {
              cargarCumpleaneros();
              setMostrarNotificaciones(true);
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M18 9.5C18 6.5 15.7 4 12.7 3.6V2.8C12.7 2.4 12.4 2 12 2C11.6 2 11.3 2.4 11.3 2.8V3.6C8.3 4 6 6.5 6 9.5V13.1L4.7 15.8C4.5 16.2 4.5 16.6 4.8 16.9C5 17.3 5.4 17.5 5.8 17.5H18.2C18.6 17.5 19 17.3 19.2 16.9C19.5 16.6 19.5 16.2 19.3 15.8L18 13.1V9.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M9.7 19C10.1 20.2 11 21 12 21C13 21 13.9 20.2 14.3 19"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            {cumpleaneros.length > 0 && (
              <span>{cumpleaneros.length}</span>
            )}
          </button>
        )}

        <button
          className="nav-pos-logout"
          onClick={logout}
        >
          Cerrar sesion
        </button>
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
