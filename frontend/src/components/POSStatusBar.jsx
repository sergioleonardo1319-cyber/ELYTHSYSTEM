import {
  CalendarDays,
  CircleCheck,
  Clock3,
  Info,
  ReceiptText,
} from "lucide-react";
import { APP_VERSION } from "../config";
import "./POSStatusBar.css";

export default function POSStatusBar({ cajaActual }) {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = ahora.toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

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
      value: APP_VERSION,
    },
  ];

  return (
    <footer className="pos-status-bar">
      {items.map(({ Icono, label, value }) => (
        <div className="pos-status-item" key={label}>
          <Icono aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </footer>
  );
}
