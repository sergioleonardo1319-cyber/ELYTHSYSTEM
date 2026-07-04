import { useEffect } from "react";

let modalesActivos = 0;

const actualizarClase = () => {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("pos-modal-open", modalesActivos > 0);
};

export const activarModalPOS = () => {
  modalesActivos += 1;
  actualizarClase();
};

export const desactivarModalPOS = () => {
  modalesActivos = Math.max(0, modalesActivos - 1);
  actualizarClase();
};

export const usePOSModalLayer = (activo) => {
  useEffect(() => {
    if (!activo) return undefined;

    activarModalPOS();

    return () => {
      desactivarModalPOS();
    };
  }, [activo]);
};
