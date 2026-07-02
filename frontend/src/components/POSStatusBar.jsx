import { useEffect, useState } from "react";
import {
  CalendarDays,
  CircleCheck,
  Clock3,
  Info,
  ReceiptText,
} from "lucide-react";
import { APP_VERSION, getSelectedEnvironment } from "../config";
import "./POSStatusBar.css";

export default function POSStatusBar({ cajaActual }) {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const reloj = window.setInterval(() => {
      setAhora(new Date());
    }, 1000);

    return () => window.clearInterval(reloj);
  }, []);

  const fecha = ahora.toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Guatemala",
  });
  const hora = ahora.toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Guatemala",
  });
  const ambiente = getSelectedEnvironment() === "sandbox" ? "Sandbox" : "Productivo";

  const items = [
    {
      Icono: ReceiptText,
      label: cajaActual ? "Caja Abierta" : "Caja",
      value: cajaActual ? `Caja ${cajaActual.id || 1}` : "Sin apertura",
    },
    {
      Icono: CircleCheck,
      label: "Servidor OK",
      value: "Conectado",
    },
    {
      Icono: CalendarDays,
      label: "Fecha",
      value: fecha,
    },
    {
      Icono: Clock3,
      label: "Hora",
      value: hora,
    },
    {
      Icono: Info,
      label: "Version",
      value: `${ambiente} - ${APP_VERSION}`,
    },
  ];

  return (
    <footer className="pos-status-bar">
      {items.map(({ Icono, label, value }) => (
        <div
          className={
            label === "Servidor OK"
              ? "pos-status-item status-ok"
              : "pos-status-item"
          }
          key={label}
        >
          <Icono aria-hidden="true" />
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        </div>
      ))}

    </footer>
  );
}
