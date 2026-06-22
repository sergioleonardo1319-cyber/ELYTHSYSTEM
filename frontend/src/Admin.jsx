import { useEffect, useMemo, useState } from "react";
import "./Admin.css";
import { API, isSandboxSelected } from "./config";

export default function Admin({ onImpersonar }) {
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [empresasAbiertas, setEmpresasAbiertas] = useState({});
  const [confirmarRefresh, setConfirmarRefresh] = useState(false);
  const [refrescandoSandbox, setRefrescandoSandbox] = useState(false);
  const [comparacionSandbox, setComparacionSandbox] = useState(null);
  const [comparandoEmpresaId, setComparandoEmpresaId] = useState(null);
  const [modulosPromocion, setModulosPromocion] = useState([]);
  const [confirmarPromocion, setConfirmarPromocion] = useState(false);
  const [promoviendoSandbox, setPromoviendoSandbox] = useState(false);
  const [versionForms, setVersionForms] = useState({});
  const [guardandoVersionId, setGuardandoVersionId] = useState(null);
  const [guardandoFeatureId, setGuardandoFeatureId] = useState(null);
  const [toast, setToast] = useState("");
  const [importacion, setImportacion] = useState({
    empresa_id: "",
    tipo: "productos",
    archivo: "",
    filas: [],
    errores: [],
  });

  const [empresaForm, setEmpresaForm] = useState({
    nombre: "",
    nit: "",
    razon_social: "",
    direccion: "",
    codigo_establecimiento: "",
    afiliacion_iva: "GEN",
    correo: "",
    imprimir_factura_auto: false,
    imprimir_comanda_auto: false,
  });

  const [usuario, setUsuario] = useState({
    nombre: "",
    usuario_login: "",
    email: "",
    password: "",
    rol: "cajero",
    empresa_id: "",
  });

  const plantillas = {
    productos: [
      "codigo",
      "upc",
      "nombre",
      "precio",
      "precio_costo",
      "marca",
      "existencia",
      "existencia_minima",
      "categoria",
      "tipo_producto",
      "controla_stock",
      "habilitado_venta",
      "se_fabrica",
      "medida_compra",
      "equivalente_inventario",
      "medida_inventario",
      "departamento",
      "subcategoria",
      "familia",
      "cuenta_contable",
      "centro_costo",
    ],
    categorias: ["nombre"],
    proveedores: ["nombre", "telefono", "email", "direccion"],
    usuarios: ["nombre", "usuario_login", "email", "password", "rol"],
  };

  const ejemplos = {
    productos: [
      "001",
      "740000000001",
      "Cafe americano",
      "18.00",
      "7.50",
      "Casa",
      "50",
      "10",
      "Bebidas",
      "producto",
      "true",
      "true",
      "false",
      "Unidad",
      "1",
      "Unidad",
      "Cocina",
      "",
      "",
      "",
      "",
    ],
    categorias: ["Bebidas"],
    proveedores: [
      "Proveedor Central",
      "5555-0000",
      "proveedor@email.com",
      "Zona 1",
    ],
    usuarios: [
      "Cajero Demo",
      "CAJERO1",
      "cajero@empresa.com",
      "1234",
      "cajero",
    ],
  };

  const accesosPorRol = {
    admin: [
      "POS y cobro",
      "Productos, categorias y clientes",
      "Compras, inventario y proveedores",
      "Contabilidad y ventas diarias",
      "Pantallas de preparacion",
    ],
    cajero: [
      "POS y cobro",
      "Apertura y cierre de caja",
      "Detalle de ventas del dia",
      "Cobro de creditos autorizados",
    ],
    compras: [
      "Compras y proveedores",
      "Historial y detalle de compras",
      "Reabastecimiento de inventario",
    ],
    inventario: [
      "Inventario",
      "Movimientos, conteo fisico y kardex",
      "Stock bajo, agotados y reportes",
    ],
    cocina: [
      "Pantallas de preparacion",
      "Comandas por departamento",
      "Cambio de estado de ordenes",
    ],
  };

  const accesosRolSeleccionado =
    accesosPorRol[usuario.rol] || [];

  const mostrarToast = (mensaje) => {
    setToast(mensaje);

    setTimeout(() => {
      setToast("");
    }, 3000);
  };

  const leerRespuesta = async (res) => {
    const texto = await res.text();

    if (!texto) return {};

    try {
      return JSON.parse(texto);
    } catch {
      return {
        error: "Respuesta no valida del servidor.",
      };
    }
  };

  const cargarEmpresas = async () => {
    const token = sessionStorage.getItem("token");

    const res = await fetch(`${API}/empresas`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await leerRespuesta(res);
    setEmpresas(Array.isArray(data) ? data : []);
    if (Array.isArray(data)) {
      setVersionForms((prev) => {
        const siguiente = { ...prev };
        data.forEach((empresa) => {
          if (!siguiente[empresa.id]) {
            siguiente[empresa.id] = {
              version_sandbox:
                empresa.version_sandbox || "1.0.0-beta",
              estado: empresa.version_estado || "pendiente",
              notas: empresa.version_notas || "",
            };
          }
        });
        return siguiente;
      });
    }
  };

  const cargarUsuarios = async () => {
    const token = sessionStorage.getItem("token");

    const res = await fetch(`${API}/usuarios`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await leerRespuesta(res);
    setUsuarios(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    cargarEmpresas();
    cargarUsuarios();
  }, []);

  const crearEmpresa = async () => {
    const nombre = empresaForm.nombre.trim();

    const requeridos = [
      ["nombre", "nombre comercial"],
    ];

    const faltante = requeridos.find(([campo]) => !String(empresaForm[campo] || "").trim());

    if (faltante) {
      mostrarToast(`Ingresa ${faltante[1]}`);
      return;
    }

    try {
      const token = sessionStorage.getItem("token");

      const res = await fetch(`${API}/empresas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...empresaForm,
          nombre,
        }),
      });

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(data.error || "Error creando empresa");
      }

      setEmpresaForm({
        nombre: "",
        nit: "",
        razon_social: "",
        direccion: "",
        codigo_establecimiento: "",
        afiliacion_iva: "GEN",
        correo: "",
        imprimir_factura_auto: false,
        imprimir_comanda_auto: false,
      });
      await cargarEmpresas();
      mostrarToast("Empresa creada correctamente");
    } catch (error) {
      console.error(error);
      mostrarToast(error.message);
    }
  };

  const actualizarConfiguracionPOS = async (empresa, campo, valor) => {
    try {
      const token = sessionStorage.getItem("token");
      const payload = {
        imprimir_factura_auto:
          campo === "imprimir_factura_auto"
            ? valor
            : empresa.imprimir_factura_auto === true,
        imprimir_comanda_auto:
          campo === "imprimir_comanda_auto"
            ? valor
            : empresa.imprimir_comanda_auto === true,
      };

      const res = await fetch(
        `${API}/empresas/${empresa.id}/configuracion-pos`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(data.error || "Error actualizando configuracion");
      }

      await cargarEmpresas();
      mostrarToast("Configuracion POS actualizada");
    } catch (error) {
      console.error(error);
      mostrarToast(error.message);
    }
  };

  const crearUsuario = async () => {
    if (
      !usuario.nombre.trim() ||
      !usuario.usuario_login.trim() ||
      !usuario.password.trim() ||
      !usuario.empresa_id
    ) {
      mostrarToast("Completa los datos del usuario");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");

      const res = await fetch(`${API}/usuarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(usuario),
      });

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(data.error || "Error creando usuario");
      }

      setUsuario({
        nombre: "",
        usuario_login: "",
        email: "",
        password: "",
        rol: "cajero",
        empresa_id: "",
      });

      await cargarUsuarios();
      mostrarToast("Usuario creado correctamente");
    } catch (error) {
      console.error(error);
      mostrarToast(error.message);
    }
  };

  const descargarPlantilla = () => {
    const columnas = plantillas[importacion.tipo];
    const ejemplo = ejemplos[importacion.tipo];
    const contenido = [
      columnas.join(","),
      ejemplo.join(","),
    ].join("\n");
    const blob = new Blob([contenido], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `plantilla_${importacion.tipo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const parsearCsv = (texto) => {
    const lineas = texto
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter(Boolean);

    if (lineas.length < 2) return [];

    const separador =
      lineas[0].split(";").length > lineas[0].split(",").length
        ? ";"
        : ",";
    const encabezados = lineas[0]
      .split(separador)
      .map((columna) => columna.trim());

    return lineas.slice(1).map((linea) => {
      const valores = linea.split(separador);

      return encabezados.reduce((fila, encabezado, index) => {
        fila[encabezado] = (valores[index] || "").trim();
        return fila;
      }, {});
    });
  };

  const validarFilasImportacion = (tipo, filas) => {
    const errores = [];
    const requeridos = {
      productos: ["nombre", "precio", "categoria"],
      categorias: ["nombre"],
      proveedores: ["nombre"],
      usuarios: ["nombre", "usuario_login", "password", "rol"],
    };
    const rolesValidos = [
      "admin",
      "cajero",
      "compras",
      "inventario",
      "cocina",
    ];

    filas.forEach((fila, index) => {
      const filaNumero = index + 2;

      requeridos[tipo].forEach((campo) => {
        if (!String(fila[campo] || "").trim()) {
          errores.push(`Fila ${filaNumero}: falta ${campo}`);
        }
      });

      if (
        tipo === "productos" &&
        fila.precio &&
        Number.isNaN(Number(fila.precio))
      ) {
        errores.push(`Fila ${filaNumero}: precio invalido`);
      }

      if (
        tipo === "usuarios" &&
        fila.rol &&
        !rolesValidos.includes(fila.rol)
      ) {
        errores.push(`Fila ${filaNumero}: rol invalido`);
      }
    });

    return errores;
  };

  const cargarArchivoImportacion = (e) => {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    const reader = new FileReader();

    reader.onload = () => {
      const texto = reader.result;
      const filas = parsearCsv(String(texto || ""));
      const errores = validarFilasImportacion(
        importacion.tipo,
        filas
      );

      setImportacion((prev) => ({
        ...prev,
        archivo: archivo.name,
        filas,
        errores,
      }));
    };

    reader.onerror = () => {
      mostrarToast("No se pudo leer el archivo");
    };

    reader.readAsText(archivo, "UTF-8");
    e.target.value = "";
  };

  const confirmarImportacion = async () => {
    if (!importacion.empresa_id) {
      mostrarToast("Seleccione la empresa para importar");
      return;
    }

    if (importacion.errores.length > 0) {
      mostrarToast("Corrige los errores antes de importar");
      return;
    }

    if (importacion.filas.length === 0) {
      mostrarToast("Carga un archivo con datos");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");

      const res = await fetch(`${API}/admin/importar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          empresa_id: importacion.empresa_id,
          tipo: importacion.tipo,
          filas: importacion.filas,
        }),
      });

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(data.error || "Error importando datos");
      }

      setImportacion((prev) => ({
        ...prev,
        archivo: "",
        filas: [],
        errores: [],
      }));

      await cargarEmpresas();
      await cargarUsuarios();
      mostrarToast(`Importacion completada: ${data.insertados} registros`);
    } catch (error) {
      console.error(error);
      mostrarToast(error.message);
    }
  };

  const refrescarSandbox = async () => {
    try {
      setRefrescandoSandbox(true);

      const token = sessionStorage.getItem("token");
      const res = await fetch(`${API}/admin/sandbox/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(data.error || "No fue posible refrescar sandbox");
      }

      setConfirmarRefresh(false);
      mostrarToast("Sandbox actualizado desde productivo");
    } catch (error) {
      console.error(error);
      mostrarToast(error.message);
    } finally {
      setRefrescandoSandbox(false);
    }
  };

  const entrarComoAdmin = async (empresa) => {
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(
        `${API}/admin/empresas/${empresa.id}/impersonar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            motivo: "Revision y soporte desde Panel Admin SaaS",
          }),
        }
      );

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(data.error || "No fue posible entrar a la empresa");
      }

      if (typeof onImpersonar === "function") {
        onImpersonar(data);
      }
    } catch (error) {
      console.error(error);
      mostrarToast(error.message);
    }
  };

  const compararSandbox = async (empresa) => {
    try {
      setComparandoEmpresaId(empresa.id);

      const token = sessionStorage.getItem("token");
      const res = await fetch(
        `${API}/admin/empresas/${empresa.id}/comparar-sandbox`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(data.error || "No fue posible comparar ambientes");
      }

      setComparacionSandbox(data);
      setModulosPromocion(
        Object.entries(data.modulos || {})
          .filter(([, modulo]) => resumenModulo(modulo) > 0)
          .map(([nombre]) => nombre)
      );
    } catch (error) {
      console.error(error);
      mostrarToast(error.message);
    } finally {
      setComparandoEmpresaId(null);
    }
  };

  const resumenModulo = (modulo) => {
    const resumen = modulo?.resumen || {};

    return Number(resumen.nuevos || 0) +
      Number(resumen.modificados || 0) +
      Number(resumen.faltantes || 0);
  };

  const modulosComparacion = comparacionSandbox
    ? Object.entries(comparacionSandbox.modulos || {})
    : [];

  const alternarModuloPromocion = (nombre) => {
    setModulosPromocion((prev) =>
      prev.includes(nombre)
        ? prev.filter((item) => item !== nombre)
        : [...prev, nombre]
    );
  };

  const promoverSeleccionados = async () => {
    if (!comparacionSandbox?.empresa?.id) return;

    try {
      setPromoviendoSandbox(true);

      const token = sessionStorage.getItem("token");
      const res = await fetch(
        `${API}/admin/empresas/${comparacionSandbox.empresa.id}/promover-sandbox`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            modulos: modulosPromocion,
          }),
        }
      );

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(data.error || "No fue posible aplicar cambios");
      }

      setComparacionSandbox(data.comparacion);
      setModulosPromocion([]);
      setConfirmarPromocion(false);
      await cargarEmpresas();
      mostrarToast("Cambios aplicados a productivo");
    } catch (error) {
      console.error(error);
      mostrarToast(error.message);
    } finally {
      setPromoviendoSandbox(false);
    }
  };

  const actualizarVersionForm = (empresaId, campo, valor) => {
    setVersionForms((prev) => ({
      ...prev,
      [empresaId]: {
        version_sandbox: "1.0.0-beta",
        estado: "pendiente",
        notas: "",
        ...(prev[empresaId] || {}),
        [campo]: valor,
      },
    }));
  };

  const guardarVersionEmpresa = async (empresa) => {
    try {
      setGuardandoVersionId(empresa.id);

      const token = sessionStorage.getItem("token");
      const form = versionForms[empresa.id] || {};
      const res = await fetch(
        `${API}/admin/empresas/${empresa.id}/version`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(data.error || "No fue posible actualizar version");
      }

      setVersionForms((prev) => ({
        ...prev,
        [empresa.id]: {
          version_sandbox: data.version_sandbox,
          estado: data.estado,
          notas: data.notas || "",
        },
      }));
      await cargarEmpresas();
      mostrarToast("Version de empresa actualizada");
    } catch (error) {
      console.error(error);
      mostrarToast(error.message);
    } finally {
      setGuardandoVersionId(null);
    }
  };

  const actualizarFeatureCategorias = async (empresa, accion) => {
    try {
      setGuardandoFeatureId(empresa.id);

      const payloads = {
        pruebas: {
          sandbox_activo: true,
          estado: "en_pruebas",
        },
        aprobado: {
          sandbox_activo: true,
          estado: "aprobado",
        },
        productivo: {
          sandbox_activo: true,
          productivo_activo: true,
          estado: "publicado",
        },
        apagar: {
          sandbox_activo: false,
          productivo_activo: false,
          estado: "pendiente",
        },
      };

      const token = sessionStorage.getItem("token");
      const res = await fetch(
        `${API}/admin/empresas/${empresa.id}/features/pos_categorias_altura_completa`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payloads[accion]),
        }
      );

      const data = await leerRespuesta(res);

      if (!res.ok) {
        throw new Error(data.error || "No fue posible actualizar el cambio visual");
      }

      await cargarEmpresas();
      mostrarToast("Cambio visual actualizado");
    } catch (error) {
      console.error(error);
      mostrarToast(error.message);
    } finally {
      setGuardandoFeatureId(null);
    }
  };

  const usuariosPorEmpresa = useMemo(() => {
    return empresas.map((empresa) => ({
      ...empresa,
      usuarios: usuarios.filter(
        (usuarioItem) =>
          Number(usuarioItem.empresa_id) === Number(empresa.id)
      ),
    }));
  }, [empresas, usuarios]);

  const usuariosSinEmpresa = usuarios.filter(
    (usuarioItem) =>
      !empresas.some(
        (empresa) =>
          Number(empresa.id) === Number(usuarioItem.empresa_id)
      )
  );

  const alternarEmpresa = (empresaId) => {
    setEmpresasAbiertas((prev) => ({
      ...prev,
      [empresaId]: !prev[empresaId],
    }));
  };

  return (
    <main className="admin-saas-page">
      {toast && (
        <div className="admin-toast">
          {toast}
        </div>
      )}

      <section className="admin-hero">
        <div>
          <span>Administracion SaaS</span>
          <h1>Panel de empresas y usuarios</h1>
          <p>
            Crea empresas, asigna usuarios y controla accesos por rol.
          </p>
        </div>

        <div className="admin-metricas">
          <div>
            <strong>{empresas.length}</strong>
            <small>Empresas</small>
          </div>

          <div>
            <strong>{usuarios.length}</strong>
            <small>Usuarios</small>
          </div>
        </div>
      </section>

      <section className="admin-support-card">
        <div>
          <span>Soporte y sandbox</span>
          <h2>Herramientas de superadmin</h2>
          <p>
            Actualiza sandbox con datos productivos y entra a empresas para
            validar cambios con permisos de administrador.
          </p>
        </div>

        <button
          className="admin-btn-danger"
          disabled={isSandboxSelected()}
          onClick={() => setConfirmarRefresh(true)}
          title={
            isSandboxSelected()
              ? "El refresh debe hacerse desde productivo"
              : "Copiar productivo hacia sandbox"
          }
        >
          Refrescar sandbox desde productivo
        </button>
      </section>

      <section className="admin-grid">
        <div className="admin-card">
          <div className="admin-card-header">
            <span>Empresa</span>
            <h2>Crear empresa</h2>
          </div>

          <div className="admin-company-form">
            <label className="admin-field">
              <span>Nombre comercial</span>
              <input
                required
                value={empresaForm.nombre}
                onChange={(e) =>
                  setEmpresaForm({ ...empresaForm, nombre: e.target.value })
                }
              />
            </label>

            <label className="admin-field">
              <span>NIT emisor</span>
              <input
                value={empresaForm.nit}
                onChange={(e) =>
                  setEmpresaForm({ ...empresaForm, nit: e.target.value })
                }
              />
            </label>

            <label className="admin-field">
              <span>Razon social</span>
              <input
                value={empresaForm.razon_social}
                onChange={(e) =>
                  setEmpresaForm({
                    ...empresaForm,
                    razon_social: e.target.value,
                  })
                }
              />
            </label>

            <label className="admin-field">
              <span>Direccion establecimiento</span>
              <input
                value={empresaForm.direccion}
                onChange={(e) =>
                  setEmpresaForm({ ...empresaForm, direccion: e.target.value })
                }
              />
            </label>

            <label className="admin-field">
              <span>Codigo establecimiento</span>
              <input
                value={empresaForm.codigo_establecimiento}
                onChange={(e) =>
                  setEmpresaForm({
                    ...empresaForm,
                    codigo_establecimiento: e.target.value,
                  })
                }
              />
            </label>

            <label className="admin-field">
              <span>Afiliacion IVA</span>
              <select
                value={empresaForm.afiliacion_iva}
                onChange={(e) =>
                  setEmpresaForm({
                    ...empresaForm,
                    afiliacion_iva: e.target.value,
                  })
                }
              >
                <option value="GEN">General</option>
                <option value="PEQ">Pequeno contribuyente</option>
                <option value="EXE">Exento</option>
              </select>
            </label>

            <label className="admin-field">
              <span>Correo</span>
              <input
                type="email"
                value={empresaForm.correo}
                onChange={(e) =>
                  setEmpresaForm({ ...empresaForm, correo: e.target.value })
                }
              />
            </label>

            <div className="admin-switch-group">
              <label className="admin-switch">
                <input
                  type="checkbox"
                  checked={empresaForm.imprimir_factura_auto}
                  onChange={(e) =>
                    setEmpresaForm({
                      ...empresaForm,
                      imprimir_factura_auto: e.target.checked,
                    })
                  }
                />
                <span>
                  <strong>Imprimir factura/recibo</strong>
                  <small>Automaticamente al finalizar venta</small>
                </span>
              </label>

              <label className="admin-switch">
                <input
                  type="checkbox"
                  checked={empresaForm.imprimir_comanda_auto}
                  onChange={(e) =>
                    setEmpresaForm({
                      ...empresaForm,
                      imprimir_comanda_auto: e.target.checked,
                    })
                  }
                />
                <span>
                  <strong>Imprimir comanda</strong>
                  <small>Automaticamente si hay productos con pantalla</small>
                </span>
              </label>
            </div>
          </div>

          <button
            className="admin-btn-primary"
            onClick={crearEmpresa}
          >
            Crear empresa
          </button>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <span>Usuario</span>
            <h2>Crear usuario</h2>
          </div>

          <div className="admin-user-form">
            <label className="admin-field">
              <span>Nombre</span>
              <input
                value={usuario.nombre}
                onChange={(e) =>
                  setUsuario({
                    ...usuario,
                    nombre: e.target.value,
                  })
                }
              />
            </label>

            <label className="admin-field">
              <span>Usuario de acceso</span>
              <input
                value={usuario.usuario_login}
                onChange={(e) =>
                  setUsuario({
                    ...usuario,
                    usuario_login: e.target.value,
                  })
                }
                placeholder="Ejemplo: CAJERO1"
              />
            </label>

            <label className="admin-field">
              <span>Email opcional</span>
              <input
                type="email"
                value={usuario.email}
                onChange={(e) =>
                  setUsuario({
                    ...usuario,
                    email: e.target.value,
                  })
                }
              />
            </label>

            <label className="admin-field">
              <span>Password</span>
              <input
                type="password"
                value={usuario.password}
                onChange={(e) =>
                  setUsuario({
                    ...usuario,
                    password: e.target.value,
                  })
                }
              />
            </label>

            <label className="admin-field">
              <span>Rol</span>
              <select
                value={usuario.rol}
                onChange={(e) =>
                  setUsuario({
                    ...usuario,
                    rol: e.target.value,
                  })
                }
              >
                <option value="admin">Admin</option>
                <option value="cajero">Cajero</option>
                <option value="compras">Compras</option>
                <option value="inventario">Inventario</option>
                <option value="cocina">Cocina</option>
              </select>
            </label>

            <div className="admin-role-access">
              <div>
                <span>Accesos del rol</span>
                <strong>{usuario.rol}</strong>
              </div>

              <ul>
                {accesosRolSeleccionado.map((acceso) => (
                  <li key={acceso}>{acceso}</li>
                ))}
              </ul>
            </div>

            <label className="admin-field">
              <span>Empresa</span>
              <select
                value={usuario.empresa_id}
                onChange={(e) =>
                  setUsuario({
                    ...usuario,
                    empresa_id: e.target.value,
                  })
                }
              >
                <option value="">Seleccionar empresa</option>

                {empresas.map((empresa) => (
                  <option
                    key={empresa.id}
                    value={empresa.id}
                  >
                    {empresa.nombre}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="admin-btn-primary"
              onClick={crearUsuario}
            >
              Crear usuario
            </button>
          </div>
        </div>
      </section>

      <section className="admin-card admin-import-card">
        <div className="admin-list-header">
          <div>
            <span>Carga masiva</span>
            <h2>Importar datos iniciales</h2>
          </div>
          <p>
            Descarga una plantilla CSV, revisa la vista previa y confirma la carga.
          </p>
        </div>

        <div className="admin-import-grid">
          <label className="admin-field">
            <span>Empresa destino</span>
            <select
              value={importacion.empresa_id}
              onChange={(e) =>
                setImportacion({
                  ...importacion,
                  empresa_id: e.target.value,
                  filas: [],
                  errores: [],
                  archivo: "",
                })
              }
            >
              <option value="">Seleccionar empresa</option>

              {empresas.map((empresa) => (
                <option
                  key={empresa.id}
                  value={empresa.id}
                >
                  {empresa.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>Tipo de carga</span>
            <select
              value={importacion.tipo}
              onChange={(e) =>
                setImportacion({
                  ...importacion,
                  tipo: e.target.value,
                  filas: [],
                  errores: [],
                  archivo: "",
                })
              }
            >
              <option value="productos">Productos</option>
              <option value="categorias">Categorias</option>
              <option value="proveedores">Proveedores</option>
              <option value="usuarios">Usuarios</option>
            </select>
          </label>

          <button
            className="admin-btn-secondary"
            onClick={descargarPlantilla}
          >
            Descargar plantilla
          </button>

          <label className="admin-upload-btn">
            Subir CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={cargarArchivoImportacion}
            />
          </label>
        </div>

        <div className="admin-import-status">
          <strong>
            {importacion.archivo || "Ningun archivo cargado"}
          </strong>
          <span>
            {importacion.filas.length} filas detectadas | {importacion.errores.length} errores
          </span>
        </div>

        {importacion.errores.length > 0 && (
          <div className="admin-import-errors">
            {importacion.errores.slice(0, 8).map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}

        {importacion.filas.length > 0 && (
          <div className="admin-preview-wrap">
            <table>
              <thead>
                <tr>
                  {plantillas[importacion.tipo]
                    .slice(0, 6)
                    .map((columna) => (
                      <th key={columna}>{columna}</th>
                    ))}
                </tr>
              </thead>

              <tbody>
                {importacion.filas.slice(0, 5).map((fila, index) => (
                  <tr key={`${index}-${JSON.stringify(fila)}`}>
                    {plantillas[importacion.tipo]
                      .slice(0, 6)
                      .map((columna) => (
                        <td key={columna}>
                          {fila[columna] || "-"}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          className="admin-btn-primary"
          disabled={
            importacion.filas.length === 0 ||
            importacion.errores.length > 0
          }
          onClick={confirmarImportacion}
        >
          Confirmar importacion
        </button>
      </section>

      <section className="admin-card">
        <div className="admin-list-header">
          <div>
            <span>Usuarios por empresa</span>
            <h2>Listado desplegable</h2>
          </div>
          <p>
            Abre una empresa para ver sus usuarios registrados.
          </p>
        </div>

        <div className="admin-empresas-list">
          {usuariosPorEmpresa.map((empresa) => {
            const abierta = empresasAbiertas[empresa.id];

            return (
              <article
                className="admin-empresa-item"
                key={empresa.id}
              >
                <button
                  className="admin-empresa-toggle"
                  onClick={() => alternarEmpresa(empresa.id)}
                >
                  <span className="admin-empresa-logo">
                    {empresa.nombre?.slice(0, 1).toUpperCase() || "E"}
                  </span>

                  <span className="admin-empresa-texto">
                    <strong>{empresa.nombre}</strong>
                    <small>
                      #{empresa.id} | {empresa.usuarios.length} usuarios
                    </small>
                  </span>

                  <b>{abierta ? "Cerrar" : "Ver usuarios"}</b>
                </button>

                {abierta && (
                  <div className="admin-usuarios-panel">
                    <div className="admin-pos-config">
                      <div>
                        <strong>Configuracion de impresion POS</strong>
                        <small>
                          Estos cambios aplican por empresa. Los usuarios deben
                          volver a iniciar sesion para tomar la configuracion.
                        </small>
                      </div>

                      <label className="admin-switch admin-switch-inline">
                        <input
                          type="checkbox"
                          checked={empresa.imprimir_factura_auto === true}
                          onChange={(e) =>
                            actualizarConfiguracionPOS(
                              empresa,
                              "imprimir_factura_auto",
                              e.target.checked
                            )
                          }
                        />
                        <span>
                          <strong>Factura/recibo auto</strong>
                        </span>
                      </label>

                      <label className="admin-switch admin-switch-inline">
                        <input
                          type="checkbox"
                          checked={empresa.imprimir_comanda_auto === true}
                          onChange={(e) =>
                            actualizarConfiguracionPOS(
                              empresa,
                              "imprimir_comanda_auto",
                              e.target.checked
                            )
                          }
                        />
                        <span>
                          <strong>Comanda auto</strong>
                        </span>
                      </label>
                    </div>

                    <div className="admin-version-panel">
                      <div className="admin-version-status">
                        <div>
                          <span>Version productiva</span>
                          <strong>
                            {empresa.version_productiva || "1.0.0"}
                          </strong>
                        </div>

                        <div>
                          <span>Version sandbox</span>
                          <strong>
                            {empresa.version_sandbox || "1.0.0-beta"}
                          </strong>
                        </div>

                        <div>
                          <span>Estado</span>
                          <strong>
                            {(empresa.version_estado || "pendiente").replaceAll("_", " ")}
                          </strong>
                        </div>
                      </div>

                      <div className="admin-version-form">
                        <label className="admin-field">
                          <span>Version sandbox</span>
                          <input
                            value={
                              versionForms[empresa.id]?.version_sandbox ||
                              empresa.version_sandbox ||
                              "1.0.0-beta"
                            }
                            onChange={(e) =>
                              actualizarVersionForm(
                                empresa.id,
                                "version_sandbox",
                                e.target.value
                              )
                            }
                          />
                        </label>

                        <label className="admin-field">
                          <span>Estado</span>
                          <select
                            value={
                              versionForms[empresa.id]?.estado ||
                              empresa.version_estado ||
                              "pendiente"
                            }
                            onChange={(e) =>
                              actualizarVersionForm(
                                empresa.id,
                                "estado",
                                e.target.value
                              )
                            }
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_pruebas">En pruebas</option>
                            <option value="aprobado">Aprobado</option>
                            <option value="publicado">Publicado</option>
                          </select>
                        </label>

                        <label className="admin-field">
                          <span>Notas</span>
                          <input
                            value={
                              versionForms[empresa.id]?.notas ||
                              empresa.version_notas ||
                              ""
                            }
                            onChange={(e) =>
                              actualizarVersionForm(
                                empresa.id,
                                "notas",
                                e.target.value
                              )
                            }
                            placeholder="Ejemplo: aprobado por cliente"
                          />
                        </label>

                        <button
                          type="button"
                          className="admin-btn-compare"
                          disabled={guardandoVersionId === empresa.id}
                          onClick={() => guardarVersionEmpresa(empresa)}
                        >
                          {guardandoVersionId === empresa.id
                            ? "Guardando..."
                            : "Guardar version"}
                        </button>
                      </div>
                    </div>

                    <div className="admin-feature-panel">
                      <div>
                        <span>Cambio visual POS</span>
                        <strong>Fondo completo en categorias</strong>
                        <small>
                          Sandbox: {empresa.feature_categorias_sandbox ? "activo" : "inactivo"} |
                          Productivo: {empresa.feature_categorias_productivo ? "activo" : "inactivo"} |
                          Estado: {(empresa.feature_categorias_estado || "pendiente").replaceAll("_", " ")}
                        </small>
                      </div>

                      <div className="admin-feature-actions">
                        <button
                          type="button"
                          className="admin-btn-compare"
                          disabled={guardandoFeatureId === empresa.id}
                          onClick={() =>
                            actualizarFeatureCategorias(empresa, "pruebas")
                          }
                        >
                          Activar sandbox
                        </button>

                        <button
                          type="button"
                          className="admin-btn-support"
                          disabled={guardandoFeatureId === empresa.id}
                          onClick={() =>
                            actualizarFeatureCategorias(empresa, "aprobado")
                          }
                        >
                          Marcar aprobado
                        </button>

                        <button
                          type="button"
                          className="admin-btn-danger"
                          disabled={guardandoFeatureId === empresa.id}
                          onClick={() =>
                            actualizarFeatureCategorias(empresa, "productivo")
                          }
                        >
                          Activar productivo
                        </button>
                      </div>
                    </div>

                    <div className="admin-support-actions">
                      <div>
                        <strong>Modo soporte</strong>
                        <small>
                          Entrar a esta empresa como admin. La accion queda
                          registrada para auditoria.
                        </small>
                      </div>

                      <button
                        type="button"
                        className="admin-btn-support"
                        onClick={() => entrarComoAdmin(empresa)}
                      >
                        Entrar como admin
                      </button>

                      <button
                        type="button"
                        className="admin-btn-compare"
                        disabled={
                          isSandboxSelected() ||
                          comparandoEmpresaId === empresa.id
                        }
                        title={
                          isSandboxSelected()
                            ? "Compara desde productivo despues de que el cliente apruebe sandbox"
                            : "Comparar sandbox contra productivo"
                        }
                        onClick={() => compararSandbox(empresa)}
                      >
                        {isSandboxSelected()
                          ? "Comparar desde productivo"
                          : comparandoEmpresaId === empresa.id
                          ? "Comparando..."
                          : "Comparar cambios"}
                      </button>
                    </div>

                    {empresa.usuarios.length === 0 ? (
                      <p>Aun no hay usuarios en esta empresa.</p>
                    ) : (
                      empresa.usuarios.map((usuarioItem) => (
                        <div
                          className="admin-usuario-row"
                          key={usuarioItem.id}
                        >
                          <div>
                            <strong>{usuarioItem.nombre}</strong>
                            <small>
                              {usuarioItem.usuario_login || "Sin usuario"}
                              {usuarioItem.email ? ` | ${usuarioItem.email}` : ""}
                            </small>
                          </div>

                          <span>{usuarioItem.rol}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {usuariosSinEmpresa.length > 0 && (
            <article className="admin-empresa-item">
              <button
                className="admin-empresa-toggle"
                onClick={() => alternarEmpresa("sin_empresa")}
              >
                <span className="admin-empresa-logo">?</span>
                <span className="admin-empresa-texto">
                  <strong>Sin empresa asignada</strong>
                  <small>{usuariosSinEmpresa.length} usuarios</small>
                </span>
                <b>
                  {empresasAbiertas.sin_empresa
                    ? "Cerrar"
                    : "Ver usuarios"}
                </b>
              </button>

              {empresasAbiertas.sin_empresa && (
                <div className="admin-usuarios-panel">
                  {usuariosSinEmpresa.map((usuarioItem) => (
                    <div
                      className="admin-usuario-row"
                      key={usuarioItem.id}
                    >
                      <div>
                        <strong>{usuarioItem.nombre}</strong>
                        <small>
                          {usuarioItem.usuario_login || "Sin usuario"}
                          {usuarioItem.email ? ` | ${usuarioItem.email}` : ""}
                        </small>
                      </div>

                      <span>{usuarioItem.rol}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}
        </div>
      </section>

      {confirmarRefresh && (
        <div className="admin-confirm-overlay">
          <section className="admin-confirm-modal">
            <span>Confirmacion requerida</span>
            <h2>Refrescar sandbox</h2>
            <p>
              Se copiara la base productiva actual hacia sandbox. Esto
              reemplazara los datos actuales de sandbox y puede cerrar
              sesiones de prueba abiertas.
            </p>

            <div className="admin-confirm-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={refrescandoSandbox}
                onClick={() => setConfirmarRefresh(false)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="admin-btn-danger"
                disabled={refrescandoSandbox}
                onClick={refrescarSandbox}
              >
                {refrescandoSandbox
                  ? "Actualizando..."
                  : "Si, refrescar sandbox"}
              </button>
            </div>
          </section>
        </div>
      )}

      {comparacionSandbox && (
        <div className="admin-confirm-overlay">
          <section className="admin-compare-modal">
            <div className="admin-compare-header">
              <div>
                <span>Sandbox vs productivo</span>
                <h2>{comparacionSandbox.empresa?.nombre}</h2>
                <p>
                  Vista previa de diferencias. No se aplico ningun cambio a
                  productivo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setComparacionSandbox(null)}
              >
                x
              </button>
            </div>

            <div className="admin-compare-summary">
              {modulosComparacion.map(([nombre, modulo]) => (
                <article key={nombre}>
                  <label>
                    <input
                      type="checkbox"
                      checked={modulosPromocion.includes(nombre)}
                      disabled={resumenModulo(modulo) === 0}
                      onChange={() => alternarModuloPromocion(nombre)}
                    />
                    <strong>
                      {nombre.replaceAll("_", " ")}
                    </strong>
                  </label>
                  <span>{resumenModulo(modulo)} cambios</span>
                </article>
              ))}
            </div>

            <div className="admin-compare-content">
              {modulosComparacion.map(([nombre, modulo]) => (
                <article
                  className="admin-compare-module"
                  key={nombre}
                >
                  <header>
                    <h3>{nombre.replaceAll("_", " ")}</h3>
                    <small>
                      {modulo.resumen.nuevos} nuevos |{" "}
                      {modulo.resumen.modificados} modificados |{" "}
                      {modulo.resumen.faltantes} faltantes en sandbox
                    </small>
                  </header>

                  {resumenModulo(modulo) === 0 && (
                    <p className="admin-compare-empty">
                      Sin diferencias.
                    </p>
                  )}

                  {modulo.nuevos.length > 0 && (
                    <div className="admin-compare-block">
                      <b>Nuevos en sandbox</b>
                      {modulo.nuevos.slice(0, 8).map((item, index) => (
                        <span key={`${nombre}-nuevo-${index}`}>
                          {item.nombre || item.producto || item.codigo || "Registro nuevo"}
                        </span>
                      ))}
                    </div>
                  )}

                  {modulo.modificados.length > 0 && (
                    <div className="admin-compare-block">
                      <b>Modificados</b>
                      {modulo.modificados.slice(0, 6).map((item) => (
                        <details key={`${nombre}-mod-${item.llave}`}>
                          <summary>{item.nombre}</summary>
                          {item.cambios.slice(0, 8).map((cambio) => (
                            <p key={`${item.llave}-${cambio.campo}`}>
                              <strong>{cambio.campo}:</strong>{" "}
                              Productivo "{String(cambio.productivo)}"{" "}
                              &gt; Sandbox "{String(cambio.sandbox)}"
                            </p>
                          ))}
                        </details>
                      ))}
                    </div>
                  )}

                  {modulo.faltantes.length > 0 && (
                    <div className="admin-compare-block">
                      <b>Existen en productivo y no en sandbox</b>
                      {modulo.faltantes.slice(0, 8).map((item, index) => (
                        <span key={`${nombre}-faltante-${index}`}>
                          {item.nombre || item.producto || item.codigo || "Registro faltante"}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="admin-confirm-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => {
                  setComparacionSandbox(null);
                  setModulosPromocion([]);
                }}
              >
                Cerrar
              </button>

              <button
                type="button"
                className="admin-btn-danger"
                disabled={
                  modulosPromocion.length === 0 ||
                  promoviendoSandbox
                }
                onClick={() => setConfirmarPromocion(true)}
              >
                Aplicar seleccionados a productivo
              </button>
            </div>
          </section>
        </div>
      )}

      {confirmarPromocion && (
        <div className="admin-confirm-overlay">
          <section className="admin-confirm-modal">
            <span>Promocion a productivo</span>
            <h2>Aplicar cambios seleccionados</h2>
            <p>
              Se aplicaran datos maestros y configuracion desde sandbox hacia
              productivo. No se copiaran ventas, caja, facturas, inventario
              real, clientes, cuentas por cobrar ni movimientos contables.
            </p>

            <div className="admin-version-publish-note">
              <strong>
                {comparacionSandbox?.empresa?.nombre}
              </strong>
              <span>
                Al confirmar, la version sandbox quedara marcada como version
                productiva publicada.
              </span>
            </div>

            <div className="admin-promotion-list">
              {modulosPromocion.map((modulo) => (
                <strong key={modulo}>
                  {modulo.replaceAll("_", " ")}
                </strong>
              ))}
            </div>

            <div className="admin-confirm-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={promoviendoSandbox}
                onClick={() => setConfirmarPromocion(false)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="admin-btn-danger"
                disabled={promoviendoSandbox}
                onClick={promoverSeleccionados}
              >
                {promoviendoSandbox
                  ? "Aplicando..."
                  : "Si, aplicar a productivo"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
