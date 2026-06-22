import { useEffect, useState } from "react";
import { api } from "../api/api";

export function useProductos(empresa_id) {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    if (!empresa_id) return;

    api.productos(empresa_id).then(setProductos);
  }, [empresa_id]);

  return productos;
}