import { API } from "../config";

export const api = {
  productos: (empresa_id) =>
    fetch(`${API}/productos?empresa_id=${empresa_id}`)
      .then(r => r.json()),

  categorias: () =>
    fetch(`${API}/categorias`)
      .then(r => r.json()),

  reporte: (empresa_id) =>
    fetch(`${API}/reporte/hoy?empresa_id=${empresa_id}`)
      .then(r => r.json()),

  ventas: (data) =>
    fetch(`${API}/ventas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
};
