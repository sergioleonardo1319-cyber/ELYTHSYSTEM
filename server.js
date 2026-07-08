const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { Pool } = require("pg");
const { spawnSync } = require("child_process");
const { loadEnv } = require("./config/env");

loadEnv();

const app = express();
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || "development";
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "mi_clave_super_secreta";
const PROJECT_ROOT = __dirname;
const usarSSL = (prefix = "DB") =>
  String(process.env[`${prefix}_SSL`] || "").toLowerCase() === "true";
const esSandbox = APP_ENV === "sandbox";

const obtenerConfigDb = (prefix = "DB", permitirFallbackDb = true) => {
  const usarFallback = permitirFallbackDb && prefix !== "DB";
  const env = (name, fallback = "") =>
    process.env[`${prefix}_${name}`] ||
    (usarFallback ? process.env[`DB_${name}`] : "") ||
    fallback;

  return {
    user: env("USER", "postgres"),
    host: env("HOST", "127.0.0.1"),
    database: env("NAME", prefix === "SANDBOX_DB" ? "pos_sandbox" : "pos"),
    password: env("PASSWORD", "1234"),
    port: Number(env("PORT", "5432")),
    ssl:
      usarSSL(prefix) || (usarFallback && usarSSL("DB"))
        ? { rejectUnauthorized: false }
        : false,
  };
};

const sonMismaBase = (a, b) =>
  String(a.host || "").toLowerCase() === String(b.host || "").toLowerCase() &&
  String(a.database || "").toLowerCase() ===
    String(b.database || "").toLowerCase() &&
  Number(a.port || 5432) === Number(b.port || 5432) &&
  String(a.user || "").toLowerCase() === String(b.user || "").toLowerCase();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    ambiente: APP_ENV,
  });
});

/* =========================
   DATABASE
========================= */

const dbConfig = obtenerConfigDb(esSandbox ? "SANDBOX_DB" : "DB");
const sandboxDbConfig = obtenerConfigDb("SANDBOX_DB");
const sandboxSeparadoDeProductivo = !sonMismaBase(dbConfig, sandboxDbConfig);

if (!esSandbox && !sandboxSeparadoDeProductivo) {
  console.log(
    "ADVERTENCIA: DB y SANDBOX_DB apuntan a la misma base. " +
      "No ejecutes pruebas sandbox hasta separar las bases."
  );
}

const db = new Pool({
  ...dbConfig,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
});

const sandboxDb = new Pool({
  ...sandboxDbConfig,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 5,
});

db.connect()
  .then((client) => {
    client.release();
    console.log("✅ PostgreSQL conectado");
  })
  .catch((err) => {
    console.log("❌ Error PostgreSQL");
    console.log(err);
  });

db.on("error", (err) => {
  console.log("Conexion PostgreSQL interrumpida:", err.message);
});

const esperar = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const esperarPostgres = async () => {
  let intento = 1;

  while (true) {
    try {
      const client = await db.connect();
      await client.query("SELECT 1");
      client.release();
      console.log("PostgreSQL listo para el sistema");
      return;
    } catch (error) {
      console.log(
        `PostgreSQL no disponible, reintentando (${intento}): ${error.message}`
      );
      intento += 1;
      await esperar(3000);
    }
  }
};

const inicializarDepartamentos = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS departamentos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        fecha TIMESTAMP DEFAULT NOW(),
        UNIQUE (nombre, empresa_id)
      )
    `);

    await db.query(`
      INSERT INTO departamentos (nombre, empresa_id)
      SELECT 'COCINA', e.id
      FROM empresas e
      WHERE NOT EXISTS (
        SELECT 1
        FROM departamentos d
        WHERE d.empresa_id = e.id
      )
    `);
  } catch (error) {
    console.log("Error inicializando departamentos:", error.message);
  }
};

const asegurarDepartamentoBase = async (empresaId) => {
  if (!empresaId) return;

  await db.query(
    `
    INSERT INTO departamentos (nombre, empresa_id)
    SELECT 'COCINA', $1
    WHERE NOT EXISTS (
      SELECT 1
      FROM departamentos
      WHERE empresa_id = $1
    )
    `,
    [empresaId]
  );
};

// Se ejecuta desde iniciarServidor(), despues de confirmar PostgreSQL.

const inicializarComplementos = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS complemento_grupos (
        id SERIAL PRIMARY KEY,
        producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nombre VARCHAR(120) NOT NULL,
        obligatorio BOOLEAN DEFAULT TRUE,
        seleccion_multiple BOOLEAN DEFAULT FALSE,
        minimo INTEGER DEFAULT 1,
        maximo INTEGER DEFAULT 1,
        orden INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT TRUE,
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS complemento_opciones (
        id SERIAL PRIMARY KEY,
        grupo_id INTEGER NOT NULL REFERENCES complemento_grupos(id) ON DELETE CASCADE,
        nombre VARCHAR(120) NOT NULL,
        precio_extra NUMERIC(10,2) DEFAULT 0,
        activo BOOLEAN DEFAULT TRUE,
        orden INTEGER DEFAULT 0,
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      ALTER TABLE detalle_ventas
      ADD COLUMN IF NOT EXISTS complementos JSONB DEFAULT '[]'::jsonb
    `);

    await db.query(`
      ALTER TABLE detalle_ventas
      ADD COLUMN IF NOT EXISTS descripcion TEXT
    `);

    await db.query(`
      ALTER TABLE detalle_ventas
      ADD COLUMN IF NOT EXISTS observacion TEXT
    `);

    await db.query(`
      ALTER TABLE complemento_grupos
      ADD COLUMN IF NOT EXISTS parent_opcion_id INTEGER REFERENCES complemento_opciones(id) ON DELETE CASCADE
    `);
  } catch (error) {
    console.log("Error inicializando complementos:", error.message);
  }
};

// Se ejecuta desde iniciarServidor(), despues de confirmar PostgreSQL.

const inicializarComandas = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS comandas (
        id SERIAL PRIMARY KEY,
        venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
        departamento VARCHAR(120) NOT NULL,
        nombre_cliente VARCHAR(160),
        observacion TEXT,
        estado VARCHAR(30) DEFAULT 'PENDIENTE',
        usuario_id INTEGER,
        empresa_id INTEGER NOT NULL,
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS comanda_detalle (
        id SERIAL PRIMARY KEY,
        comanda_id INTEGER REFERENCES comandas(id) ON DELETE CASCADE,
        producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
        producto VARCHAR(160) NOT NULL,
        cantidad NUMERIC(10,2) NOT NULL,
        observacion TEXT,
        complementos JSONB DEFAULT '[]'::jsonb
      )
    `);

    await db.query(`
      ALTER TABLE comandas
      ADD COLUMN IF NOT EXISTS nombre_cliente VARCHAR(160)
    `);

    await db.query(`
      ALTER TABLE comandas
      ADD COLUMN IF NOT EXISTS observacion TEXT
    `);

    await db.query(`
      ALTER TABLE comandas
      ADD COLUMN IF NOT EXISTS fecha_preparacion TIMESTAMP
    `);

    await db.query(`
      ALTER TABLE comandas
      ADD COLUMN IF NOT EXISTS fecha_listo TIMESTAMP
    `);

    await db.query(`
      ALTER TABLE comandas
      ADD COLUMN IF NOT EXISTS fecha_entregado TIMESTAMP
    `);

    await db.query(`
      ALTER TABLE comanda_detalle
      ADD COLUMN IF NOT EXISTS observacion TEXT
    `);
  } catch (error) {
    console.log("Error inicializando comandas:", error.message);
  }
};

// Se ejecuta desde iniciarServidor(), despues de confirmar PostgreSQL.

const inicializarCaja = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS cajas_turnos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        estado VARCHAR(20) DEFAULT 'abierta',
        apertura_denominaciones JSONB DEFAULT '{}'::jsonb,
        cierre_denominaciones JSONB DEFAULT '{}'::jsonb,
        monto_apertura NUMERIC(10,2) DEFAULT 0,
        monto_cierre NUMERIC(10,2) DEFAULT 0,
        efectivo_esperado NUMERIC(10,2) DEFAULT 0,
        ventas_efectivo NUMERIC(10,2) DEFAULT 0,
        ventas_tarjeta NUMERIC(10,2) DEFAULT 0,
        ventas_transferencia NUMERIC(10,2) DEFAULT 0,
        ventas_credito NUMERIC(10,2) DEFAULT 0,
        saldo_favor_usado NUMERIC(10,2) DEFAULT 0,
        gastos NUMERIC(10,2) DEFAULT 0,
        diferencia NUMERIC(10,2) DEFAULT 0,
        observacion_apertura TEXT,
        observacion_cierre TEXT,
        fecha_apertura TIMESTAMP DEFAULT NOW(),
        fecha_cierre TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS caja_gastos (
        id SERIAL PRIMARY KEY,
        descripcion TEXT NOT NULL,
        monto NUMERIC(10,2) NOT NULL,
        autorizado_por VARCHAR(160),
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        caja_turno_id INTEGER REFERENCES cajas_turnos(id) ON DELETE SET NULL,
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS caja_ajustes (
        id SERIAL PRIMARY KEY,
        caja_turno_id INTEGER NOT NULL REFERENCES cajas_turnos(id) ON DELETE CASCADE,
        tipo VARCHAR(20) NOT NULL,
        monto NUMERIC(10,2) NOT NULL,
        denominaciones JSONB DEFAULT '{}'::jsonb,
        motivo TEXT NOT NULL,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        autorizador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      ALTER TABLE ventas
      ADD COLUMN IF NOT EXISTS caja_turno_id INTEGER REFERENCES cajas_turnos(id) ON DELETE SET NULL
    `);

    await db.query(`
      ALTER TABLE ventas
      ADD COLUMN IF NOT EXISTS clave_operacion VARCHAR(120)
    `);

    await db.query(`
      ALTER TABLE ventas
      ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activa'
    `);

    await db.query(`
      ALTER TABLE ventas
      ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMP
    `);

    await db.query(`
      ALTER TABLE ventas
      ADD COLUMN IF NOT EXISTS usuario_anulacion_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
    `);

    await db.query(`
      ALTER TABLE ventas
      ADD COLUMN IF NOT EXISTS autorizador_anulacion_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
    `);

    await db.query(`
      ALTER TABLE ventas
      ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ventas_empresa_clave_operacion_idx
      ON ventas (empresa_id, clave_operacion)
      WHERE clave_operacion IS NOT NULL
    `);

    await db.query(`
      ALTER TABLE caja_gastos
      ADD COLUMN IF NOT EXISTS caja_turno_id INTEGER REFERENCES cajas_turnos(id) ON DELETE SET NULL
    `);

    await db.query(`
      ALTER TABLE cajas_turnos
      ADD COLUMN IF NOT EXISTS reapertura_autorizada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
    `);

    await db.query(`
      ALTER TABLE cajas_turnos
      ADD COLUMN IF NOT EXISTS reapertura_motivo TEXT
    `);

    await db.query(`
      ALTER TABLE compras
      ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) DEFAULT 'pendiente'
    `);

    await db.query(`
      ALTER TABLE compras
      ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE
    `);

    await db.query(`
      ALTER TABLE compras
      ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP
    `);

    await db.query(`
      ALTER TABLE compras
      ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(30)
    `);
  } catch (error) {
    console.log("Error inicializando caja:", error.message);
  }
};

const inicializarSoporte = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS soporte_accesos (
        id SERIAL PRIMARY KEY,
        superadmin_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
        ambiente VARCHAR(30) NOT NULL,
        accion VARCHAR(80) NOT NULL,
        motivo TEXT,
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS empresa_versiones (
        empresa_id INTEGER PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
        version_productiva VARCHAR(40) DEFAULT '1.0.0',
        version_sandbox VARCHAR(40) DEFAULT '1.0.0-beta',
        estado VARCHAR(40) DEFAULT 'pendiente',
        notas TEXT,
        aprobado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        aprobado_en TIMESTAMP,
        publicado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        publicado_en TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS empresa_feature_flags (
        empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
        feature_key VARCHAR(120) NOT NULL,
        descripcion TEXT,
        sandbox_activo BOOLEAN DEFAULT FALSE,
        productivo_activo BOOLEAN DEFAULT FALSE,
        estado VARCHAR(40) DEFAULT 'pendiente',
        actualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        actualizado_en TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (empresa_id, feature_key)
      )
    `);

    await db.query(`
      INSERT INTO empresa_versiones (empresa_id)
      SELECT id
      FROM empresas
      ON CONFLICT (empresa_id) DO NOTHING
    `);

    await db.query(`
      INSERT INTO empresa_feature_flags
      (
        empresa_id,
        feature_key,
        descripcion,
        sandbox_activo,
        productivo_activo,
        estado
      )
      SELECT
        id,
        'pos_categorias_altura_completa',
        'Panel de categorias con fondo completo igual al carrito',
        TRUE,
        TRUE,
        'publicado'
      FROM empresas
      ON CONFLICT (empresa_id, feature_key) DO NOTHING
    `);

    await db.query(`
      UPDATE empresa_feature_flags
      SET
        sandbox_activo = TRUE,
        productivo_activo = TRUE,
        estado = 'publicado',
        actualizado_en = NOW()
      WHERE feature_key = 'pos_categorias_altura_completa'
    `);
  } catch (error) {
    console.log("Error inicializando soporte:", error.message);
  }
};

const asegurarVersionEmpresa = async (empresaId) => {
  await db.query(
    `
    INSERT INTO empresa_versiones (empresa_id)
    VALUES ($1)
    ON CONFLICT (empresa_id) DO NOTHING
    `,
    [empresaId]
  );
};

const obtenerVersionEmpresa = async (empresaId) => {
  await asegurarVersionEmpresa(empresaId);

  const result = await db.query(
    `
    SELECT
      ev.*,
      aprobador.nombre AS aprobado_por_nombre,
      publicador.nombre AS publicado_por_nombre
    FROM empresa_versiones ev
    LEFT JOIN usuarios aprobador
      ON aprobador.id = ev.aprobado_por
    LEFT JOIN usuarios publicador
      ON publicador.id = ev.publicado_por
    WHERE ev.empresa_id = $1
    `,
    [empresaId]
  );

  return result.rows[0];
};

const normalizarTexto = (valor) =>
  String(valor || "").trim().toLowerCase();

const normalizarValorComparacion = (valor) => {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") return Number(valor);
  if (typeof valor === "boolean") return valor;
  return String(valor).trim();
};

const obtenerDiferencias = (productivo, sandbox, obtenerLlave, campos) => {
  const mapaProductivo = new Map(
    productivo.map((item) => [obtenerLlave(item), item])
  );
  const mapaSandbox = new Map(
    sandbox.map((item) => [obtenerLlave(item), item])
  );

  const nuevos = [];
  const modificados = [];
  const faltantes = [];

  for (const [llave, itemSandbox] of mapaSandbox.entries()) {
    const itemProductivo = mapaProductivo.get(llave);

    if (!itemProductivo) {
      nuevos.push(itemSandbox);
      continue;
    }

    const cambios = campos
      .map((campo) => ({
        campo,
        productivo: normalizarValorComparacion(itemProductivo[campo]),
        sandbox: normalizarValorComparacion(itemSandbox[campo]),
      }))
      .filter((cambio) => cambio.productivo !== cambio.sandbox);

    if (cambios.length > 0) {
      modificados.push({
        llave,
        nombre:
          itemSandbox.nombre ||
          itemSandbox.codigo ||
          itemSandbox.producto ||
          llave,
        cambios,
      });
    }
  }

  for (const [llave, itemProductivo] of mapaProductivo.entries()) {
    if (!mapaSandbox.has(llave)) {
      faltantes.push(itemProductivo);
    }
  }

  return {
    nuevos,
    modificados,
    faltantes,
    resumen: {
      nuevos: nuevos.length,
      modificados: modificados.length,
      faltantes: faltantes.length,
    },
  };
};

const consultarComparacionEmpresa = async (pool, empresaId) => {
  const [
    empresa,
    categorias,
    departamentos,
    productos,
    complementos,
  ] = await Promise.all([
    pool.query(
      `
      SELECT
        id,
        nombre,
        nit,
        razon_social,
        direccion,
        codigo_establecimiento,
        afiliacion_iva,
        correo,
        imprimir_factura_auto,
        imprimir_comanda_auto
      FROM empresas
      WHERE id = $1
      `,
      [empresaId]
    ),
    pool.query(
      `
      SELECT nombre
      FROM categorias
      WHERE empresa_id = $1
      ORDER BY nombre
      `,
      [empresaId]
    ),
    pool.query(
      `
      SELECT nombre
      FROM departamentos
      WHERE empresa_id = $1
      ORDER BY nombre
      `,
      [empresaId]
    ),
    pool.query(
      `
      SELECT
        codigo,
        upc,
        nombre,
        precio,
        precio_costo,
        categoria,
        marca,
        existencia_minima,
        habilitado_venta,
        controla_stock,
        tipo_producto,
        se_fabrica,
        medida_compra,
        equivalente_inventario,
        medida_inventario,
        departamento,
        subcategoria,
        familia,
        cuenta_contable,
        centro_costo,
        imagen_url
      FROM productos
      WHERE empresa_id = $1
      ORDER BY nombre
      `,
      [empresaId]
    ),
    pool.query(
      `
      SELECT
        COALESCE(NULLIF(p.codigo, ''), p.nombre) AS producto,
        cg.nombre AS grupo,
        cg.obligatorio,
        cg.seleccion_multiple,
        cg.minimo,
        cg.maximo,
        cg.orden AS grupo_orden,
        cg.activo AS grupo_activo,
        COALESCE(po.nombre, '') AS opcion_padre,
        co.nombre AS opcion,
        co.precio_extra,
        co.activo AS opcion_activa,
        co.orden AS opcion_orden
      FROM complemento_grupos cg
      JOIN productos p
        ON p.id = cg.producto_id
      LEFT JOIN complemento_opciones po
        ON po.id = cg.parent_opcion_id
      LEFT JOIN complemento_opciones co
        ON co.grupo_id = cg.id
      WHERE cg.empresa_id = $1
      ORDER BY producto, opcion_padre, grupo, co.orden, co.nombre
      `,
      [empresaId]
    ),
  ]);

  return {
    empresa: empresa.rows[0] || null,
    categorias: categorias.rows,
    departamentos: departamentos.rows,
    productos: productos.rows,
    complementos: complementos.rows,
  };
};

const compararAmbientesEmpresa = async (empresaId) => {
  const [productivo, sandbox] = await Promise.all([
    consultarComparacionEmpresa(db, empresaId),
    consultarComparacionEmpresa(sandboxDb, empresaId),
  ]);

  if (!productivo.empresa) {
    return {
      error: "Empresa no encontrada en productivo",
    };
  }

  if (!sandbox.empresa) {
    return {
      error: "Empresa no encontrada en sandbox. Refresca sandbox primero.",
    };
  }

  const productoKey = (producto) =>
    normalizarTexto(producto.codigo || producto.nombre);
  const complementoKey = (item) =>
    [
      normalizarTexto(item.producto),
      normalizarTexto(item.opcion_padre),
      normalizarTexto(item.grupo),
      normalizarTexto(item.opcion),
    ].join("|");

  return {
    empresa: {
      id: productivo.empresa.id,
      nombre: productivo.empresa.nombre,
    },
    comparado_en: new Date().toISOString(),
    modulos: {
      configuracion_pos: obtenerDiferencias(
        [productivo.empresa],
        [sandbox.empresa],
        () => "empresa",
        [
          "nombre",
          "nit",
          "razon_social",
          "direccion",
          "codigo_establecimiento",
          "afiliacion_iva",
          "correo",
          "imprimir_factura_auto",
          "imprimir_comanda_auto",
        ]
      ),
      categorias: obtenerDiferencias(
        productivo.categorias,
        sandbox.categorias,
        (item) => normalizarTexto(item.nombre),
        ["nombre"]
      ),
      departamentos: obtenerDiferencias(
        productivo.departamentos,
        sandbox.departamentos,
        (item) => normalizarTexto(item.nombre),
        ["nombre"]
      ),
      productos: obtenerDiferencias(
        productivo.productos,
        sandbox.productos,
        productoKey,
        [
          "codigo",
          "upc",
          "nombre",
          "precio",
          "precio_costo",
          "categoria",
          "marca",
          "existencia_minima",
          "habilitado_venta",
          "controla_stock",
          "tipo_producto",
          "se_fabrica",
          "medida_compra",
          "equivalente_inventario",
          "medida_inventario",
          "departamento",
          "subcategoria",
          "familia",
          "cuenta_contable",
          "centro_costo",
          "imagen_url",
        ]
      ),
      complementos: obtenerDiferencias(
        productivo.complementos,
        sandbox.complementos,
        complementoKey,
        [
          "producto",
          "grupo",
          "obligatorio",
          "seleccion_multiple",
          "minimo",
          "maximo",
          "grupo_orden",
          "grupo_activo",
          "opcion_padre",
          "opcion",
          "precio_extra",
          "opcion_activa",
          "opcion_orden",
        ]
      ),
    },
  };
};

const promoverConfiguracionPOS = async (client, empresaId) => {
  const sandbox = await sandboxDb.query(
    `
    SELECT
      nombre,
      nit,
      razon_social,
      direccion,
      codigo_establecimiento,
      afiliacion_iva,
      correo,
      imprimir_factura_auto,
      imprimir_comanda_auto
    FROM empresas
    WHERE id = $1
    `,
    [empresaId]
  );

  if (sandbox.rows.length === 0) {
    throw new Error("Empresa no encontrada en sandbox");
  }

  const empresa = sandbox.rows[0];

  await client.query(
    `
    UPDATE empresas
    SET
      nombre = $1,
      nit = $2,
      razon_social = $3,
      direccion = $4,
      codigo_establecimiento = $5,
      afiliacion_iva = $6,
      correo = $7,
      imprimir_factura_auto = $8,
      imprimir_comanda_auto = $9
    WHERE id = $10
    `,
    [
      empresa.nombre,
      empresa.nit,
      empresa.razon_social,
      empresa.direccion,
      empresa.codigo_establecimiento,
      empresa.afiliacion_iva,
      empresa.correo,
      empresa.imprimir_factura_auto === true,
      empresa.imprimir_comanda_auto === true,
      empresaId,
    ]
  );

  return 1;
};

const promoverCategorias = async (client, empresaId) => {
  const sandbox = await sandboxDb.query(
    `
    SELECT DISTINCT nombre
    FROM categorias
    WHERE empresa_id = $1
    AND NULLIF(TRIM(nombre), '') IS NOT NULL
    ORDER BY nombre
    `,
    [empresaId]
  );

  let aplicados = 0;

  for (const categoria of sandbox.rows) {
    const existe = await client.query(
      `
      SELECT id
      FROM categorias
      WHERE empresa_id = $1
      AND LOWER(nombre) = LOWER($2)
      `,
      [empresaId, categoria.nombre]
    );

    if (existe.rows.length === 0) {
      await client.query(
        `
        INSERT INTO categorias(nombre, empresa_id)
        VALUES ($1,$2)
        `,
        [categoria.nombre, empresaId]
      );
      aplicados += 1;
    }
  }

  return aplicados;
};

const promoverDepartamentos = async (client, empresaId) => {
  const sandbox = await sandboxDb.query(
    `
    SELECT DISTINCT nombre
    FROM departamentos
    WHERE empresa_id = $1
    AND NULLIF(TRIM(nombre), '') IS NOT NULL
    ORDER BY nombre
    `,
    [empresaId]
  );

  let aplicados = 0;

  for (const departamento of sandbox.rows) {
    const existe = await client.query(
      `
      SELECT id
      FROM departamentos
      WHERE empresa_id = $1
      AND LOWER(nombre) = LOWER($2)
      `,
      [empresaId, departamento.nombre]
    );

    if (existe.rows.length === 0) {
      await client.query(
        `
        INSERT INTO departamentos(nombre, empresa_id)
        VALUES ($1,$2)
        `,
        [departamento.nombre, empresaId]
      );
      aplicados += 1;
    }
  }

  return aplicados;
};

const promoverProductos = async (client, empresaId) => {
  const sandbox = await sandboxDb.query(
    `
    SELECT
      codigo,
      upc,
      nombre,
      precio,
      precio_costo,
      margen,
      marca,
      imagen_url,
      existencia_minima,
      habilitado_venta,
      controla_stock,
      tipo_producto,
      se_fabrica,
      numero_serie,
      medida_compra,
      equivalente_inventario,
      medida_inventario,
      departamento,
      subcategoria,
      familia,
      cuenta_contable,
      centro_costo,
      categoria
    FROM productos
    WHERE empresa_id = $1
    ORDER BY id
    `,
    [empresaId]
  );

  let aplicados = 0;

  for (const producto of sandbox.rows) {
    const codigoNormalizado = String(producto.codigo || "").trim();
    const nombreNormalizado = String(producto.nombre || "").trim();

    if (!nombreNormalizado) continue;

    const existente = await client.query(
      `
      SELECT id
      FROM productos
      WHERE empresa_id = $1
      AND (
        (NULLIF(TRIM($2), '') IS NOT NULL AND LOWER(COALESCE(codigo, '')) = LOWER($2))
        OR
        (NULLIF(TRIM($2), '') IS NULL AND LOWER(nombre) = LOWER($3))
      )
      ORDER BY id
      LIMIT 1
      `,
      [empresaId, codigoNormalizado, nombreNormalizado]
    );

    if (existente.rows.length > 0) {
      await client.query(
        `
        UPDATE productos
        SET
          codigo = $1,
          upc = $2,
          nombre = $3,
          precio = $4,
          precio_costo = $5,
          margen = $6,
          marca = $7,
          imagen_url = $8,
          existencia_minima = $9,
          habilitado_venta = $10,
          controla_stock = $11,
          tipo_producto = $12,
          se_fabrica = $13,
          numero_serie = $14,
          medida_compra = $15,
          equivalente_inventario = $16,
          medida_inventario = $17,
          departamento = $18,
          subcategoria = $19,
          familia = $20,
          cuenta_contable = $21,
          centro_costo = $22,
          categoria = $23
        WHERE id = $24
        AND empresa_id = $25
        `,
        [
          producto.codigo || "",
          producto.upc || "",
          producto.nombre,
          Number(producto.precio || 0),
          Number(producto.precio_costo || 0),
          Number(producto.margen || 0),
          producto.marca || "",
          producto.imagen_url || "",
          Number(producto.existencia_minima || 0),
          producto.habilitado_venta === true,
          producto.controla_stock !== false,
          producto.tipo_producto || "producto",
          producto.se_fabrica === true,
          producto.numero_serie || "",
          producto.medida_compra || "",
          Number(producto.equivalente_inventario || 1),
          producto.medida_inventario || "",
          producto.departamento || "",
          producto.subcategoria || "",
          producto.familia || "",
          producto.cuenta_contable || "",
          producto.centro_costo || "",
          producto.categoria || "",
          existente.rows[0].id,
          empresaId,
        ]
      );
    } else {
      await client.query(
        `
        INSERT INTO productos
        (
          codigo,
          upc,
          nombre,
          precio,
          precio_costo,
          margen,
          marca,
          imagen_url,
          existencia,
          existencia_minima,
          habilitado_venta,
          controla_stock,
          tipo_producto,
          se_fabrica,
          numero_serie,
          medida_compra,
          equivalente_inventario,
          medida_inventario,
          departamento,
          subcategoria,
          familia,
          cuenta_contable,
          centro_costo,
          categoria,
          empresa_id
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,
          $20,$21,$22,$23,$24
        )
        `,
        [
          producto.codigo || "",
          producto.upc || "",
          producto.nombre,
          Number(producto.precio || 0),
          Number(producto.precio_costo || 0),
          Number(producto.margen || 0),
          producto.marca || "",
          producto.imagen_url || "",
          Number(producto.existencia_minima || 0),
          producto.habilitado_venta === true,
          producto.controla_stock !== false,
          producto.tipo_producto || "producto",
          producto.se_fabrica === true,
          producto.numero_serie || "",
          producto.medida_compra || "",
          Number(producto.equivalente_inventario || 1),
          producto.medida_inventario || "",
          producto.departamento || "",
          producto.subcategoria || "",
          producto.familia || "",
          producto.cuenta_contable || "",
          producto.centro_costo || "",
          producto.categoria || "",
          empresaId,
        ]
      );
    }

    aplicados += 1;
  }

  return aplicados;
};

const promoverComplementos = async (client, empresaId) => {
  const productosProductivo = await client.query(
    `
    SELECT id, codigo, nombre
    FROM productos
    WHERE empresa_id = $1
    `,
    [empresaId]
  );

  const productosSandbox = await sandboxDb.query(
    `
    SELECT id, codigo, nombre
    FROM productos
    WHERE empresa_id = $1
    `,
    [empresaId]
  );

  const productoProductivoPorLlave = new Map();

  productosProductivo.rows.forEach((producto) => {
    const llave = normalizarTexto(producto.codigo || producto.nombre);
    if (llave) productoProductivoPorLlave.set(llave, producto);
  });

  const gruposSandbox = await sandboxDb.query(
    `
    SELECT *
    FROM complemento_grupos
    WHERE empresa_id = $1
    ORDER BY producto_id, parent_opcion_id NULLS FIRST, orden, id
    `,
    [empresaId]
  );

  const opcionesSandbox = await sandboxDb.query(
    `
    SELECT co.*
    FROM complemento_opciones co
    JOIN complemento_grupos cg
      ON cg.id = co.grupo_id
    WHERE cg.empresa_id = $1
    ORDER BY co.grupo_id, co.orden, co.id
    `,
    [empresaId]
  );

  await client.query(
    `
    DELETE FROM complemento_opciones
    WHERE grupo_id IN (
      SELECT id
      FROM complemento_grupos
      WHERE empresa_id = $1
    )
    `,
    [empresaId]
  );

  await client.query(
    `
    DELETE FROM complemento_grupos
    WHERE empresa_id = $1
    `,
    [empresaId]
  );

  const opcionesPorGrupo = new Map();
  opcionesSandbox.rows.forEach((opcion) => {
    const lista = opcionesPorGrupo.get(opcion.grupo_id) || [];
    lista.push(opcion);
    opcionesPorGrupo.set(opcion.grupo_id, lista);
  });

  const gruposPorParent = new Map();
  gruposSandbox.rows.forEach((grupo) => {
    const parent = grupo.parent_opcion_id || 0;
    const lista = gruposPorParent.get(parent) || [];
    lista.push(grupo);
    gruposPorParent.set(parent, lista);
  });

  const productoSandboxPorId = new Map(
    productosSandbox.rows.map((producto) => [producto.id, producto])
  );

  let aplicados = 0;

  const guardarGrupo = async (
    grupoSandbox,
    productoProductivoId,
    parentOpcionProductivoId = null
  ) => {
    const grupoResult = await client.query(
      `
      INSERT INTO complemento_grupos
      (
        producto_id,
        empresa_id,
        parent_opcion_id,
        nombre,
        obligatorio,
        seleccion_multiple,
        minimo,
        maximo,
        orden,
        activo
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
      `,
      [
        productoProductivoId,
        empresaId,
        parentOpcionProductivoId,
        grupoSandbox.nombre,
        grupoSandbox.obligatorio === true,
        grupoSandbox.seleccion_multiple === true,
        Number(grupoSandbox.minimo || 1),
        Number(grupoSandbox.maximo || 1),
        Number(grupoSandbox.orden || 0),
        grupoSandbox.activo !== false,
      ]
    );

    aplicados += 1;

    const opciones = opcionesPorGrupo.get(grupoSandbox.id) || [];

    for (const opcion of opciones) {
      const opcionResult = await client.query(
        `
        INSERT INTO complemento_opciones
        (
          grupo_id,
          nombre,
          precio_extra,
          activo,
          orden
        )
        VALUES ($1,$2,$3,$4,$5)
        RETURNING id
        `,
        [
          grupoResult.rows[0].id,
          opcion.nombre,
          Number(opcion.precio_extra || 0),
          opcion.activo !== false,
          Number(opcion.orden || 0),
        ]
      );

      const subgrupos = gruposPorParent.get(opcion.id) || [];

      for (const subgrupo of subgrupos) {
        await guardarGrupo(
          subgrupo,
          productoProductivoId,
          opcionResult.rows[0].id
        );
      }
    }
  };

  const gruposRaiz = gruposPorParent.get(0) || [];

  for (const grupo of gruposRaiz) {
    const productoSandbox = productoSandboxPorId.get(grupo.producto_id);
    if (!productoSandbox) continue;

    const llave = normalizarTexto(
      productoSandbox.codigo || productoSandbox.nombre
    );
    const productoProductivo = productoProductivoPorLlave.get(llave);

    if (!productoProductivo) continue;

    await guardarGrupo(grupo, productoProductivo.id);
  }

  return aplicados;
};

const promoverSandboxAProductivo = async (empresaId, modulos) => {
  const permitidos = [
    "configuracion_pos",
    "categorias",
    "departamentos",
    "productos",
    "complementos",
  ];
  const seleccionados = Array.isArray(modulos)
    ? modulos.filter((modulo) => permitidos.includes(modulo))
    : [];

  if (seleccionados.length === 0) {
    throw new Error("Seleccione al menos un modulo para aplicar");
  }

  const client = await db.connect();
  const resumen = {};

  try {
    await client.query("BEGIN");

    if (seleccionados.includes("configuracion_pos")) {
      resumen.configuracion_pos = await promoverConfiguracionPOS(
        client,
        empresaId
      );
    }

    if (seleccionados.includes("categorias")) {
      resumen.categorias = await promoverCategorias(client, empresaId);
    }

    if (seleccionados.includes("departamentos")) {
      resumen.departamentos = await promoverDepartamentos(client, empresaId);
    }

    if (seleccionados.includes("productos")) {
      resumen.productos = await promoverProductos(client, empresaId);
    }

    if (seleccionados.includes("complementos")) {
      if (!seleccionados.includes("productos")) {
        await promoverProductos(client, empresaId);
      }

      resumen.complementos = await promoverComplementos(client, empresaId);
    }

    await client.query("COMMIT");

    return resumen;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const inicializarContabilidad = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS contabilidad_cuentas (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(40) NOT NULL,
        nombre VARCHAR(160) NOT NULL,
        tipo VARCHAR(30) NOT NULL,
        naturaleza VARCHAR(20) NOT NULL,
        cuenta_padre_id INTEGER REFERENCES contabilidad_cuentas(id) ON DELETE SET NULL,
        permite_movimiento BOOLEAN DEFAULT true,
        estado VARCHAR(20) DEFAULT 'activa',
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        fecha_creacion TIMESTAMP DEFAULT NOW(),
        UNIQUE (empresa_id, codigo)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS contabilidad_partidas (
        id SERIAL PRIMARY KEY,
        fecha TIMESTAMP DEFAULT NOW(),
        descripcion TEXT NOT NULL,
        origen VARCHAR(40) NOT NULL,
        referencia_id INTEGER,
        referencia_codigo VARCHAR(80),
        estado VARCHAR(20) DEFAULT 'registrada',
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        UNIQUE (empresa_id, origen, referencia_id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS contabilidad_partida_detalle (
        id SERIAL PRIMARY KEY,
        partida_id INTEGER NOT NULL REFERENCES contabilidad_partidas(id) ON DELETE CASCADE,
        cuenta_id INTEGER NOT NULL REFERENCES contabilidad_cuentas(id) ON DELETE RESTRICT,
        descripcion TEXT,
        debe NUMERIC(12,2) DEFAULT 0,
        haber NUMERIC(12,2) DEFAULT 0
      )
    `);

    await db.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS usuario_login VARCHAR(80)
    `);

    await db.query(`
      ALTER TABLE usuarios
      ALTER COLUMN email DROP NOT NULL
    `);

    await db.query(`
      UPDATE usuarios
      SET email = NULL
      WHERE TRIM(COALESCE(email, '')) = ''
    `);

    await db.query(`
      ALTER TABLE empresas
      ADD COLUMN IF NOT EXISTS imprimir_factura_auto BOOLEAN DEFAULT false
    `);

    await db.query(`
      ALTER TABLE empresas
      ADD COLUMN IF NOT EXISTS imprimir_comanda_auto BOOLEAN DEFAULT false
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS usuarios_empresa_login_unique
      ON usuarios (empresa_id, LOWER(usuario_login))
      WHERE usuario_login IS NOT NULL AND usuario_login <> ''
    `);
  } catch (error) {
    console.log("Error inicializando contabilidad:", error.message);
  }
};

const cuentasContablesBase = [
  ["1", "Activo", "activo", "deudora", false],
  ["101", "Caja", "activo", "deudora", true],
  ["102", "Bancos", "activo", "deudora", true],
  ["103", "Cuentas por cobrar", "activo", "deudora", true],
  ["104", "Inventario", "activo", "deudora", true],
  ["2", "Pasivo", "pasivo", "acreedora", false],
  ["201", "Proveedores", "pasivo", "acreedora", true],
  ["202", "IVA por pagar", "pasivo", "acreedora", true],
  ["203", "IVA credito fiscal", "activo", "deudora", true],
  ["204", "Anticipos de clientes", "pasivo", "acreedora", true],
  ["3", "Patrimonio", "patrimonio", "acreedora", false],
  ["301", "Capital", "patrimonio", "acreedora", true],
  ["4", "Ingresos", "ingreso", "acreedora", false],
  ["401", "Ventas", "ingreso", "acreedora", true],
  ["5", "Costos", "costo", "deudora", false],
  ["501", "Costo de ventas", "costo", "deudora", true],
  ["6", "Gastos", "gasto", "deudora", false],
  ["601", "Gastos administrativos", "gasto", "deudora", true],
  ["602", "Gastos de caja", "gasto", "deudora", true],
];

const asegurarCuentasContablesBase = async (empresaId, client = db) => {
  for (const cuenta of cuentasContablesBase) {
    await client.query(
      `
      INSERT INTO contabilidad_cuentas
      (
        codigo,
        nombre,
        tipo,
        naturaleza,
        permite_movimiento,
        empresa_id
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (empresa_id, codigo) DO NOTHING
      `,
      [
        cuenta[0],
        cuenta[1],
        cuenta[2],
        cuenta[3],
        cuenta[4],
        empresaId,
      ]
    );
  }
};

const redondearMoneda = (valor) =>
  Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;

const obtenerCuentaContablePorCodigo = async (client, empresaId, codigo) => {
  const result = await client.query(
    `
    SELECT *
    FROM contabilidad_cuentas
    WHERE empresa_id = $1
    AND codigo = $2
    AND estado = 'activa'
    LIMIT 1
    `,
    [empresaId, codigo]
  );

  if (result.rows.length === 0) {
    throw new Error(`Cuenta contable ${codigo} no encontrada o inactiva`);
  }

  return result.rows[0];
};

const registrarPartidaContable = async (
  client,
  {
    empresaId,
    usuarioId,
    descripcion,
    origen,
    referenciaId,
    referenciaCodigo,
    lineas,
  }
) => {
  const lineasValidas = (lineas || [])
    .map((linea) => ({
      ...linea,
      debe: redondearMoneda(linea.debe),
      haber: redondearMoneda(linea.haber),
    }))
    .filter((linea) => linea.debe > 0 || linea.haber > 0);

  const totalDebe = redondearMoneda(
    lineasValidas.reduce((sum, linea) => sum + linea.debe, 0)
  );
  const totalHaber = redondearMoneda(
    lineasValidas.reduce((sum, linea) => sum + linea.haber, 0)
  );

  if (lineasValidas.length < 2 || Math.abs(totalDebe - totalHaber) > 0.01) {
    throw new Error("Partida contable descuadrada");
  }

  await asegurarCuentasContablesBase(empresaId, client);

  const partidaResult = await client.query(
    `
    INSERT INTO contabilidad_partidas
    (
      descripcion,
      origen,
      referencia_id,
      referencia_codigo,
      usuario_id,
      empresa_id
    )
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
    `,
    [
      descripcion,
      origen,
      referenciaId || null,
      referenciaCodigo || "",
      usuarioId,
      empresaId,
    ]
  );

  const partida = partidaResult.rows[0];

  for (const linea of lineasValidas) {
    const cuenta = await obtenerCuentaContablePorCodigo(
      client,
      empresaId,
      linea.cuenta
    );

    await client.query(
      `
      INSERT INTO contabilidad_partida_detalle
      (
        partida_id,
        cuenta_id,
        descripcion,
        debe,
        haber
      )
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        partida.id,
        cuenta.id,
        linea.descripcion || descripcion,
        linea.debe,
        linea.haber,
      ]
    );
  }

  return partida;
};

/* =========================
   MIDDLEWARE AUTH
========================= */

const verificarToken = (req, res, next) => {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Token requerido",
      });
    }

    // VALIDAR FORMATO
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Formato token inválido",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Token vacío",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();

  } catch (error) {

    console.log("ERROR TOKEN:", error.message);

    return res.status(401).json({
      error: "Token inválido",
    });
  }
};

const permitirRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        error: "Sin permisos",
      });
    }

    next();
  };
};

const obtenerEmpresaId = (req) => {
  if (req.user?.rol === "superadmin") {
    return (
      req.body?.empresa_id ||
      req.query?.empresa_id ||
      req.user?.empresa_id
    );
  }

  return req.user?.empresa_id;
};

const asegurarColumnasClientes = async () => {
  await db.query(`
    ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS fecha_cumpleanos DATE
  `);
};

/* =========================
   LOGIN
========================= */

app.post("/login", async (req, res) => {

  try {

    const identificador = String(req.body.email || req.body.usuario || "").trim();
    const { password } = req.body;

    const result = await db.query(
      `
      SELECT
        u.*,
        e.nombre AS empresa_nombre,
        e.nit AS empresa_nit,
        e.razon_social AS empresa_razon_social,
        e.direccion AS empresa_direccion,
        e.codigo_establecimiento AS empresa_codigo_establecimiento,
        e.afiliacion_iva AS empresa_afiliacion_iva,
        e.imprimir_factura_auto AS empresa_imprimir_factura_auto,
        e.imprimir_comanda_auto AS empresa_imprimir_comanda_auto
      FROM usuarios u
      LEFT JOIN empresas e
        ON e.id = u.empresa_id
      WHERE LOWER(COALESCE(u.usuario_login, '')) = LOWER($1)
      OR LOWER(COALESCE(u.email, '')) = LOWER($1)
      `,
      [identificador]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        mensaje: "Usuario no encontrado",
      });
    }

    if (
      result.rows.length > 1 &&
      !String(identificador).includes("@")
    ) {
      return res.status(401).json({
        mensaje:
          "Usuario de acceso duplicado. Ingrese con correo o solicite un usuario unico.",
      });
    }

    const user = result.rows[0];

    if (user.password !== password) {
      return res.status(401).json({
        mensaje: "Password incorrecto",
      });
    }

    // PAYLOAD CORRECTO
    const payload = {
      id: user.id,
      nombre: user.nombre,
      rol: user.rol,
      empresa_id: user.empresa_id,
      empresa_nombre:
        user.empresa_nombre || "Mi Empresa",
      empresa_nit: user.empresa_nit || "",
      empresa_razon_social: user.empresa_razon_social || "",
      empresa_direccion: user.empresa_direccion || "",
      empresa_codigo_establecimiento:
        user.empresa_codigo_establecimiento || "",
      empresa_afiliacion_iva: user.empresa_afiliacion_iva || "",
      empresa_imprimir_factura_auto:
        user.empresa_imprimir_factura_auto === true,
      empresa_imprimir_comanda_auto:
        user.empresa_imprimir_comanda_auto === true,
    };

    // TOKEN CORRECTO
    const token = jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    console.log("TOKEN GENERADO:", token);

    res.json({
      token,
      user: payload,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   ADMIN SOPORTE / SANDBOX
========================= */

app.post(
  "/admin/sandbox/refresh",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {
    try {
      if (APP_ENV === "sandbox") {
        return res.status(400).json({
          error:
            "El refresh debe ejecutarse desde productivo/desarrollo, no desde sandbox.",
        });
      }

      if (!sandboxSeparadoDeProductivo) {
        return res.status(400).json({
          error:
            "Sandbox y productivo apuntan a la misma base. Separa SANDBOX_DB antes de refrescar.",
        });
      }

      const result = spawnSync(
        process.execPath,
        [
          "scripts\\refresh-sandbox.js",
          "--force",
        ],
        {
          cwd: PROJECT_ROOT,
          encoding: "utf8",
          timeout: 180000,
        }
      );

      if (result.status !== 0) {
        console.error(result.stdout);
        console.error(result.stderr);

        return res.status(500).json({
          error:
            result.stderr ||
            result.stdout ||
            "No fue posible refrescar sandbox.",
        });
      }

      await db.query(
        `
        INSERT INTO soporte_accesos
        (
          superadmin_id,
          empresa_id,
          ambiente,
          accion,
          motivo
        )
        VALUES ($1,NULL,$2,$3,$4)
        `,
        [
          req.user.id,
          APP_ENV,
          "refresh_sandbox",
          "Refresh manual desde Panel Admin SaaS",
        ]
      );

      res.json({
        mensaje: "Sandbox actualizado correctamente",
        salida: result.stdout,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

app.post(
  "/admin/empresas/:id/impersonar",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {
    try {
      const empresaId = Number(req.params.id);

      if (!empresaId) {
        return res.status(400).json({
          error: "Empresa no valida",
        });
      }

      const result = await db.query(
        `
        SELECT
          id,
          nombre,
          nit,
          razon_social,
          direccion,
          codigo_establecimiento,
          afiliacion_iva,
          imprimir_factura_auto,
          imprimir_comanda_auto
        FROM empresas
        WHERE id = $1
        `,
        [empresaId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Empresa no encontrada",
        });
      }

      const empresa = result.rows[0];

      await db.query(
        `
        INSERT INTO soporte_accesos
        (
          superadmin_id,
          empresa_id,
          ambiente,
          accion,
          motivo
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          req.user.id,
          empresa.id,
          APP_ENV,
          "entrar_como_admin",
          req.body?.motivo || "Acceso de soporte desde Panel Admin SaaS",
        ]
      );

      const payload = {
        id: req.user.id,
        nombre: `${req.user.nombre || "Soporte"} (Soporte)`,
        rol: "admin",
        empresa_id: empresa.id,
        empresa_nombre: empresa.nombre || "Mi Empresa",
        empresa_nit: empresa.nit || "",
        empresa_razon_social: empresa.razon_social || "",
        empresa_direccion: empresa.direccion || "",
        empresa_codigo_establecimiento:
          empresa.codigo_establecimiento || "",
        empresa_afiliacion_iva: empresa.afiliacion_iva || "",
        empresa_imprimir_factura_auto:
          empresa.imprimir_factura_auto === true,
        empresa_imprimir_comanda_auto:
          empresa.imprimir_comanda_auto === true,
        soporte_activo: true,
        soporte_superadmin_id: req.user.id,
        soporte_superadmin_nombre: req.user.nombre || "Superadmin",
      };

      const token = jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: "2h" }
      );

      res.json({
        token,
        user: payload,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

app.get(
  "/admin/empresas/:id/comparar-sandbox",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {
    try {
      const empresaId = Number(req.params.id);

      if (!empresaId) {
        return res.status(400).json({
          error: "Empresa no valida",
        });
      }

      if (!sandboxSeparadoDeProductivo) {
        return res.status(400).json({
          error:
            "Sandbox y productivo apuntan a la misma base. No es seguro comparar ambientes.",
        });
      }

      const comparacion = await compararAmbientesEmpresa(empresaId);

      if (comparacion.error) {
        return res.status(400).json({
          error: comparacion.error,
        });
      }

      await db.query(
        `
        INSERT INTO soporte_accesos
        (
          superadmin_id,
          empresa_id,
          ambiente,
          accion,
          motivo
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          req.user.id,
          empresaId,
          APP_ENV,
          "comparar_sandbox_productivo",
          "Comparacion de datos maestros entre sandbox y productivo",
        ]
      );

      res.json(comparacion);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

app.post(
  "/admin/empresas/:id/promover-sandbox",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {
    try {
      if (APP_ENV === "sandbox") {
        return res.status(400).json({
          error:
            "La promocion a productivo debe ejecutarse desde productivo, no desde sandbox.",
        });
      }

      if (!sandboxSeparadoDeProductivo) {
        return res.status(400).json({
          error:
            "Sandbox y productivo apuntan a la misma base. No es seguro promover cambios.",
        });
      }

      const empresaId = Number(req.params.id);

      if (!empresaId) {
        return res.status(400).json({
          error: "Empresa no valida",
        });
      }

      const modulos = Array.isArray(req.body?.modulos)
        ? req.body.modulos
        : [];

      const resumen = await promoverSandboxAProductivo(
        empresaId,
        modulos
      );

      const versionActual = await obtenerVersionEmpresa(empresaId);

      await db.query(
        `
        INSERT INTO soporte_accesos
        (
          superadmin_id,
          empresa_id,
          ambiente,
          accion,
          motivo
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          req.user.id,
          empresaId,
          APP_ENV,
          "promover_sandbox_productivo",
          `Modulos aplicados: ${modulos.join(", ")}`,
        ]
      );

      await db.query(
        `
        UPDATE empresa_versiones
        SET
          version_productiva = version_sandbox,
          estado = 'publicado',
          publicado_por = $1,
          publicado_en = NOW(),
          actualizado_en = NOW()
        WHERE empresa_id = $2
        `,
        [
          req.user.id,
          empresaId,
        ]
      );

      const comparacion = await compararAmbientesEmpresa(empresaId);
      const version = await obtenerVersionEmpresa(empresaId);

      res.json({
        mensaje: "Cambios aplicados a productivo",
        resumen,
        version_anterior: versionActual,
        version,
        comparacion,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

app.get(
  "/admin/empresas/:id/version",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {
    try {
      const empresaId = Number(req.params.id);

      if (!empresaId) {
        return res.status(400).json({
          error: "Empresa no valida",
        });
      }

      const version = await obtenerVersionEmpresa(empresaId);
      res.json(version);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

app.patch(
  "/admin/empresas/:id/version",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {
    try {
      const empresaId = Number(req.params.id);
      const {
        version_sandbox,
        estado,
        notas,
      } = req.body || {};

      if (!empresaId) {
        return res.status(400).json({
          error: "Empresa no valida",
        });
      }

      await asegurarVersionEmpresa(empresaId);

      const estadosValidos = [
        "pendiente",
        "en_pruebas",
        "aprobado",
        "publicado",
      ];
      const estadoFinal = estadosValidos.includes(estado)
        ? estado
        : "en_pruebas";
      const versionSandboxFinal = String(version_sandbox || "").trim();

      if (!versionSandboxFinal) {
        return res.status(400).json({
          error: "Ingrese version sandbox",
        });
      }

      await db.query(
        `
        UPDATE empresa_versiones
        SET
          version_sandbox = $1,
          estado = $2,
          notas = $3,
          aprobado_por = CASE WHEN $2 = 'aprobado' THEN $4 ELSE aprobado_por END,
          aprobado_en = CASE WHEN $2 = 'aprobado' THEN NOW() ELSE aprobado_en END,
          actualizado_en = NOW()
        WHERE empresa_id = $5
        `,
        [
          versionSandboxFinal,
          estadoFinal,
          notas || "",
          req.user.id,
          empresaId,
        ]
      );

      await db.query(
        `
        INSERT INTO soporte_accesos
        (
          superadmin_id,
          empresa_id,
          ambiente,
          accion,
          motivo
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          req.user.id,
          empresaId,
          APP_ENV,
          "actualizar_version_empresa",
          `Version sandbox ${versionSandboxFinal}; estado ${estadoFinal}`,
        ]
      );

      const version = await obtenerVersionEmpresa(empresaId);
      res.json(version);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

app.get(
  "/features",
  verificarToken,
  async (req, res) => {
    try {
      const empresaId = obtenerEmpresaId(req);

      if (!empresaId) {
        return res.json({});
      }

      const result = await db.query(
        `
        SELECT
          feature_key,
          sandbox_activo,
          productivo_activo
        FROM empresa_feature_flags
        WHERE empresa_id = $1
        `,
        [empresaId]
      );

      const esSandbox = APP_ENV === "sandbox";
      const features = {};

      result.rows.forEach((row) => {
        features[row.feature_key] = esSandbox
          ? row.sandbox_activo === true
          : row.productivo_activo === true;
      });

      res.json(features);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

app.patch(
  "/admin/empresas/:id/features/:featureKey",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {
    try {
      const empresaId = Number(req.params.id);
      const featureKey = String(req.params.featureKey || "").trim();

      if (!empresaId || !featureKey) {
        return res.status(400).json({
          error: "Feature o empresa no valida",
        });
      }

      const sandboxActivo =
        req.body.sandbox_activo === undefined
          ? null
          : req.body.sandbox_activo === true;
      const productivoActivo =
        req.body.productivo_activo === undefined
          ? null
          : req.body.productivo_activo === true;
      const estado = String(req.body.estado || "").trim() || "en_pruebas";

      await db.query(
        `
        INSERT INTO empresa_feature_flags
        (
          empresa_id,
          feature_key,
          descripcion
        )
        VALUES ($1,$2,$3)
        ON CONFLICT (empresa_id, feature_key) DO NOTHING
        `,
        [
          empresaId,
          featureKey,
          "Panel de categorias con fondo completo igual al carrito",
        ]
      );

      await db.query(
        `
        UPDATE empresa_feature_flags
        SET
          sandbox_activo = COALESCE($1, sandbox_activo),
          productivo_activo = COALESCE($2, productivo_activo),
          estado = $3,
          actualizado_por = $4,
          actualizado_en = NOW()
        WHERE empresa_id = $5
        AND feature_key = $6
        `,
        [
          sandboxActivo,
          productivoActivo,
          estado,
          req.user.id,
          empresaId,
          featureKey,
        ]
      );

      await db.query(
        `
        INSERT INTO soporte_accesos
        (
          superadmin_id,
          empresa_id,
          ambiente,
          accion,
          motivo
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          req.user.id,
          empresaId,
          APP_ENV,
          "actualizar_feature_empresa",
          `${featureKey}; estado ${estado}`,
        ]
      );

      const result = await db.query(
        `
        SELECT *
        FROM empresa_feature_flags
        WHERE empresa_id = $1
        AND feature_key = $2
        `,
        [
          empresaId,
          featureKey,
        ]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

/* =========================
   EMPRESAS
========================= */

app.get(
  "/empresas",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {

  try {

    const result = await db.query(`
      SELECT
        e.*,
        COALESCE(ev.version_productiva, '1.0.0') AS version_productiva,
        COALESCE(ev.version_sandbox, '1.0.0-beta') AS version_sandbox,
        COALESCE(ev.estado, 'pendiente') AS version_estado,
        ev.notas AS version_notas,
        ev.aprobado_en,
        ev.publicado_en,
        aprobador.nombre AS version_aprobado_por,
        publicador.nombre AS version_publicado_por,
        COALESCE(ff.sandbox_activo, FALSE) AS feature_categorias_sandbox,
        COALESCE(ff.productivo_activo, FALSE) AS feature_categorias_productivo,
        COALESCE(ff.estado, 'pendiente') AS feature_categorias_estado,
        ff.descripcion AS feature_categorias_descripcion
      FROM empresas e
      LEFT JOIN empresa_versiones ev
        ON ev.empresa_id = e.id
      LEFT JOIN empresa_feature_flags ff
        ON ff.empresa_id = e.id
        AND ff.feature_key = 'pos_categorias_altura_completa'
      LEFT JOIN usuarios aprobador
        ON aprobador.id = ev.aprobado_por
      LEFT JOIN usuarios publicador
        ON publicador.id = ev.publicado_por
      ORDER BY e.id DESC
    `);

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
  }
);

app.post(
  "/empresas",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {

  try {

    const {
      nombre,
      nit,
      razon_social,
      direccion,
      codigo_establecimiento,
      afiliacion_iva,
      correo,
      imprimir_factura_auto,
      imprimir_comanda_auto,
    } = req.body;

    const camposRequeridos = {
      nombre,
    };

    const campoFaltante = Object.entries(camposRequeridos)
      .find(([, valor]) => !String(valor || "").trim());

    if (campoFaltante) {
      return res.status(400).json({
        error: `Campo requerido: ${campoFaltante[0]}`,
      });
    }

    const result = await db.query(
      `
      INSERT INTO empresas
      (
        nombre,
        nit,
        razon_social,
        direccion,
        codigo_establecimiento,
        afiliacion_iva,
        correo,
        imprimir_factura_auto,
        imprimir_comanda_auto
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        String(nombre || "").trim(),
        String(nit || "").trim(),
        String(razon_social || "").trim(),
        String(direccion || "").trim(),
        String(codigo_establecimiento || "").trim(),
        String(afiliacion_iva || "GEN").trim(),
        correo || "",
        imprimir_factura_auto === true,
        imprimir_comanda_auto === true,
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   USUARIOS
========================= */

app.get(
  "/usuarios",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {

  try {

    const result = await db.query(`
      SELECT *
      FROM usuarios
      ORDER BY id DESC
    `);

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
  }
);

app.post(
  "/usuarios",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {

  try {

    const {
      nombre,
      usuario_login,
      email,
      password,
      rol,
      empresa_id,
    } = req.body;
    const usuarioLoginFinal = String(usuario_login || "").trim();
    const emailFinal = String(email || "").trim() || null;

    const rolesValidos = [
      "admin",
      "cajero",
      "compras",
      "inventario",
      "cocina",
      "superadmin",
    ];

    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        error: "Rol invalido",
      });
    }

    if (!String(nombre || "").trim()) {
      return res.status(400).json({
        error: "Nombre requerido",
      });
    }

    if (!usuarioLoginFinal) {
      return res.status(400).json({
        error: "Usuario de acceso requerido",
      });
    }

    if (!String(password || "").trim()) {
      return res.status(400).json({
        error: "Password requerido",
      });
    }

    const duplicadoLogin = await db.query(
      `
      SELECT id
      FROM usuarios
      WHERE LOWER(COALESCE(usuario_login, '')) = LOWER($1)
      LIMIT 1
      `,
      [usuarioLoginFinal]
    );

    if (duplicadoLogin.rows.length > 0) {
      return res.status(400).json({
        error: "El usuario de acceso ya existe",
      });
    }

    if (emailFinal) {
      const duplicadoEmail = await db.query(
        `
        SELECT id
        FROM usuarios
        WHERE LOWER(COALESCE(email, '')) = LOWER($1)
        LIMIT 1
        `,
        [emailFinal]
      );

      if (duplicadoEmail.rows.length > 0) {
        return res.status(400).json({
          error: "El correo ya existe",
        });
      }
    }

    const result = await db.query(
      `
      INSERT INTO usuarios
      (
        nombre,
        usuario_login,
        email,
        password,
        rol,
        empresa_id
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        nombre,
        usuarioLoginFinal,
        emailFinal,
        password,
        rol,
        empresa_id,
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    if (error.code === "23505") {
      return res.status(400).json({
        error:
          error.constraint === "usuarios_email_key"
            ? "El correo ya existe"
            : "El usuario ya existe",
      });
    }

    res.status(500).json({
      error: error.message,
    });
  }
  }
);

/* =========================
   IMPORTACION MASIVA SAAS
========================= */

app.post(
  "/admin/importar",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {

  const client = await db.connect();
  let claveOperacion = "";
  let empresaIdFinal = null;

  try {

    const {
      empresa_id,
      tipo,
      filas,
    } = req.body;

    const empresaId = Number(empresa_id);

    if (!empresaId) {
      return res.status(400).json({
        error: "Seleccione una empresa",
      });
    }

    if (!Array.isArray(filas) || filas.length === 0) {
      return res.status(400).json({
        error: "No hay filas validas para importar",
      });
    }

    const empresaResult = await client.query(
      `
      SELECT id
      FROM empresas
      WHERE id = $1
      `,
      [empresaId]
    );

    if (empresaResult.rows.length === 0) {
      return res.status(404).json({
        error: "Empresa no encontrada",
      });
    }

    await client.query("BEGIN");

    let insertados = 0;

    if (tipo === "categorias") {
      for (const fila of filas) {
        const nombre = String(fila.nombre || "").trim();

        if (!nombre) continue;

        await client.query(
          `
          INSERT INTO categorias(nombre, empresa_id)
          VALUES ($1,$2)
          `,
          [
            nombre,
            empresaId,
          ]
        );

        insertados += 1;
      }
    } else if (tipo === "proveedores") {
      for (const fila of filas) {
        const nombre = String(fila.nombre || "").trim();

        if (!nombre) continue;

        await client.query(
          `
          INSERT INTO proveedores
          (
            nombre,
            telefono,
            email,
            direccion,
            empresa_id
          )
          VALUES ($1,$2,$3,$4,$5)
          `,
          [
            nombre,
            fila.telefono || "",
            fila.email || "",
            fila.direccion || "",
            empresaId,
          ]
        );

        insertados += 1;
      }
    } else if (tipo === "usuarios") {
      const rolesValidos = [
        "admin",
        "cajero",
        "compras",
        "inventario",
        "cocina",
      ];

      for (const fila of filas) {
        const nombre = String(fila.nombre || "").trim();
        const usuarioLogin = String(fila.usuario_login || fila.usuario || "").trim();
        const email = String(fila.email || "").trim() || null;
        const password = String(fila.password || "").trim();
        const rol = String(fila.rol || "cajero").trim();

        if (!nombre || !usuarioLogin || !password) continue;

        if (!rolesValidos.includes(rol)) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error: `Rol invalido: ${rol}`,
          });
        }

        await client.query(
          `
          INSERT INTO usuarios
          (
            nombre,
            usuario_login,
            email,
            password,
            rol,
            empresa_id
          )
          VALUES ($1,$2,$3,$4,$5,$6)
          `,
          [
            nombre,
            usuarioLogin,
            email,
            password,
            rol,
            empresaId,
          ]
        );

        insertados += 1;
      }
    } else if (tipo === "productos") {
      for (const fila of filas) {
        const nombre = String(fila.nombre || "").trim();
        const categoria = String(fila.categoria || "").trim();

        if (!nombre || !categoria) continue;

        const precio = Number(fila.precio || 0);
        const precioCosto = Number(fila.precio_costo || 0);
        const existencia = Number(fila.existencia || 0);
        const existenciaMinima = Number(fila.existencia_minima || 0);
        const controlaStock =
          String(fila.controla_stock || "true").toLowerCase() !== "false";
        const habilitadoVenta =
          String(fila.habilitado_venta || "true").toLowerCase() !== "false";
        const seFabrica =
          String(fila.se_fabrica || "false").toLowerCase() === "true";

        await client.query(
          `
          INSERT INTO productos
          (
            codigo,
            upc,
            nombre,
            precio,
            precio_costo,
            margen,
            marca,
            imagen_url,
            existencia,
            existencia_minima,
            habilitado_venta,
            controla_stock,
            tipo_producto,
            se_fabrica,
            numero_serie,
            medida_compra,
            equivalente_inventario,
            medida_inventario,
            departamento,
            subcategoria,
            familia,
            cuenta_contable,
            centro_costo,
            categoria,
            empresa_id
          )
          VALUES
          (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
          )
          `,
          [
            fila.codigo || "",
            fila.upc || "",
            nombre,
            precio,
            precioCosto,
            precio - precioCosto,
            fila.marca || "",
            "",
            existencia,
            existenciaMinima,
            habilitadoVenta,
            controlaStock,
            fila.tipo_producto || "producto",
            seFabrica,
            fila.numero_serie || "",
            fila.medida_compra || "",
            fila.equivalente_inventario
              ? Number(fila.equivalente_inventario)
              : 1,
            fila.medida_inventario || "",
            fila.departamento || "",
            fila.subcategoria || "",
            fila.familia || "",
            fila.cuenta_contable || "",
            fila.centro_costo || "",
            categoria,
            empresaId,
          ]
        );

        insertados += 1;
      }
    } else {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error: "Tipo de importacion no soportado",
      });
    }

    await client.query("COMMIT");

    res.json({
      mensaje: "Importacion completada",
      insertados,
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  } finally {

    client.release();

  }
  }
);

/* =========================
   CONSULTA SAT / NIT
========================= */

app.get(
  "/sat/consulta-nit/:nit",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    const nit = String(req.params.nit || "").trim().toUpperCase();

    if (!nit || nit === "CF") {
      return res.json({
        nit: "CF",
        nombre: "CONSUMIDOR FINAL",
        direccion: "CIUDAD",
        fuente: "sistema",
      });
    }

    return res.status(501).json({
      error:
        "SAT no ofrece en el portal publico una consulta automatizable NIT a nombre/direccion. Debe integrarse por certificador FEL o servicio autorizado.",
      codigo: "SAT_CONSULTA_NO_DISPONIBLE",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message,
    });
  }
  }
);

/* =========================
   CLIENTES
========================= */

app.get(
  "/clientes",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    await asegurarColumnasClientes();

    const empresaId = obtenerEmpresaId(req);
    const soloActivos = req.query.activos === "1";

    const result = await db.query(
      `
      SELECT *
      FROM clientes
      WHERE empresa_id = $1
      ${soloActivos ? "AND estado = 'activo'" : ""}
      ORDER BY id DESC
      `,
      [empresaId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo clientes",
    });
  }
  }
);

app.get(
  "/clientes/cumpleaneros/hoy",
  verificarToken,
  permitirRoles("admin", "cajero", "compras", "inventario", "cocina"),
  async (req, res) => {
  try {
    await asegurarColumnasClientes();

    const empresaId = obtenerEmpresaId(req);

    const result = await db.query(
      `
      SELECT
        id,
        codigo,
        nombre,
        nit,
        telefono,
        correo,
        fecha_cumpleanos
      FROM clientes
      WHERE empresa_id = $1
      AND estado = 'activo'
      AND fecha_cumpleanos IS NOT NULL
      AND EXTRACT(MONTH FROM fecha_cumpleanos) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM fecha_cumpleanos) = EXTRACT(DAY FROM CURRENT_DATE)
      ORDER BY nombre ASC
      `,
      [empresaId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo cumpleaneros",
    });
  }
  }
);

app.post(
  "/clientes",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  const client = await db.connect();

  try {
    await asegurarColumnasClientes();

    const {
      nombre,
      nit,
      direccion,
      telefono,
      correo,
      fecha_cumpleanos,
      permite_credito,
      limite_credito,
      saldo_favor,
      estado,
    } = req.body;

    const empresaId = obtenerEmpresaId(req);
    const nombreFinal = String(nombre || "").trim();

    if (!nombreFinal) {
      return res.status(400).json({
        error: "El nombre del cliente es requerido",
      });
    }

    await client.query("BEGIN");

    const codigoResult = await client.query(
      `
      SELECT
        COALESCE(
          MAX(
            NULLIF(
              regexp_replace(codigo, '^CLI-' || $1::TEXT || '-', ''),
              ''
            )::INTEGER
          ),
          0
        ) + 1 AS correlativo
      FROM clientes
      WHERE empresa_id = $1::INTEGER
      AND codigo LIKE 'CLI-' || $1::TEXT || '-%'
      `,
      [empresaId]
    );

    const correlativo = String(codigoResult.rows[0].correlativo).padStart(6, "0");
    const codigo = `CLI-${empresaId}-${correlativo}`;

    const result = await client.query(
      `
      INSERT INTO clientes
      (
        codigo,
        nombre,
        nit,
        direccion,
        telefono,
        correo,
        fecha_cumpleanos,
        permite_credito,
        limite_credito,
        saldo_favor,
        saldo_pendiente,
        estado,
        usuario_id,
        empresa_id
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12,$13)
      RETURNING *
      `,
      [
        codigo,
        nombreFinal,
        nit || "",
        direccion || "",
        telefono || "",
        correo || "",
        fecha_cumpleanos || null,
        Boolean(permite_credito),
        Number(limite_credito || 0),
        Number(saldo_favor || 0),
        estado === "bloqueado" ? "bloqueado" : "activo",
        req.user.id,
        empresaId,
      ]
    );

    if (Number(saldo_favor || 0) > 0) {
      await client.query(
        `
        INSERT INTO clientes_movimientos
        (
          cliente_id,
          tipo,
          monto,
          motivo,
          saldo_favor_anterior,
          saldo_favor_nuevo,
          saldo_pendiente_anterior,
          saldo_pendiente_nuevo,
          usuario_id,
          empresa_id
        )
        VALUES
        ($1,'saldo_favor',$2,'Saldo inicial',0,$2,0,0,$3,$4)
        `,
        [
          result.rows[0].id,
          Number(saldo_favor || 0),
          req.user.id,
          empresaId,
        ]
      );
    }

    await client.query("COMMIT");

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      error: error.message,
    });
  } finally {
    client.release();
  }
  }
);

app.post(
  "/clientes/importar",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  const client = await db.connect();

  try {
    await asegurarColumnasClientes();

    const { filas } = req.body;
    const empresaId = obtenerEmpresaId(req);

    if (!empresaId) {
      return res.status(400).json({
        error: "Empresa no valida",
      });
    }

    if (!Array.isArray(filas) || filas.length === 0) {
      return res.status(400).json({
        error: "No hay clientes validos para importar",
      });
    }

    const parseBoolean = (valor) => {
      const texto = String(valor || "").trim().toLowerCase();
      return ["1", "si", "sí", "true", "activo", "yes"].includes(texto);
    };

    await client.query("BEGIN");

    const codigoResult = await client.query(
      `
      SELECT
        COALESCE(
          MAX(
            NULLIF(
              regexp_replace(codigo, '^CLI-' || $1::TEXT || '-', ''),
              ''
            )::INTEGER
          ),
          0
        ) AS ultimo
      FROM clientes
      WHERE empresa_id = $1::INTEGER
      AND codigo LIKE 'CLI-' || $1::TEXT || '-%'
      `,
      [empresaId]
    );

    let correlativoActual = Number(codigoResult.rows[0].ultimo || 0);
    let insertados = 0;

    for (const fila of filas) {
      const nombreFinal = String(fila.nombre || "").trim();

      if (!nombreFinal) continue;

      const limiteCredito = Number(fila.limite_credito || 0);
      const saldoFavor = Number(fila.saldo_favor || 0);
      const estado =
        String(fila.estado || "activo").trim().toLowerCase() === "bloqueado"
          ? "bloqueado"
          : "activo";

      correlativoActual += 1;
      const codigo = `CLI-${empresaId}-${String(correlativoActual).padStart(6, "0")}`;

      const result = await client.query(
        `
        INSERT INTO clientes
        (
          codigo,
          nombre,
          nit,
          direccion,
          telefono,
          correo,
          fecha_cumpleanos,
          permite_credito,
          limite_credito,
          saldo_favor,
          saldo_pendiente,
          estado,
          usuario_id,
          empresa_id
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12,$13)
        RETURNING *
        `,
        [
          codigo,
          nombreFinal,
          fila.nit || "",
          fila.direccion || "",
          fila.telefono || "",
          fila.correo || fila.email || "",
          fila.fecha_cumpleanos || fila.cumpleanos || null,
          parseBoolean(fila.permite_credito),
          Number.isFinite(limiteCredito) ? limiteCredito : 0,
          Number.isFinite(saldoFavor) ? saldoFavor : 0,
          estado,
          req.user.id,
          empresaId,
        ]
      );

      if (Number.isFinite(saldoFavor) && saldoFavor > 0) {
        await client.query(
          `
          INSERT INTO clientes_movimientos
          (
            cliente_id,
            tipo,
            monto,
            motivo,
            saldo_favor_anterior,
            saldo_favor_nuevo,
            saldo_pendiente_anterior,
            saldo_pendiente_nuevo,
            usuario_id,
            empresa_id
          )
          VALUES
          ($1,'saldo_favor',$2,'Saldo inicial por carga masiva',0,$2,0,0,$3,$4)
          `,
          [
            result.rows[0].id,
            saldoFavor,
            req.user.id,
            empresaId,
          ]
        );
      }

      insertados += 1;
    }

    await client.query("COMMIT");

    res.json({
      mensaje: "Clientes importados correctamente",
      insertados,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      error: error.message,
    });
  } finally {
    client.release();
  }
  }
);

app.put(
  "/clientes/:id",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    await asegurarColumnasClientes();

    const empresaId = obtenerEmpresaId(req);
    const {
      nombre,
      nit,
      direccion,
      telefono,
      correo,
      fecha_cumpleanos,
      permite_credito,
      limite_credito,
      estado,
    } = req.body;

    const result = await db.query(
      `
      UPDATE clientes
      SET
        nombre = $1,
        nit = $2,
        direccion = $3,
        telefono = $4,
        correo = $5,
        fecha_cumpleanos = $6,
        permite_credito = $7,
        limite_credito = $8,
        estado = $9
      WHERE id = $10
      AND empresa_id = $11
      RETURNING *
      `,
      [
        String(nombre || "").trim(),
        nit || "",
        direccion || "",
        telefono || "",
        correo || "",
        fecha_cumpleanos || null,
        Boolean(permite_credito),
        Number(limite_credito || 0),
        estado === "bloqueado" ? "bloqueado" : "activo",
        req.params.id,
        empresaId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Cliente no encontrado",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message,
    });
  }
  }
);

app.get(
  "/clientes/:id/movimientos",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);

    const result = await db.query(
      `
      SELECT
        cm.*,
        u.nombre AS usuario_nombre
      FROM clientes_movimientos cm
      LEFT JOIN usuarios u ON u.id = cm.usuario_id
      WHERE cm.cliente_id = $1
      AND cm.empresa_id = $2
      ORDER BY cm.fecha DESC, cm.id DESC
      `,
      [
        req.params.id,
        empresaId,
      ]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo historial del cliente",
    });
  }
  }
);

app.get(
  "/clientes/creditos-pendientes",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);

    const result = await db.query(
      `
      SELECT
        v.id,
        v.fecha,
        v.total,
        v.cliente_id,
        COALESCE(c.nombre, v.cliente_nombre, 'Cliente') AS cliente_nombre,
        c.codigo AS cliente_codigo,
        COALESCE(
          json_agg(
            json_build_object(
              'producto_id', dv.producto_id,
              'nombre', COALESCE(dv.descripcion, p.nombre),
              'cantidad', dv.cantidad,
              'precio', dv.precio,
              'observacion', COALESCE(dv.observacion, ''),
              'complementos', COALESCE(dv.complementos, '[]'::jsonb)
            )
            ORDER BY dv.id
          ) FILTER (WHERE dv.id IS NOT NULL),
          '[]'
        ) AS detalle
      FROM ventas v
      LEFT JOIN clientes c
        ON c.id = v.cliente_id
      LEFT JOIN detalle_ventas dv
        ON dv.venta_id = v.id
      LEFT JOIN productos p
        ON p.id = dv.producto_id
      WHERE v.empresa_id = $1
      AND v.tipo_comprobante = 'Credito'
      AND COALESCE(v.estado_cuenta, 'pendiente') = 'pendiente'
      AND COALESCE(v.estado, 'activa') <> 'anulada'
      GROUP BY v.id, c.id
      ORDER BY v.fecha ASC, v.id ASC
      `,
      [empresaId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo creditos pendientes",
    });
  }
  }
);

app.delete(
  "/clientes/:id",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  const client = await db.connect();

  try {
    const empresaId = obtenerEmpresaId(req);
    const clienteId = req.params.id;

    await client.query("BEGIN");

    const clienteResult = await client.query(
      `
      SELECT *
      FROM clientes
      WHERE id = $1
      AND empresa_id = $2
      FOR UPDATE
      `,
      [
        clienteId,
        empresaId,
      ]
    );

    if (clienteResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Cliente no encontrado",
      });
    }

    const cliente = clienteResult.rows[0];

    const usoResult = await client.query(
      `
      SELECT
        (
          SELECT COUNT(*)
          FROM clientes_movimientos
          WHERE cliente_id = $1
          AND empresa_id = $2
        ) AS movimientos,
        (
          SELECT COUNT(*)
          FROM ventas
          WHERE cliente_id = $1
          AND empresa_id = $2
        ) AS ventas
      `,
      [
        clienteId,
        empresaId,
      ]
    );

    const tieneHistorial =
      Number(usoResult.rows[0].movimientos || 0) > 0 ||
      Number(usoResult.rows[0].ventas || 0) > 0 ||
      Number(cliente.saldo_favor || 0) > 0 ||
      Number(cliente.saldo_pendiente || 0) > 0;

    if (tieneHistorial) {
      const result = await client.query(
        `
        UPDATE clientes
        SET estado = 'bloqueado'
        WHERE id = $1
        AND empresa_id = $2
        RETURNING *
        `,
        [
          clienteId,
          empresaId,
        ]
      );

      await client.query("COMMIT");

      return res.json({
        mensaje: "Cliente retirado de la lista activa. Se conservo bloqueado por tener historial o saldos.",
        cliente: result.rows[0],
        accion: "bloqueado",
      });
    }

    await client.query(
      `
      DELETE FROM clientes
      WHERE id = $1
      AND empresa_id = $2
      `,
      [
        clienteId,
        empresaId,
      ]
    );

    await client.query("COMMIT");

    res.json({
      mensaje: "Cliente eliminado",
      accion: "eliminado",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      error: error.message,
    });
  } finally {
    client.release();
  }
  }
);

/* =========================
   PRODUCTOS
========================= */

const normalizarSubgruposVisibles = (subgrupos, opcionPadre) => {
  const grupos = Array.isArray(subgrupos) ? subgrupos : [];
  const gruposConOpciones = grupos.filter(
    (grupo) => Array.isArray(grupo.opciones) && grupo.opciones.length > 0
  );
  const gruposSinOpciones = grupos.filter(
    (grupo) => !Array.isArray(grupo.opciones) || grupo.opciones.length === 0
  );

  if (gruposSinOpciones.length === 0) {
    return gruposConOpciones;
  }

  return [
    {
      id: `subopciones-${opcionPadre.id}`,
      producto_id: opcionPadre.producto_id || null,
      empresa_id: opcionPadre.empresa_id || null,
      parent_opcion_id: opcionPadre.id,
      nombre: `Opciones de ${opcionPadre.nombre}`,
      obligatorio: true,
      seleccion_multiple: false,
      minimo: 1,
      maximo: 1,
      orden: 0,
      opciones: gruposSinOpciones.map((grupo, index) => ({
        id: `subopcion-${grupo.id}`,
        grupo_id: `subopciones-${opcionPadre.id}`,
        nombre: grupo.nombre,
        precio_extra: 0,
        orden: index,
        activo: true,
        subgrupos: [],
      })),
    },
    ...gruposConOpciones,
  ];
};

const construirArbolComplementos = (gruposRows, opcionesRows) => {
  const gruposConOpciones = gruposRows.map((grupo) => ({
    ...grupo,
    opciones: opcionesRows
      .filter((opcion) => opcion.grupo_id === grupo.id)
      .map((opcion) => ({
        ...opcion,
        subgrupos: [],
      })),
  }));

  const gruposPorParent = new Map();

  gruposConOpciones.forEach((grupo) => {
    if (!grupo.parent_opcion_id) return;

    const lista = gruposPorParent.get(grupo.parent_opcion_id) || [];
    lista.push(grupo);
    gruposPorParent.set(grupo.parent_opcion_id, lista);
  });

  gruposConOpciones.forEach((grupo) => {
    grupo.opciones = grupo.opciones.map((opcion) => ({
      ...opcion,
      subgrupos: gruposPorParent.get(opcion.id) || [],
    }));
  });

  return gruposConOpciones.filter((grupo) => !grupo.parent_opcion_id);
};

const normalizarOpcionesComplemento = (opciones = []) =>
  opciones.map((opcion) => ({
    ...opcion,
    subgrupos: normalizarSubgruposVisibles(opcion.subgrupos, opcion).map(
      (subgrupo) => ({
        ...subgrupo,
        opciones: normalizarOpcionesComplemento(subgrupo.opciones || []),
      })
    ),
  }));

app.get(
  "/complementos/grupos",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const productoExcluirId = req.query.producto_id
      ? Number(req.query.producto_id)
      : null;

    const grupos = await db.query(
      `
      SELECT
        cg.*,
        p.nombre AS producto_nombre
      FROM complemento_grupos cg
      INNER JOIN productos p
        ON p.id = cg.producto_id
       AND p.empresa_id = cg.empresa_id
      WHERE cg.empresa_id = $1
      AND cg.activo = TRUE
      AND ($2::INTEGER IS NULL OR cg.producto_id <> $2::INTEGER)
      ORDER BY LOWER(cg.nombre), cg.producto_id, cg.orden ASC, cg.id ASC
      `,
      [empresaId, productoExcluirId]
    );

    const opciones = await db.query(
      `
      SELECT o.*
      FROM complemento_opciones o
      INNER JOIN complemento_grupos g
        ON g.id = o.grupo_id
      WHERE g.empresa_id = $1
      AND g.activo = TRUE
      AND o.activo = TRUE
      AND ($2::INTEGER IS NULL OR g.producto_id <> $2::INTEGER)
      ORDER BY o.orden ASC, o.id ASC
      `,
      [empresaId, productoExcluirId]
    );

    res.json(construirArbolComplementos(grupos.rows, opciones.rows));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo grupos de complementos",
    });
  }
  }
);

app.get(
  "/productos/:id/complementos",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = obtenerEmpresaId(req);

    const producto = await db.query(
      `
      SELECT id
      FROM productos
      WHERE id = $1
      AND empresa_id = $2
      `,
      [id, empresaId]
    );

    if (producto.rows.length === 0) {
      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    const grupos = await db.query(
      `
      SELECT *
      FROM complemento_grupos
      WHERE producto_id = $1
      AND empresa_id = $2
      AND activo = TRUE
      ORDER BY orden ASC, id ASC
      `,
      [id, empresaId]
    );

    const opciones = await db.query(
      `
      SELECT o.*
      FROM complemento_opciones o
      INNER JOIN complemento_grupos g
        ON g.id = o.grupo_id
      WHERE g.producto_id = $1
      AND g.empresa_id = $2
      AND o.activo = TRUE
      ORDER BY o.orden ASC, o.id ASC
      `,
      [id, empresaId]
    );

    const gruposConOpciones = construirArbolComplementos(
      grupos.rows,
      opciones.rows
    );

    gruposConOpciones.forEach((grupo) => {
      grupo.opciones = normalizarOpcionesComplemento(grupo.opciones);
    });

    res.json(gruposConOpciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo complementos",
    });
  }
  }
);

app.post(
  "/productos/:id/complementos",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  const client = await db.connect();

  try {
    const { id } = req.params;
    const empresaId = obtenerEmpresaId(req);
    const grupos = Array.isArray(req.body.grupos)
      ? req.body.grupos
      : [];

    const producto = await client.query(
      `
      SELECT id
      FROM productos
      WHERE id = $1
      AND empresa_id = $2
      `,
      [id, empresaId]
    );

    if (producto.rows.length === 0) {
      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    await client.query("BEGIN");

    await client.query(
      `
      DELETE FROM complemento_grupos
      WHERE producto_id = $1
      AND empresa_id = $2
      `,
      [id, empresaId]
    );

    const guardarGrupo = async (grupo, indiceGrupo, parentOpcionId = null) => {
      const nombreGrupo = String(grupo.nombre || "").trim();

      if (!nombreGrupo) return;

      const opciones = Array.isArray(grupo.opciones)
        ? grupo.opciones
        : [];

      const grupoResult = await client.query(
        `
        INSERT INTO complemento_grupos
        (
          producto_id,
          empresa_id,
          parent_opcion_id,
          nombre,
          obligatorio,
          seleccion_multiple,
          minimo,
          maximo,
          orden
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id
        `,
        [
          id,
          empresaId,
          parentOpcionId,
          nombreGrupo,
          grupo.obligatorio !== false,
          grupo.seleccion_multiple === true,
          Number(grupo.minimo || 1),
          Number(grupo.maximo || 1),
          indiceGrupo,
        ]
      );

      for (let indiceOpcion = 0; indiceOpcion < opciones.length; indiceOpcion++) {
        const opcion = opciones[indiceOpcion];
        const nombreOpcion = String(opcion.nombre || "").trim();

        if (!nombreOpcion) continue;

        const opcionResult = await client.query(
          `
          INSERT INTO complemento_opciones
          (
            grupo_id,
            nombre,
            precio_extra,
            orden
          )
          VALUES
          ($1,$2,$3,$4)
          RETURNING id
          `,
          [
            grupoResult.rows[0].id,
            nombreOpcion,
            Number(opcion.precio_extra || 0),
            indiceOpcion,
          ]
        );

        const subgrupos = Array.isArray(opcion.subgrupos)
          ? opcion.subgrupos
          : [];

        for (let indiceSubgrupo = 0; indiceSubgrupo < subgrupos.length; indiceSubgrupo++) {
          await guardarGrupo(
            subgrupos[indiceSubgrupo],
            indiceSubgrupo,
            opcionResult.rows[0].id
          );
        }
      }
    };

    for (let indiceGrupo = 0; indiceGrupo < grupos.length; indiceGrupo++) {
      await guardarGrupo(grupos[indiceGrupo], indiceGrupo);
    }

    await client.query("COMMIT");

    res.json({
      mensaje: "Complementos guardados",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      error: error.message || "Error guardando complementos",
    });
  } finally {
    client.release();
  }
  }
);

app.get(
  "/productos",
  verificarToken,
  permitirRoles("admin", "cajero", "compras", "inventario"),
  async (req, res) => {

  try {

    const empresaId = obtenerEmpresaId(req);

    const result = await db.query(
      `
      SELECT *
      FROM productos
      WHERE empresa_id = $1
      ORDER BY id DESC
      `,
      [empresaId]
    );

    res.json(result.rows);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error obteniendo productos",
    });
  }
  }
);

app.post(
  "/productos",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {

  try {

    const {
      codigo,
      upc,
      nombre,
      precio,
      precio_costo,
      margen,
      marca,
      imagen_url,
      existencia,
      existencia_minima,
      habilitado_venta,
      controla_stock,
      tipo_producto,
      se_fabrica,
      numero_serie,
      medida_compra,
      equivalente_inventario,
      medida_inventario,
      departamento,
      subcategoria,
      familia,
      cuenta_contable,
      centro_costo,
      categoria,
    } = req.body;

    const empresaIdFinal = obtenerEmpresaId(req);

    const precioFinal =
      precio === "" ? 0 : Number(precio);

    const costoFinal =
      precio_costo === "" ? 0 : Number(precio_costo);

    const margenFinal =
      margen === "" ? 0 : Number(margen);

    const existenciaFinal =
      existencia === "" ? 0 : Number(existencia);

    const existenciaMinimaFinal =
      existencia_minima === ""
        ? 0
        : Number(existencia_minima);

    const result = await db.query(
      `
      INSERT INTO productos
        (
          codigo,
          upc,
          nombre,
          precio,
          precio_costo,
          margen,
          marca,
          imagen_url,
          existencia,
          existencia_minima,
          habilitado_venta,
          controla_stock,
          tipo_producto,
          se_fabrica,
          numero_serie,
          medida_compra,
          equivalente_inventario,
          medida_inventario,
          departamento,
          subcategoria,
          familia,
          cuenta_contable,
          centro_costo,
          categoria,
          empresa_id
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
        )
        RETURNING *
      `,
      [
        codigo,
        upc,
        nombre,
        precioFinal,
        costoFinal,
        margenFinal,
        marca,
        imagen_url || "",
        existenciaFinal,
        existenciaMinimaFinal,
        habilitado_venta,
        controla_stock !== false,
        tipo_producto || "producto",
        se_fabrica === true,
        numero_serie || "",
        medida_compra || "",
        equivalente_inventario === "" ||
          equivalente_inventario === undefined
          ? 1
          : Number(equivalente_inventario),
        medida_inventario || "",
        departamento || "",
        subcategoria || "",
        familia || "",
        cuenta_contable || "",
        centro_costo || "",
        categoria,
        empresaIdFinal,
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error creando producto",
    });
  }
  }
);

/* =========================
   EDITAR PRODUCTO
========================= */

app.put(
  "/productos/:id",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {

  try {

    const { id } = req.params;

    const {
      codigo,
      upc,
      nombre,
      precio,
      precio_costo,
      marca,
      imagen_url,
      existencia,
      existencia_minima,
      habilitado_venta,
      controla_stock,
      tipo_producto,
      se_fabrica,
      numero_serie,
      medida_compra,
      equivalente_inventario,
      medida_inventario,
      departamento,
      subcategoria,
      familia,
      cuenta_contable,
      centro_costo,
      categoria,
    } = req.body;

    const empresaIdFinal = obtenerEmpresaId(req);

    const precioFinal =
      precio === "" ? 0 : Number(precio);

    const costoFinal =
      precio_costo === "" ? 0 : Number(precio_costo);

    const existenciaFinal =
      existencia === "" ? 0 : Number(existencia);

    const existenciaMinimaFinal =
      existencia_minima === ""
        ? 0
        : Number(existencia_minima);

    const result = await db.query(
      `
      UPDATE productos
      SET
        codigo = $1,
        upc = $2,
        nombre = $3,
        precio = $4,
        precio_costo = $5,
        marca = $6,
        imagen_url = $7,
        existencia = $8,
        existencia_minima = $9,
        habilitado_venta = $10,
        controla_stock = $11,
        tipo_producto = $12,
        se_fabrica = $13,
        numero_serie = $14,
        medida_compra = $15,
        equivalente_inventario = $16,
        medida_inventario = $17,
        departamento = $18,
        subcategoria = $19,
        familia = $20,
        cuenta_contable = $21,
        centro_costo = $22,
        categoria = $23,
        empresa_id = $24
      WHERE id = $25
      AND empresa_id = $24
      RETURNING *
      `,
      [
        codigo,
        upc,
        nombre,
        precioFinal,
        costoFinal,
        marca,
        imagen_url || "",
        existenciaFinal,
        existenciaMinimaFinal,
        habilitado_venta,
        controla_stock !== false,
        tipo_producto || "producto",
        se_fabrica === true,
        numero_serie || "",
        medida_compra || "",
        equivalente_inventario === "" ||
          equivalente_inventario === undefined
          ? 1
          : Number(equivalente_inventario),
        medida_inventario || "",
        departamento || "",
        subcategoria || "",
        familia || "",
        cuenta_contable || "",
        centro_costo || "",
        categoria,
        empresaIdFinal,
        id,
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error actualizando producto",
    });

  }

  }
);

app.patch(
  "/productos/:id/habilitado-venta",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {

  try {

    const { id } = req.params;
    const { habilitado_venta } = req.body;

    const result = await db.query(
      `
      UPDATE productos
      SET habilitado_venta = $1
      WHERE id = $2
      AND empresa_id = $3
      RETURNING *
      `,
      [
        habilitado_venta === true,
        id,
        obtenerEmpresaId(req),
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error actualizando disponibilidad",
    });
  }
  }
);

/* =========================
   ELIMINAR PRODUCTO
========================= */

app.delete(
  "/productos/:id",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {

  try {

    const { id } = req.params;

    await db.query(
      `
      DELETE FROM productos
      WHERE id = $1
      AND empresa_id = $2
      `,
      [
        id,
        obtenerEmpresaId(req),
      ]
    );

    res.json({
      mensaje: "Producto eliminado",
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error eliminando producto",
    });
  }
  }
);

/* =========================
   MOVIMIENTOS INVENTARIO
========================= */

app.post(
  "/inventario/movimiento",
  verificarToken,
  permitirRoles("admin", "inventario"),
  async (req, res) => {

  const client = await db.connect();

  try {

    const {
      producto_id,
      tipo,
      cantidad,
      motivo,
      empresa_id,
      permitir_negativo,
    } = req.body;

    const tiposValidos = [
      "entrada",
      "salida",
      "ajuste",
      "merma",
    ];

    const cantidadFinal = Number(cantidad);
    const empresaIdFinal = obtenerEmpresaId(req);

    if (!producto_id || !tiposValidos.includes(tipo)) {
      return res.status(400).json({
        error: "Datos de movimiento invalidos",
      });
    }

    if (
      !Number.isFinite(cantidadFinal) ||
      cantidadFinal < 0
    ) {
      return res.status(400).json({
        error: "Cantidad invalida",
      });
    }

    await client.query("BEGIN");

    const productoResult = await client.query(
      `
      SELECT id, nombre, existencia
      FROM productos
      WHERE id = $1
      AND empresa_id = $2
      FOR UPDATE
      `,
      [
        producto_id,
        empresaIdFinal,
      ]
    );

    if (productoResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    const productoActual = productoResult.rows[0];
    const existenciaActual = Number(productoActual.existencia || 0);
    const dejaStockNegativo =
      (tipo === "salida" || tipo === "merma") &&
      existenciaActual - cantidadFinal < 0;
    const autorizaNegativo =
      req.user.rol === "admin" && permitir_negativo === true;

    if (dejaStockNegativo && !autorizaNegativo) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error: `Stock insuficiente para ${productoActual.nombre}. Existencia actual: ${existenciaActual}`,
      });
    }

    await client.query(
      `
      INSERT INTO movimientos_inventario
      (
        producto_id,
        tipo,
        cantidad,
        motivo,
        usuario_id,
        empresa_id
      )
      VALUES
      ($1,$2,$3,$4,$5,$6)
      `,
      [
        producto_id,
        tipo,
        cantidadFinal,
        motivo,
        req.user.id,
        empresaIdFinal,
      ]
    );

    if (tipo === "entrada") {

      await client.query(
        `
        UPDATE productos
        SET existencia = existencia + $1
        WHERE id = $2
        AND empresa_id = $3
        `,
        [
          cantidadFinal,
          producto_id,
          empresaIdFinal,
        ]
      );

    }

    if (
      tipo === "salida" ||
      tipo === "merma"
    ) {

      await client.query(
        `
        UPDATE productos
        SET existencia = existencia - $1
        WHERE id = $2
        AND empresa_id = $3
        `,
        [
          cantidadFinal,
          producto_id,
          empresaIdFinal,
        ]
      );

    }

    if (tipo === "ajuste") {

      await client.query(
        `
        UPDATE productos
        SET existencia = $1
        WHERE id = $2
        AND empresa_id = $3
        `,
        [
          cantidadFinal,
          producto_id,
          empresaIdFinal,
        ]
      );

    }

    await client.query("COMMIT");

    res.json({
      mensaje: "Movimiento registrado",
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.log(error);

    res.status(500).json({
      error: "Error registrando movimiento",
    });

  } finally {

    client.release();

  }

  }
);

app.get(
  "/inventario/movimientos",
  verificarToken,
  permitirRoles("admin", "inventario"),
  async (req, res) => {

  try {

    const empresaId = obtenerEmpresaId(req);

    const result = await db.query(
      `
      SELECT
        mi.id,
        mi.producto_id,
        mi.tipo,
        mi.cantidad,
        mi.motivo,
        mi.fecha,
        mi.usuario_id,
        mi.empresa_id,
        p.nombre AS producto,
        u.nombre AS usuario
      FROM movimientos_inventario mi
      LEFT JOIN productos p
        ON p.id = mi.producto_id
      LEFT JOIN usuarios u
        ON u.id = mi.usuario_id
      WHERE mi.empresa_id = $1
      ORDER BY mi.fecha DESC
      LIMIT 500
      `,
      [empresaId]
    );

    res.json(result.rows);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error obteniendo movimientos",
    });

  }

  }
);

/* =========================
   COMPRAS / PROVEEDORES
========================= */

app.get(
  "/proveedores",
  verificarToken,
  permitirRoles("admin", "compras"),
  async (req, res) => {

  try {

    const empresaId = obtenerEmpresaId(req);

    const result = await db.query(
      `
      SELECT *
      FROM proveedores
      WHERE empresa_id = $1
      ORDER BY nombre ASC
      `,
      [empresaId]
    );

    res.json(result.rows);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error obteniendo proveedores",
    });
  }
  }
);

app.post(
  "/proveedores",
  verificarToken,
  permitirRoles("admin", "compras"),
  async (req, res) => {

  try {

    const {
      nombre,
      telefono,
      email,
      direccion,
      empresa_id,
    } = req.body;

    const empresaId = obtenerEmpresaId(req);

    if (!nombre) {
      return res.status(400).json({
        error: "Nombre de proveedor requerido",
      });
    }

    const result = await db.query(
      `
      INSERT INTO proveedores
      (
        nombre,
        telefono,
        email,
        direccion,
        empresa_id
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        nombre,
        telefono || "",
        email || "",
        direccion || "",
        empresaId,
      ]
    );

    await asegurarVersionEmpresa(result.rows[0].id);

    res.json(result.rows[0]);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error creando proveedor",
    });
  }
  }
);

app.put(
  "/proveedores/:id",
  verificarToken,
  permitirRoles("admin", "compras"),
  async (req, res) => {

  try {

    const { id } = req.params;
    const {
      nombre,
      telefono,
      email,
      direccion,
    } = req.body;
    const empresaId = obtenerEmpresaId(req);

    if (!nombre) {
      return res.status(400).json({
        error: "Nombre de proveedor requerido",
      });
    }

    const result = await db.query(
      `
      UPDATE proveedores
      SET
        nombre = $1,
        telefono = $2,
        email = $3,
        direccion = $4
      WHERE id = $5
      AND empresa_id = $6
      RETURNING *
      `,
      [
        nombre,
        telefono || "",
        email || "",
        direccion || "",
        id,
        empresaId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Proveedor no encontrado",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error actualizando proveedor",
    });
  }
  }
);

app.get(
  "/proveedores/:id/compras",
  verificarToken,
  permitirRoles("admin", "compras"),
  async (req, res) => {

  try {

    const { id } = req.params;
    const empresaId = obtenerEmpresaId(req);

    const proveedorResult = await db.query(
      `
      SELECT *
      FROM proveedores
      WHERE id = $1
      AND empresa_id = $2
      `,
      [
        id,
        empresaId,
      ]
    );

    if (proveedorResult.rows.length === 0) {
      return res.status(404).json({
        error: "Proveedor no encontrado",
      });
    }

    const comprasResult = await db.query(
      `
      SELECT
        c.id,
        c.documento,
        c.total,
        c.fecha,
        c.usuario_id,
        c.proveedor_id,
        u.nombre AS usuario
      FROM compras c
      LEFT JOIN usuarios u
        ON u.id = c.usuario_id
      WHERE c.proveedor_id = $1
      AND c.empresa_id = $2
      ORDER BY c.fecha DESC
      LIMIT 100
      `,
      [
        id,
        empresaId,
      ]
    );

    res.json({
      proveedor: proveedorResult.rows[0],
      compras: comprasResult.rows,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error obteniendo historial del proveedor",
    });
  }
  }
);

app.post(
  "/compras",
  verificarToken,
  permitirRoles("admin", "compras"),
  async (req, res) => {

  const client = await db.connect();

  try {

    const {
      proveedor_id,
      proveedor_nombre,
      documento,
      productos,
      empresa_id,
    } = req.body;

    const empresaId = obtenerEmpresaId(req);

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        error: "Compra sin productos",
      });
    }

    await client.query("BEGIN");

    let proveedorId = proveedor_id || null;

    if (!proveedorId && proveedor_nombre) {
      const proveedorResult = await client.query(
        `
        INSERT INTO proveedores(nombre, empresa_id)
        VALUES($1,$2)
        RETURNING *
        `,
        [
          proveedor_nombre,
          empresaId,
        ]
      );

      proveedorId = proveedorResult.rows[0].id;
    }

    let total = 0;
    const lineas = [];

    for (const item of productos) {

      const productoId = item.producto_id;
      const cantidad = Number(item.cantidad);
      const costoUnitario = Number(item.costo_unitario);

      if (
        !productoId ||
        !Number.isFinite(cantidad) ||
        cantidad <= 0 ||
        !Number.isFinite(costoUnitario) ||
        costoUnitario < 0
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: "Datos invalidos en detalle de compra",
        });
      }

      const productoResult = await client.query(
        `
        SELECT id, nombre
        FROM productos
        WHERE id = $1
        AND empresa_id = $2
        FOR UPDATE
        `,
        [
          productoId,
          empresaId,
        ]
      );

      if (productoResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          error: "Producto no encontrado en compra",
        });
      }

      const subtotal = cantidad * costoUnitario;

      total += subtotal;
      lineas.push({
        producto: productoResult.rows[0],
        cantidad,
        costoUnitario,
        subtotal,
      });
    }

    const compraResult = await client.query(
      `
      INSERT INTO compras
      (
        proveedor_id,
        documento,
        total,
        usuario_id,
        empresa_id
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        proveedorId,
        documento || "",
        total,
        req.user.id,
        empresaId,
      ]
    );

    const compra = compraResult.rows[0];

    for (const linea of lineas) {

      await client.query(
        `
        INSERT INTO compra_detalle
        (
          compra_id,
          producto_id,
          cantidad,
          costo_unitario,
          subtotal
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          compra.id,
          linea.producto.id,
          linea.cantidad,
          linea.costoUnitario,
          linea.subtotal,
        ]
      );

      await client.query(
        `
        UPDATE productos
        SET
          existencia = existencia + $1,
          precio_costo = $2
        WHERE id = $3
        AND empresa_id = $4
        `,
        [
          linea.cantidad,
          linea.costoUnitario,
          linea.producto.id,
          empresaId,
        ]
      );

      await client.query(
        `
        INSERT INTO movimientos_inventario
        (
          producto_id,
          tipo,
          cantidad,
          motivo,
          usuario_id,
          empresa_id
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          linea.producto.id,
          "entrada",
          linea.cantidad,
          `Compra #${compra.id}${documento ? ` - Doc. ${documento}` : ""}`,
          req.user.id,
          empresaId,
        ]
      );
    }

    if (redondearMoneda(total) > 0) {
      await registrarPartidaContable(client, {
        empresaId,
        usuarioId: req.user.id,
        descripcion: `Compra #${compra.id}${documento ? ` - ${documento}` : ""}`,
        origen: "compra",
        referenciaId: compra.id,
        referenciaCodigo: `COMPRA-${compra.id}`,
        lineas: [
          {
            cuenta: "104",
            debe: total,
            descripcion: `Ingreso de inventario compra #${compra.id}`,
          },
          {
            cuenta: "201",
            haber: total,
            descripcion: `Cuenta por pagar compra #${compra.id}`,
          },
        ],
      });
    }

    await client.query("COMMIT");

    res.json({
      ...compra,
      total,
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.log(error);

    res.status(500).json({
      error: "Error registrando compra",
    });

  } finally {

    client.release();

  }
});

app.patch(
  "/empresas/:id/configuracion-pos",
  verificarToken,
  permitirRoles("superadmin"),
  async (req, res) => {

  try {
    const { id } = req.params;
    const {
      imprimir_factura_auto,
      imprimir_comanda_auto,
    } = req.body;

    const result = await db.query(
      `
      UPDATE empresas
      SET
        imprimir_factura_auto = $1,
        imprimir_comanda_auto = $2
      WHERE id = $3
      RETURNING *
      `,
      [
        imprimir_factura_auto === true,
        imprimir_comanda_auto === true,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Empresa no encontrada",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
  }
);

app.get(
  "/compras",
  verificarToken,
  permitirRoles("admin", "compras"),
  async (req, res) => {

  try {

    const empresaId = obtenerEmpresaId(req);

    const result = await db.query(
      `
      SELECT
        c.id,
        c.documento,
        c.total,
        c.fecha,
        c.usuario_id,
        c.proveedor_id,
        p.nombre AS proveedor,
        u.nombre AS usuario
      FROM compras c
      LEFT JOIN proveedores p
        ON p.id = c.proveedor_id
      LEFT JOIN usuarios u
        ON u.id = c.usuario_id
      WHERE c.empresa_id = $1
      ORDER BY c.fecha DESC
      LIMIT 50
      `,
      [empresaId]
    );

    res.json(result.rows);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error obteniendo compras",
    });
  }
});

app.get(
  "/compras/:id",
  verificarToken,
  permitirRoles("admin", "compras"),
  async (req, res) => {

  try {

    const { id } = req.params;
    const empresaId = obtenerEmpresaId(req);

    const compraResult = await db.query(
      `
      SELECT
        c.id,
        c.documento,
        c.total,
        c.fecha,
        c.usuario_id,
        c.proveedor_id,
        c.empresa_id,
        p.nombre AS proveedor,
        u.nombre AS usuario
      FROM compras c
      LEFT JOIN proveedores p
        ON p.id = c.proveedor_id
      LEFT JOIN usuarios u
        ON u.id = c.usuario_id
      WHERE c.id = $1
      AND c.empresa_id = $2
      `,
      [
        id,
        empresaId,
      ]
    );

    if (compraResult.rows.length === 0) {
      return res.status(404).json({
        error: "Compra no encontrada",
      });
    }

    const detalleResult = await db.query(
      `
      SELECT
        cd.id,
        cd.producto_id,
        cd.cantidad,
        cd.costo_unitario,
        cd.subtotal,
        p.nombre AS producto
      FROM compra_detalle cd
      LEFT JOIN productos p
        ON p.id = cd.producto_id
      WHERE cd.compra_id = $1
      ORDER BY cd.id ASC
      `,
      [id]
    );

    res.json({
      compra: compraResult.rows[0],
      detalle: detalleResult.rows,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error obteniendo detalle de compra",
    });
  }
});

/* =========================
   DEPARTAMENTOS
========================= */

app.get(
  "/departamentos",
  verificarToken,
  permitirRoles("admin", "cajero", "cocina"),
  async (req, res) => {

  try {

    const empresaId = obtenerEmpresaId(req);

    await asegurarDepartamentoBase(empresaId);

    const result = await db.query(
      `
      SELECT *
      FROM departamentos
      WHERE empresa_id = $1
      ORDER BY id DESC
      `,
      [empresaId]
    );

    res.json(result.rows);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error obteniendo departamentos",
    });
  }
});

app.post(
  "/departamentos",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {

  try {

    const { nombre } = req.body;
    const nombreLimpio = String(nombre || "").trim().toUpperCase();

    if (!nombreLimpio) {
      return res.status(400).json({
        error: "Nombre de departamento requerido",
      });
    }

    const result = await db.query(
      `
      INSERT INTO departamentos
      (
        nombre,
        empresa_id
      )
      VALUES ($1,$2)
      RETURNING *
      `,
      [
        nombreLimpio,
        obtenerEmpresaId(req),
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: error.code === "23505"
        ? "Ese departamento ya existe"
        : "Error creando departamento",
    });
  }
});

app.put(
  "/departamentos/:id",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {

  try {

    const { id } = req.params;
    const nombreLimpio = String(req.body.nombre || "").trim().toUpperCase();

    if (!nombreLimpio) {
      return res.status(400).json({
        error: "Nombre de departamento requerido",
      });
    }

    const result = await db.query(
      `
      UPDATE departamentos
      SET nombre = $1
      WHERE id = $2
      AND empresa_id = $3
      RETURNING *
      `,
      [
        nombreLimpio,
        id,
        obtenerEmpresaId(req),
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Departamento no encontrado",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: error.code === "23505"
        ? "Ese departamento ya existe"
        : "Error actualizando departamento",
    });
  }
});

app.delete(
  "/departamentos/:id",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {

  try {

    const { id } = req.params;

    const result = await db.query(
      `
      DELETE FROM departamentos
      WHERE id = $1
      AND empresa_id = $2
      RETURNING *
      `,
      [
        id,
        obtenerEmpresaId(req),
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Departamento no encontrado",
      });
    }

    res.json({
      mensaje: "Departamento eliminado",
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error eliminando departamento",
    });
  }
});

/* =========================
   CATEGORIAS
========================= */

app.get(
  "/categorias",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {

  try {

    const empresaId = obtenerEmpresaId(req);

    const result = await db.query(
      `
      SELECT *
      FROM categorias
      WHERE empresa_id = $1
      ORDER BY id DESC
      `,
      [empresaId]
    );

    res.json(result.rows);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error obteniendo categorías",
    });
  }
});

app.post(
  "/categorias",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {

  try {

    const {
      nombre,
      empresa_id,
    } = req.body;

    const empresaIdFinal = obtenerEmpresaId(req);

    const result = await db.query(
      `
      INSERT INTO categorias
      (
        nombre,
        empresa_id
      )
      VALUES ($1,$2)
      RETURNING *
      `,
      [
        nombre,
        empresaIdFinal,
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error creando categoría",
    });
  }
});

/* =========================
   EDITAR CATEGORIA
========================= */

app.put(
  "/categorias/:id",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {

  try {

    const { id } = req.params;
    const { nombre } = req.body;

    const result = await db.query(
      `
      UPDATE categorias
      SET nombre = $1
      WHERE id = $2
      AND empresa_id = $3
      RETURNING *
      `,
      [
        nombre,
        id,
        obtenerEmpresaId(req),
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Categoría no encontrada",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error actualizando categoría",
    });
  }
});

/* =========================
   ELIMINAR CATEGORIA
========================= */

app.delete(
  "/categorias/:id",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {

  try {

    const { id } = req.params;

    const result = await db.query(
      `
      DELETE FROM categorias
      WHERE id = $1
      AND empresa_id = $2
      RETURNING *
      `,
      [
        id,
        obtenerEmpresaId(req),
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Categoría no encontrada",
      });
    }

    res.json({
      mensaje: "Categoría eliminada",
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error eliminando categoría",
    });
  }
});

/* =========================
   REPORTE HOY
========================= */

app.get(
  "/reporte/hoy",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {

  try {

    const empresaId = obtenerEmpresaId(req);

    const result = await db.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE COALESCE(estado, 'activa') <> 'anulada') AS ventas,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' THEN total ELSE 0 END),0) AS total,
        COUNT(*) FILTER (
          WHERE COALESCE(estado, 'activa') <> 'anulada'
          AND COALESCE(tipo_comprobante, 'Factura') = 'Factura'
        ) AS facturas,
        COUNT(*) FILTER (
          WHERE COALESCE(estado, 'activa') <> 'anulada'
          AND tipo_comprobante = 'Recibo'
        ) AS recibos,
        COUNT(*) FILTER (
          WHERE COALESCE(estado, 'activa') <> 'anulada'
          AND tipo_comprobante = 'Credito'
        ) AS creditos,
        COALESCE(SUM(total) FILTER (
          WHERE COALESCE(estado, 'activa') <> 'anulada'
          AND COALESCE(tipo_comprobante, 'Factura') = 'Factura'
        ),0) AS total_facturas,
        COALESCE(SUM(total) FILTER (
          WHERE COALESCE(estado, 'activa') <> 'anulada'
          AND tipo_comprobante = 'Recibo'
        ),0) AS total_recibos,
        COALESCE(SUM(total) FILTER (
          WHERE COALESCE(estado, 'activa') <> 'anulada'
          AND tipo_comprobante = 'Credito'
        ),0) AS total_creditos
      FROM ventas
      WHERE empresa_id = $1
      `,
      [empresaId]
    );

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   CAJA DIARIA
========================= */

const calcularDenominaciones = (denominaciones = {}) => {
  const valores = {
    q025: 0.25,
    q050: 0.5,
    q1: 1,
    q5: 5,
    q10: 10,
    q20: 20,
    q50: 50,
    q100: 100,
    q200: 200,
  };

  return Object.entries(valores).reduce((total, [key, valor]) => {
    const cantidad = Math.max(Number(denominaciones[key] || 0), 0);
    return total + cantidad * valor;
  }, 0);
};

const obtenerCajaAbierta = async (usuarioId, empresaId) => {
  const result = await db.query(
    `
    SELECT *
    FROM cajas_turnos
    WHERE usuario_id = $1
    AND empresa_id = $2
    AND estado = 'abierta'
    ORDER BY fecha_apertura DESC
    LIMIT 1
    `,
    [usuarioId, empresaId]
  );

  return result.rows[0] || null;
};

const validarAutorizadorCaja = async (empresaId, autorizacion = {}) => {
  const email = String(autorizacion.email || autorizacion.usuario || "").trim();
  const password = String(autorizacion.password || "").trim();

  if (!email || !password) {
    throw new Error("Ingrese usuario y password de autorizacion");
  }

  const result = await db.query(
    `
    SELECT id, nombre, rol, password, empresa_id
    FROM usuarios
    WHERE (
      LOWER(COALESCE(email, '')) = LOWER($1)
      OR LOWER(COALESCE(usuario_login, '')) = LOWER($1)
    )
    AND empresa_id = $2
    AND rol = 'admin'
    LIMIT 1
    `,
    [email, empresaId]
  );

  if (result.rows.length === 0 || result.rows[0].password !== password) {
    throw new Error("Autorizacion invalida");
  }

  return result.rows[0];
};

const validarPasswordAdminEmpresa = async (empresaId, password) => {
  const passwordFinal = String(password || "").trim();

  if (!passwordFinal) {
    throw new Error("Ingrese password de administrador");
  }

  const result = await db.query(
    `
    SELECT id, nombre, rol, password, empresa_id
    FROM usuarios
    WHERE empresa_id = $1
    AND rol = 'admin'
    AND password = $2
    ORDER BY id ASC
    LIMIT 1
    `,
    [empresaId, passwordFinal]
  );

  if (result.rows.length === 0) {
    throw new Error("Password de administrador invalido");
  }

  return result.rows[0];
};

const obtenerAjustesCaja = async (turnoId, empresaId) => {
  const result = await db.query(
    `
    SELECT
      ca.*,
      u.nombre AS usuario_nombre,
      au.nombre AS autorizador_nombre
    FROM caja_ajustes ca
    LEFT JOIN usuarios u ON u.id = ca.usuario_id
    LEFT JOIN usuarios au ON au.id = ca.autorizador_id
    WHERE ca.caja_turno_id = $1
    AND ca.empresa_id = $2
    ORDER BY ca.fecha DESC, ca.id DESC
    `,
    [turnoId, empresaId]
  );

  return result.rows;
};

const calcularResumenTurno = async (turnoId, empresaId) => {
  const ventas = await db.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE COALESCE(estado, 'activa') <> 'anulada') AS transacciones,
      COUNT(*) FILTER (WHERE COALESCE(estado, 'activa') = 'anulada') AS anuladas,
      COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' THEN total ELSE 0 END),0) AS total_vendido,
      COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante = 'Credito' THEN total ELSE 0 END),0) AS total_credito,
      COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante <> 'Credito' THEN efectivo_recibido - cambio ELSE 0 END),0) AS total_efectivo,
      COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante <> 'Credito' THEN tarjeta_monto ELSE 0 END),0) AS total_tarjeta,
      COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante <> 'Credito' THEN transferencia_monto ELSE 0 END),0) AS total_transferencia,
      COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante <> 'Credito' THEN saldo_favor_usado ELSE 0 END),0) AS total_saldo_favor
    FROM ventas
    WHERE empresa_id = $1
    AND caja_turno_id = $2
    `,
    [empresaId, turnoId]
  );

  const gastos = await db.query(
    `
    SELECT COALESCE(SUM(monto),0) AS total_gastos
    FROM caja_gastos
    WHERE empresa_id = $1
    AND caja_turno_id = $2
    `,
    [empresaId, turnoId]
  );

  const ajustes = await db.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'aumento' THEN monto ELSE -monto END),0) AS total_ajustes
    FROM caja_ajustes
    WHERE empresa_id = $1
    AND caja_turno_id = $2
    `,
    [empresaId, turnoId]
  );

  return {
    ...ventas.rows[0],
    total_gastos: gastos.rows[0].total_gastos,
    total_ajustes: ajustes.rows[0].total_ajustes,
  };
};

app.get(
  "/caja/turno-actual",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const turno = await obtenerCajaAbierta(req.user.id, empresaId);

    if (!turno) {
      return res.json({
        abierta: false,
      });
    }

    const resumen = await calcularResumenTurno(turno.id, empresaId);
    const ajustes = await obtenerAjustesCaja(turno.id, empresaId);

    res.json({
      abierta: true,
      turno,
      resumen,
      ajustes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo caja actual",
    });
  }
  }
);

app.post(
  "/caja/ajuste",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const turno = await obtenerCajaAbierta(req.user.id, empresaId);

    if (!turno) {
      return res.status(400).json({
        error: "No existe caja abierta para ajustar",
      });
    }

    const tipo = req.body.tipo === "disminucion" ? "disminucion" : "aumento";
    const denominaciones = req.body.denominaciones || {};
    const monto = calcularDenominaciones(denominaciones);
    const motivo = String(req.body.motivo || "").trim();

    if (monto <= 0) {
      return res.status(400).json({
        error: "Ingrese monto del ajuste",
      });
    }

    if (!motivo) {
      return res.status(400).json({
        error: "Ingrese motivo del ajuste",
      });
    }

    let autorizador;
    try {
      autorizador = await validarAutorizadorCaja(
        empresaId,
        req.body.autorizacion || {}
      );
    } catch (error) {
      return res.status(403).json({
        error: error.message,
      });
    }

    const result = await db.query(
      `
      INSERT INTO caja_ajustes
      (
        caja_turno_id,
        tipo,
        monto,
        denominaciones,
        motivo,
        usuario_id,
        autorizador_id,
        empresa_id
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        turno.id,
        tipo,
        monto,
        JSON.stringify(denominaciones),
        motivo,
        req.user.id,
        autorizador.id,
        empresaId,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error registrando ajuste de caja",
    });
  }
  }
);

app.post(
  "/caja/apertura",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const abierta = await obtenerCajaAbierta(req.user.id, empresaId);

    if (abierta) {
      return res.status(400).json({
        error: "Ya existe una caja abierta para este usuario",
      });
    }

    const cajaCerradaHoy = await db.query(
      `
      SELECT id
      FROM cajas_turnos
      WHERE usuario_id = $1
      AND empresa_id = $2
      AND estado = 'cerrada'
      AND fecha_apertura::date = CURRENT_DATE
      ORDER BY fecha_cierre DESC
      LIMIT 1
      `,
      [req.user.id, empresaId]
    );
    let autorizador = null;

    if (cajaCerradaHoy.rows.length > 0) {
      try {
        autorizador = await validarAutorizadorCaja(
          empresaId,
          req.body.autorizacion || {}
        );
      } catch (error) {
        return res.status(403).json({
          error:
            "Ya existe una caja cerrada hoy. Se requiere autorizacion de admin para reaperturar.",
        });
      }

      if (!String(req.body.motivo_reapertura || "").trim()) {
        return res.status(400).json({
          error: "Ingrese motivo de reapertura",
        });
      }
    }

    const denominaciones = req.body.denominaciones || {};
    const monto = calcularDenominaciones(denominaciones);

    const result = await db.query(
      `
      INSERT INTO cajas_turnos
      (
        usuario_id,
        empresa_id,
        apertura_denominaciones,
        monto_apertura,
        observacion_apertura,
        reapertura_autorizada_por,
        reapertura_motivo
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        req.user.id,
        empresaId,
        JSON.stringify(denominaciones),
        monto,
        String(req.body.observacion || "").trim(),
        autorizador?.id || null,
        String(req.body.motivo_reapertura || "").trim(),
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error aperturando caja",
    });
  }
  }
);

app.post(
  "/caja/cierre",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const turno = await obtenerCajaAbierta(req.user.id, empresaId);

    if (!turno) {
      return res.status(400).json({
        error: "No existe caja abierta para cerrar",
      });
    }

    const denominaciones = req.body.denominaciones || {};
    const montoCierre = calcularDenominaciones(denominaciones);
    const resumen = await calcularResumenTurno(turno.id, empresaId);
    const efectivoEsperado =
      Number(turno.monto_apertura || 0) +
      Number(resumen.total_ajustes || 0) +
      Number(resumen.total_efectivo || 0) -
      Number(resumen.total_gastos || 0);
    const diferencia = montoCierre - efectivoEsperado;

    const result = await db.query(
      `
      UPDATE cajas_turnos
      SET
        estado = 'cerrada',
        cierre_denominaciones = $1,
        monto_cierre = $2,
        efectivo_esperado = $3,
        ventas_efectivo = $4,
        ventas_tarjeta = $5,
        ventas_transferencia = $6,
        ventas_credito = $7,
        saldo_favor_usado = $8,
        gastos = $9,
        diferencia = $10,
        observacion_cierre = $11,
        fecha_cierre = NOW()
      WHERE id = $12
      AND empresa_id = $13
      RETURNING *
      `,
      [
        JSON.stringify(denominaciones),
        montoCierre,
        efectivoEsperado,
        Number(resumen.total_efectivo || 0),
        Number(resumen.total_tarjeta || 0),
        Number(resumen.total_transferencia || 0),
        Number(resumen.total_credito || 0),
        Number(resumen.total_saldo_favor || 0),
        Number(resumen.total_gastos || 0),
        diferencia,
        String(req.body.observacion || "").trim(),
        turno.id,
        empresaId,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error cerrando caja",
    });
  }
  }
);

app.get(
  "/contabilidad/cuentas",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);

    await asegurarCuentasContablesBase(empresaId);

    const result = await db.query(
      `
      SELECT *
      FROM contabilidad_cuentas
      WHERE empresa_id = $1
      ORDER BY codigo ASC
      `,
      [empresaId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo catalogo de cuentas",
    });
  }
  }
);

app.post(
  "/contabilidad/cuentas",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const {
      codigo,
      nombre,
      tipo,
      naturaleza,
      cuenta_padre_id,
      permite_movimiento,
    } = req.body;

    const tiposValidos = ["activo", "pasivo", "patrimonio", "ingreso", "costo", "gasto"];
    const naturalezasValidas = ["deudora", "acreedora"];

    if (!String(codigo || "").trim()) {
      return res.status(400).json({ error: "Ingrese codigo de cuenta" });
    }

    if (!String(nombre || "").trim()) {
      return res.status(400).json({ error: "Ingrese nombre de cuenta" });
    }

    if (!tiposValidos.includes(String(tipo || ""))) {
      return res.status(400).json({ error: "Tipo de cuenta invalido" });
    }

    if (!naturalezasValidas.includes(String(naturaleza || ""))) {
      return res.status(400).json({ error: "Naturaleza de cuenta invalida" });
    }

    const result = await db.query(
      `
      INSERT INTO contabilidad_cuentas
      (
        codigo,
        nombre,
        tipo,
        naturaleza,
        cuenta_padre_id,
        permite_movimiento,
        empresa_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        String(codigo).trim(),
        String(nombre).trim(),
        tipo,
        naturaleza,
        cuenta_padre_id || null,
        permite_movimiento !== false,
        empresaId,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({
        error: "Ya existe una cuenta con ese codigo",
      });
    }

    console.error(error);
    res.status(500).json({
      error: "Error creando cuenta contable",
    });
  }
  }
);

app.patch(
  "/contabilidad/cuentas/:id",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const {
      codigo,
      nombre,
      tipo,
      naturaleza,
      cuenta_padre_id,
      permite_movimiento,
      estado,
    } = req.body;

    const result = await db.query(
      `
      UPDATE contabilidad_cuentas
      SET
        codigo = $1,
        nombre = $2,
        tipo = $3,
        naturaleza = $4,
        cuenta_padre_id = $5,
        permite_movimiento = $6,
        estado = $7
      WHERE id = $8
      AND empresa_id = $9
      RETURNING *
      `,
      [
        String(codigo || "").trim(),
        String(nombre || "").trim(),
        tipo,
        naturaleza,
        cuenta_padre_id || null,
        permite_movimiento !== false,
        estado === "inactiva" ? "inactiva" : "activa",
        req.params.id,
        empresaId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Cuenta no encontrada",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({
        error: "Ya existe una cuenta con ese codigo",
      });
    }

    console.error(error);
    res.status(500).json({
      error: "Error actualizando cuenta contable",
    });
  }
  }
);

app.delete(
  "/contabilidad/cuentas/:id",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const result = await db.query(
      `
      UPDATE contabilidad_cuentas
      SET estado = 'inactiva'
      WHERE id = $1
      AND empresa_id = $2
      RETURNING *
      `,
      [req.params.id, empresaId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Cuenta no encontrada",
      });
    }

    res.json({
      mensaje: "Cuenta inactivada",
      cuenta: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error inactivando cuenta contable",
    });
  }
  }
);

app.get(
  "/contabilidad/libro-diario",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const {
      fecha_inicio,
      fecha_fin,
      origen,
      cuenta_id,
      texto,
    } = req.query;
    const params = [empresaId];
    const filtros = ["p.empresa_id = $1"];

    if (fecha_inicio) {
      params.push(fecha_inicio);
      filtros.push(`p.fecha::date >= $${params.length}`);
    }

    if (fecha_fin) {
      params.push(fecha_fin);
      filtros.push(`p.fecha::date <= $${params.length}`);
    }

    if (origen) {
      params.push(origen);
      filtros.push(`p.origen = $${params.length}`);
    }

    if (cuenta_id) {
      params.push(cuenta_id);
      filtros.push(`
        EXISTS (
          SELECT 1
          FROM contabilidad_partida_detalle dx
          WHERE dx.partida_id = p.id
          AND dx.cuenta_id = $${params.length}
        )
      `);
    }

    if (String(texto || "").trim()) {
      params.push(`%${String(texto).trim()}%`);
      filtros.push(`
        (
          p.descripcion ILIKE $${params.length}
          OR p.referencia_codigo ILIKE $${params.length}
          OR EXISTS (
            SELECT 1
            FROM contabilidad_partida_detalle dt
            LEFT JOIN contabilidad_cuentas ct ON ct.id = dt.cuenta_id
            WHERE dt.partida_id = p.id
            AND (
              dt.descripcion ILIKE $${params.length}
              OR ct.codigo ILIKE $${params.length}
              OR ct.nombre ILIKE $${params.length}
            )
          )
        )
      `);
    }

    const result = await db.query(
      `
      SELECT
        p.*,
        u.nombre AS usuario_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'id', d.id,
              'cuenta_id', c.id,
              'cuenta_codigo', c.codigo,
              'cuenta_nombre', c.nombre,
              'descripcion', d.descripcion,
              'debe', d.debe,
              'haber', d.haber
            )
            ORDER BY d.id
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) AS detalle
      FROM contabilidad_partidas p
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN contabilidad_partida_detalle d ON d.partida_id = p.id
      LEFT JOIN contabilidad_cuentas c ON c.id = d.cuenta_id
      WHERE ${filtros.join(" AND ")}
      GROUP BY p.id, u.nombre
      ORDER BY p.fecha DESC, p.id DESC
      LIMIT 300
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo libro diario",
    });
  }
  }
);

app.get(
  "/contabilidad/cuentas-cobrar",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const texto = String(req.query.texto || "").trim();
    const estado = String(req.query.estado || "pendientes");
    const params = [empresaId];
    const filtros = ["c.empresa_id = $1"];

    if (estado === "pendientes") {
      filtros.push("COALESCE(c.saldo_pendiente,0) > 0");
    } else if (estado === "con_saldo_favor") {
      filtros.push("COALESCE(c.saldo_favor,0) > 0");
    } else if (estado === "autorizados") {
      filtros.push("c.permite_credito = true");
    }

    if (texto) {
      params.push(`%${texto}%`);
      filtros.push(`
        (
          c.codigo ILIKE $${params.length}
          OR c.nombre ILIKE $${params.length}
          OR c.nit ILIKE $${params.length}
          OR c.telefono ILIKE $${params.length}
          OR c.correo ILIKE $${params.length}
        )
      `);
    }

    const result = await db.query(
      `
      SELECT
        c.id,
        c.codigo,
        c.nombre,
        c.nit,
        c.telefono,
        c.correo,
        c.estado,
        c.permite_credito,
        c.limite_credito,
        c.saldo_pendiente,
        c.saldo_favor,
        COUNT(v.id) FILTER (
          WHERE v.tipo_comprobante = 'Credito'
          AND COALESCE(v.estado_cuenta, 'pendiente') = 'pendiente'
          AND COALESCE(v.estado, 'activa') <> 'anulada'
        ) AS documentos_pendientes,
        COALESCE(
          json_agg(
            json_build_object(
              'id', v.id,
              'fecha', v.fecha,
              'total', v.total,
              'estado_cuenta', v.estado_cuenta,
              'cliente_nombre', v.cliente_nombre
            )
            ORDER BY v.fecha DESC
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'
        ) AS documentos
      FROM clientes c
      LEFT JOIN ventas v
        ON v.cliente_id = c.id
        AND v.empresa_id = c.empresa_id
        AND v.tipo_comprobante = 'Credito'
        AND COALESCE(v.estado_cuenta, 'pendiente') = 'pendiente'
        AND COALESCE(v.estado, 'activa') <> 'anulada'
      WHERE ${filtros.join(" AND ")}
      GROUP BY c.id
      ORDER BY c.saldo_pendiente DESC, c.nombre ASC
      LIMIT 300
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo cuentas por cobrar",
    });
  }
  }
);

app.get(
  "/contabilidad/cuentas-cobrar/:clienteId",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);

    const clienteResult = await db.query(
      `
      SELECT *
      FROM clientes
      WHERE id = $1
      AND empresa_id = $2
      `,
      [req.params.clienteId, empresaId]
    );

    if (clienteResult.rows.length === 0) {
      return res.status(404).json({
        error: "Cliente no encontrado",
      });
    }

    const documentos = await db.query(
      `
      SELECT
        v.id,
        v.fecha,
        v.total,
        v.estado_cuenta,
        v.tipo_comprobante,
        v.cliente_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'descripcion', COALESCE(dv.descripcion, p.nombre),
              'cantidad', dv.cantidad,
              'precio', dv.precio
            )
            ORDER BY dv.id
          ) FILTER (WHERE dv.id IS NOT NULL),
          '[]'
        ) AS detalle
      FROM ventas v
      LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id
      LEFT JOIN productos p ON p.id = dv.producto_id
      WHERE v.cliente_id = $1
      AND v.empresa_id = $2
      AND v.tipo_comprobante = 'Credito'
      AND COALESCE(v.estado, 'activa') <> 'anulada'
      GROUP BY v.id
      ORDER BY v.fecha DESC
      `,
      [req.params.clienteId, empresaId]
    );

    const movimientos = await db.query(
      `
      SELECT
        cm.*,
        u.nombre AS usuario_nombre
      FROM clientes_movimientos cm
      LEFT JOIN usuarios u ON u.id = cm.usuario_id
      WHERE cm.cliente_id = $1
      AND cm.empresa_id = $2
      ORDER BY cm.fecha DESC, cm.id DESC
      LIMIT 200
      `,
      [req.params.clienteId, empresaId]
    );

    res.json({
      cliente: clienteResult.rows[0],
      documentos: documentos.rows,
      movimientos: movimientos.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo detalle de cuenta por cobrar",
    });
  }
  }
);

app.get(
  "/contabilidad/cuentas-pagar",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const texto = String(req.query.texto || "").trim();
    const estado = String(req.query.estado || "pendientes");
    const params = [empresaId];
    const filtros = ["c.empresa_id = $1"];

    if (estado === "pendientes") {
      filtros.push("COALESCE(c.estado_pago, 'pendiente') = 'pendiente'");
    } else if (estado === "pagadas") {
      filtros.push("c.estado_pago = 'pagada'");
    }

    if (texto) {
      params.push(`%${texto}%`);
      filtros.push(`
        (
          p.nombre ILIKE $${params.length}
          OR p.telefono ILIKE $${params.length}
          OR p.email ILIKE $${params.length}
          OR c.documento ILIKE $${params.length}
        )
      `);
    }

    const result = await db.query(
      `
      SELECT
        p.id AS proveedor_id,
        p.nombre AS proveedor,
        p.telefono,
        p.email,
        p.direccion,
        COUNT(c.id) AS documentos,
        COALESCE(SUM(c.total),0) AS total,
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'documento', c.documento,
              'fecha', c.fecha,
              'fecha_vencimiento', c.fecha_vencimiento,
              'fecha_pago', c.fecha_pago,
              'metodo_pago', c.metodo_pago,
              'estado_pago', COALESCE(c.estado_pago, 'pendiente'),
              'total', c.total
            )
            ORDER BY c.fecha DESC
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) AS compras
      FROM proveedores p
      LEFT JOIN compras c
        ON c.proveedor_id = p.id
        AND c.empresa_id = p.empresa_id
      WHERE ${filtros.join(" AND ")}
      GROUP BY p.id
      ORDER BY total DESC, p.nombre ASC
      LIMIT 300
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo cuentas por pagar",
    });
  }
  }
);

app.get(
  "/contabilidad/cuentas-pagar/:proveedorId",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);

    const proveedorResult = await db.query(
      `
      SELECT *
      FROM proveedores
      WHERE id = $1
      AND empresa_id = $2
      `,
      [req.params.proveedorId, empresaId]
    );

    if (proveedorResult.rows.length === 0) {
      return res.status(404).json({
        error: "Proveedor no encontrado",
      });
    }

    const compras = await db.query(
      `
      SELECT
        c.*,
        u.nombre AS usuario,
        COALESCE(
          json_agg(
            json_build_object(
              'producto', p.nombre,
              'cantidad', cd.cantidad,
              'costo_unitario', cd.costo_unitario,
              'subtotal', cd.subtotal
            )
            ORDER BY cd.id
          ) FILTER (WHERE cd.id IS NOT NULL),
          '[]'
        ) AS detalle
      FROM compras c
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      LEFT JOIN compra_detalle cd ON cd.compra_id = c.id
      LEFT JOIN productos p ON p.id = cd.producto_id
      WHERE c.proveedor_id = $1
      AND c.empresa_id = $2
      GROUP BY c.id, u.nombre
      ORDER BY c.fecha DESC
      `,
      [req.params.proveedorId, empresaId]
    );

    res.json({
      proveedor: proveedorResult.rows[0],
      compras: compras.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo detalle de cuenta por pagar",
    });
  }
  }
);

app.post(
  "/contabilidad/cuentas-pagar/:compraId/pagar",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  const client = await db.connect();

  try {
    const empresaId = obtenerEmpresaId(req);
    const metodoPago = req.body.metodo_pago === "efectivo" ? "efectivo" : "banco";

    await client.query("BEGIN");

    const compraResult = await client.query(
      `
      SELECT *
      FROM compras
      WHERE id = $1
      AND empresa_id = $2
      FOR UPDATE
      `,
      [req.params.compraId, empresaId]
    );

    if (compraResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Compra no encontrada",
      });
    }

    const compra = compraResult.rows[0];

    if (compra.estado_pago === "pagada") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "La compra ya esta pagada",
      });
    }

    const updateResult = await client.query(
      `
      UPDATE compras
      SET
        estado_pago = 'pagada',
        metodo_pago = $1,
        fecha_pago = NOW()
      WHERE id = $2
      AND empresa_id = $3
      RETURNING *
      `,
      [metodoPago, compra.id, empresaId]
    );

    await registrarPartidaContable(client, {
      empresaId,
      usuarioId: req.user.id,
      descripcion: `Pago compra #${compra.id}`,
      origen: "pago_proveedor",
      referenciaId: compra.id,
      referenciaCodigo: `PAGO-COMPRA-${compra.id}`,
      lineas: [
        {
          cuenta: "201",
          debe: Number(compra.total || 0),
          descripcion: `Cancelacion cuenta por pagar compra #${compra.id}`,
        },
        {
          cuenta: metodoPago === "efectivo" ? "101" : "102",
          haber: Number(compra.total || 0),
          descripcion: metodoPago === "efectivo" ? "Pago en efectivo" : "Pago por banco",
        },
      ],
    });

    await client.query("COMMIT");

    res.json(updateResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      error: "Error registrando pago a proveedor",
    });
  } finally {
    client.release();
  }
  }
);

app.get(
  "/contabilidad/reportes-financieros",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const { fecha_inicio, fecha_fin } = req.query;
    const paramsPeriodo = [empresaId];
    const filtrosPeriodo = ["p.empresa_id = $1"];

    if (fecha_inicio) {
      paramsPeriodo.push(fecha_inicio);
      filtrosPeriodo.push(`p.fecha::date >= $${paramsPeriodo.length}`);
    }

    if (fecha_fin) {
      paramsPeriodo.push(fecha_fin);
      filtrosPeriodo.push(`p.fecha::date <= $${paramsPeriodo.length}`);
    }

    const estadoResultados = await db.query(
      `
      SELECT
        c.tipo,
        c.codigo,
        c.nombre,
        COALESCE(SUM(d.debe),0) AS debe,
        COALESCE(SUM(d.haber),0) AS haber,
        CASE
          WHEN c.tipo = 'ingreso'
            THEN COALESCE(SUM(d.haber),0) - COALESCE(SUM(d.debe),0)
          ELSE COALESCE(SUM(d.debe),0) - COALESCE(SUM(d.haber),0)
        END AS saldo
      FROM contabilidad_partidas p
      JOIN contabilidad_partida_detalle d ON d.partida_id = p.id
      JOIN contabilidad_cuentas c ON c.id = d.cuenta_id
      WHERE ${filtrosPeriodo.join(" AND ")}
      AND c.tipo IN ('ingreso', 'costo', 'gasto')
      GROUP BY c.tipo, c.codigo, c.nombre
      ORDER BY c.codigo
      `,
      paramsPeriodo
    );

    const paramsBalance = [empresaId];
    const filtrosBalance = ["p.empresa_id = $1"];

    if (fecha_fin) {
      paramsBalance.push(fecha_fin);
      filtrosBalance.push(`p.fecha::date <= $${paramsBalance.length}`);
    }

    const balance = await db.query(
      `
      SELECT
        c.tipo,
        c.codigo,
        c.nombre,
        COALESCE(SUM(d.debe),0) AS debe,
        COALESCE(SUM(d.haber),0) AS haber,
        CASE
          WHEN c.tipo = 'activo'
            THEN COALESCE(SUM(d.debe),0) - COALESCE(SUM(d.haber),0)
          ELSE COALESCE(SUM(d.haber),0) - COALESCE(SUM(d.debe),0)
        END AS saldo
      FROM contabilidad_partidas p
      JOIN contabilidad_partida_detalle d ON d.partida_id = p.id
      JOIN contabilidad_cuentas c ON c.id = d.cuenta_id
      WHERE ${filtrosBalance.join(" AND ")}
      AND c.tipo IN ('activo', 'pasivo', 'patrimonio')
      GROUP BY c.tipo, c.codigo, c.nombre
      ORDER BY c.codigo
      `,
      paramsBalance
    );

    const flujo = await db.query(
      `
      SELECT
        c.codigo,
        c.nombre,
        COALESCE(SUM(d.debe),0) AS entradas,
        COALESCE(SUM(d.haber),0) AS salidas,
        COALESCE(SUM(d.debe),0) - COALESCE(SUM(d.haber),0) AS neto
      FROM contabilidad_partidas p
      JOIN contabilidad_partida_detalle d ON d.partida_id = p.id
      JOIN contabilidad_cuentas c ON c.id = d.cuenta_id
      WHERE ${filtrosPeriodo.join(" AND ")}
      AND c.codigo IN ('101', '102')
      GROUP BY c.codigo, c.nombre
      ORDER BY c.codigo
      `,
      paramsPeriodo
    );

    const sumarTipo = (rows, tipo) =>
      rows
        .filter((row) => row.tipo === tipo)
        .reduce((sum, row) => sum + Number(row.saldo || 0), 0);

    const ingresos = sumarTipo(estadoResultados.rows, "ingreso");
    const costos = sumarTipo(estadoResultados.rows, "costo");
    const gastos = sumarTipo(estadoResultados.rows, "gasto");
    const utilidad = ingresos - costos - gastos;
    const activos = sumarTipo(balance.rows, "activo");
    const pasivos = sumarTipo(balance.rows, "pasivo");
    const patrimonio = sumarTipo(balance.rows, "patrimonio");
    const flujoEntradas = flujo.rows.reduce(
      (sum, row) => sum + Number(row.entradas || 0),
      0
    );
    const flujoSalidas = flujo.rows.reduce(
      (sum, row) => sum + Number(row.salidas || 0),
      0
    );

    res.json({
      periodo: {
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null,
      },
      estado_resultados: {
        cuentas: estadoResultados.rows,
        ingresos,
        costos,
        gastos,
        utilidad,
      },
      balance_general: {
        cuentas: balance.rows,
        activos,
        pasivos,
        patrimonio,
        diferencia: activos - pasivos - patrimonio,
      },
      flujo_efectivo: {
        cuentas: flujo.rows,
        entradas: flujoEntradas,
        salidas: flujoSalidas,
        neto: flujoEntradas - flujoSalidas,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error generando reportes financieros",
    });
  }
  }
);

app.get(
  "/contabilidad/cierres-caja",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const result = await db.query(
      `
      SELECT
        ct.*,
        u.nombre AS usuario_nombre,
        au.nombre AS reapertura_autorizador,
        COALESCE(aj.total_ajustes,0) AS total_ajustes
      FROM cajas_turnos ct
      LEFT JOIN usuarios u ON u.id = ct.usuario_id
      LEFT JOIN usuarios au ON au.id = ct.reapertura_autorizada_por
      LEFT JOIN (
        SELECT
          caja_turno_id,
          empresa_id,
          SUM(CASE WHEN tipo = 'aumento' THEN monto ELSE -monto END) AS total_ajustes
        FROM caja_ajustes
        GROUP BY caja_turno_id, empresa_id
      ) aj ON aj.caja_turno_id = ct.id
        AND aj.empresa_id = ct.empresa_id
      WHERE ct.empresa_id = $1
      ORDER BY ct.fecha_apertura DESC
      LIMIT 100
      `,
      [empresaId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo cierres de caja",
    });
  }
  }
);

app.get(
  "/administracion/ventas-diarias",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);

    const ventas = await db.query(
      `
      SELECT
        v.*,
        u.nombre AS usuario_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'producto_id', dv.producto_id,
              'nombre', COALESCE(dv.descripcion, p.nombre),
              'cantidad', dv.cantidad,
              'precio', dv.precio,
              'observacion', COALESCE(dv.observacion, ''),
              'complementos', COALESCE(dv.complementos, '[]'::jsonb)
            )
            ORDER BY dv.id
          ) FILTER (WHERE dv.id IS NOT NULL),
          '[]'
        ) AS detalle
      FROM ventas v
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id
      LEFT JOIN productos p ON p.id = dv.producto_id
      WHERE v.empresa_id = $1
      AND v.fecha::date = $2
      GROUP BY v.id, u.nombre
      ORDER BY v.fecha DESC, v.id DESC
      `,
      [empresaId, fecha]
    );

    const resumen = await db.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE COALESCE(estado, 'activa') <> 'anulada') AS transacciones,
        COUNT(*) FILTER (WHERE COALESCE(estado, 'activa') = 'anulada') AS anuladas,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' THEN total ELSE 0 END),0) AS total,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante <> 'Credito' THEN efectivo_recibido - cambio ELSE 0 END),0) AS efectivo,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante <> 'Credito' THEN tarjeta_monto ELSE 0 END),0) AS tarjeta,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante <> 'Credito' THEN transferencia_monto ELSE 0 END),0) AS transferencia,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante = 'Credito' THEN total ELSE 0 END),0) AS credito,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' THEN saldo_favor_usado ELSE 0 END),0) AS saldo_favor
      FROM ventas
      WHERE empresa_id = $1
      AND fecha::date = $2
      `,
      [empresaId, fecha]
    );

    res.json({
      fecha,
      resumen: resumen.rows[0],
      ventas: ventas.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo ventas diarias",
    });
  }
  }
);

app.get(
  "/caja/ventas-hoy",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);

    const result = await db.query(
      `
      SELECT
        v.*,
        u.nombre AS usuario_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'producto_id', dv.producto_id,
              'nombre', COALESCE(dv.descripcion, p.nombre),
              'cantidad', dv.cantidad,
              'precio', dv.precio,
              'observacion', COALESCE(dv.observacion, ''),
              'complementos', COALESCE(dv.complementos, '[]'::jsonb)
            )
            ORDER BY dv.id
          ) FILTER (WHERE dv.id IS NOT NULL),
          '[]'
        ) AS detalle
      FROM ventas v
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id
      LEFT JOIN productos p ON p.id = dv.producto_id
      WHERE v.empresa_id = $1
      AND v.fecha::date = CURRENT_DATE
      GROUP BY v.id, u.nombre
      ORDER BY v.fecha DESC, v.id DESC
      `,
      [empresaId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo ventas del dia",
    });
  }
  }
);

app.get(
  "/caja/resumen-hoy",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);

    const result = await db.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE COALESCE(estado, 'activa') <> 'anulada') AS transacciones,
        COUNT(*) FILTER (WHERE COALESCE(estado, 'activa') = 'anulada') AS anuladas,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' THEN total ELSE 0 END),0) AS total_vendido,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante = 'Credito' THEN total ELSE 0 END),0) AS total_credito,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante <> 'Credito' THEN efectivo_recibido - cambio ELSE 0 END),0) AS total_efectivo,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante <> 'Credito' THEN tarjeta_monto ELSE 0 END),0) AS total_tarjeta,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante <> 'Credito' THEN transferencia_monto ELSE 0 END),0) AS total_transferencia,
        COALESCE(SUM(CASE WHEN COALESCE(estado, 'activa') <> 'anulada' AND tipo_comprobante <> 'Credito' THEN saldo_favor_usado ELSE 0 END),0) AS total_saldo_favor
      FROM ventas
      WHERE empresa_id = $1
      AND fecha::date = CURRENT_DATE
      `,
      [empresaId]
    );

    const gastos = await db.query(
      `
      SELECT
        COALESCE(SUM(monto),0) AS total_gastos
      FROM caja_gastos
      WHERE empresa_id = $1
      AND fecha::date = CURRENT_DATE
      `,
      [empresaId]
    );

    res.json({
      ...result.rows[0],
      total_gastos: gastos.rows[0].total_gastos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo resumen de caja",
    });
  }
  }
);

app.post(
  "/caja/gastos",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  const client = await db.connect();

  try {
    const empresaId = obtenerEmpresaId(req);
    const turnoCaja = await obtenerCajaAbierta(req.user.id, empresaId);

    if (!turnoCaja) {
      return res.status(400).json({
        error: "Debe aperturar caja antes de registrar gastos",
      });
    }

    const {
      descripcion,
      monto,
      autorizado_por,
    } = req.body;

    if (!String(descripcion || "").trim()) {
      return res.status(400).json({
        error: "Ingrese descripcion del gasto",
      });
    }

    if (!Number(monto || 0) || Number(monto || 0) <= 0) {
      return res.status(400).json({
        error: "Ingrese un monto valido",
      });
    }

    if (!String(autorizado_por || "").trim()) {
      return res.status(400).json({
        error: "Ingrese quien autorizo el gasto",
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO caja_gastos
      (
        descripcion,
        monto,
        autorizado_por,
        usuario_id,
        caja_turno_id,
        empresa_id
      )
      VALUES
      ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        descripcion,
        Number(monto),
        autorizado_por,
        req.user.id,
        turnoCaja.id,
        empresaId,
      ]
    );

    const gastoCaja = result.rows[0];

    await registrarPartidaContable(client, {
      empresaId,
      usuarioId: req.user.id,
      descripcion: `Gasto de caja: ${descripcion}`,
      origen: "gasto_caja",
      referenciaId: gastoCaja.id,
      referenciaCodigo: `GASTO-${gastoCaja.id}`,
      lineas: [
        {
          cuenta: "602",
          debe: Number(monto),
          descripcion,
        },
        {
          cuenta: "101",
          haber: Number(monto),
          descripcion: "Salida de efectivo de caja",
        },
      ],
    });

    await client.query("COMMIT");

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      error: "Error registrando gasto de caja",
    });
  } finally {
    client.release();
  }
  }
);

/* =========================
   COMANDAS
========================= */

app.get(
  "/comandas",
  verificarToken,
  permitirRoles("admin", "cajero", "cocina"),
  async (req, res) => {
  try {
    const empresaId = obtenerEmpresaId(req);
    const departamento = String(req.query.departamento || "").trim();
    const historial = req.query.historial === "1";
    const fecha = String(req.query.fecha || "").trim();
    const estado = String(req.query.estado || "").trim().toUpperCase();
    const params = [empresaId];
    let filtroDepartamento = "";
    const filtroFechaDiaGuatemala = (paramFecha) => `
      AND c.fecha >= (
        ($${paramFecha}::date::timestamp AT TIME ZONE 'America/Guatemala')
        AT TIME ZONE 'UTC'
      )
      AND c.fecha < (
        (($${paramFecha}::date + INTERVAL '1 day')::timestamp AT TIME ZONE 'America/Guatemala')
        AT TIME ZONE 'UTC'
      )
    `;
    let filtroFecha = `
      AND c.fecha >= (
        (((NOW() AT TIME ZONE 'America/Guatemala')::date)::timestamp AT TIME ZONE 'America/Guatemala')
        AT TIME ZONE 'UTC'
      )
      AND c.fecha < (
        ((((NOW() AT TIME ZONE 'America/Guatemala')::date + INTERVAL '1 day')::timestamp AT TIME ZONE 'America/Guatemala')
        AT TIME ZONE 'UTC')
      )
    `;
    let filtroEstado = "AND c.estado <> 'ENTREGADO'";

    if (departamento) {
      params.push(departamento.toUpperCase());
      filtroDepartamento = `AND UPPER(c.departamento) = $${params.length}`;
    }

    if (historial) {
      filtroEstado = "";

      if (fecha) {
        params.push(fecha);
        filtroFecha = filtroFechaDiaGuatemala(params.length);
      }

      if (estado && estado !== "TODOS") {
        params.push(estado);
        filtroEstado = `AND c.estado = $${params.length}`;
      }
    }

    const result = await db.query(
      `
      SELECT
        c.*,
        EXTRACT(
          EPOCH FROM (
            COALESCE(c.fecha_listo, c.fecha_entregado, NOW()) - c.fecha
          )
        ) / 60 AS minutos,
        EXTRACT(EPOCH FROM (NOW() - c.fecha)) / 60 AS minutos_activo,
        COALESCE(
          json_agg(
            json_build_object(
              'producto_id', cd.producto_id,
              'producto', cd.producto,
              'cantidad', cd.cantidad,
              'observacion', COALESCE(cd.observacion, ''),
              'complementos', COALESCE(cd.complementos, '[]'::jsonb)
            )
            ORDER BY cd.id
          ) FILTER (WHERE cd.id IS NOT NULL),
          '[]'
        ) AS productos
      FROM comandas c
      LEFT JOIN comanda_detalle cd
        ON cd.comanda_id = c.id
      WHERE c.empresa_id = $1
      ${filtroDepartamento}
      ${filtroFecha}
      ${filtroEstado}
      GROUP BY c.id
      ORDER BY c.fecha DESC, c.id DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo comandas",
    });
  }
  }
);

app.put(
  "/comandas/:id",
  verificarToken,
  permitirRoles("admin", "cocina"),
  async (req, res) => {
  try {
    const { id } = req.params;
    const estado = String(req.body.estado || "").trim().toUpperCase();
    const estadosPermitidos = [
      "PENDIENTE",
      "EN PREPARACION",
      "LISTO",
      "ENTREGADO",
    ];

    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        error: "Estado de comanda invalido",
      });
    }

    await db.query(`
      ALTER TABLE comandas
      ADD COLUMN IF NOT EXISTS fecha_preparacion TIMESTAMP
    `);

    await db.query(`
      ALTER TABLE comandas
      ADD COLUMN IF NOT EXISTS fecha_listo TIMESTAMP
    `);

    await db.query(`
      ALTER TABLE comandas
      ADD COLUMN IF NOT EXISTS fecha_entregado TIMESTAMP
    `);

    const result = await db.query(
      `
      UPDATE comandas
      SET
        estado = $1::VARCHAR,
        fecha_preparacion = CASE
          WHEN $1::VARCHAR = 'EN PREPARACION' AND fecha_preparacion IS NULL THEN NOW()
          ELSE fecha_preparacion
        END,
        fecha_listo = CASE
          WHEN $1::VARCHAR = 'LISTO' AND fecha_listo IS NULL THEN NOW()
          ELSE fecha_listo
        END,
        fecha_entregado = CASE
          WHEN $1::VARCHAR = 'ENTREGADO' AND fecha_entregado IS NULL THEN NOW()
          ELSE fecha_entregado
        END
      WHERE id = $2
      AND empresa_id = $3
      RETURNING *
      `,
      [
        estado,
        id,
        obtenerEmpresaId(req),
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Comanda no encontrada",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error actualizando comanda",
    });
  }
  }
);

/* =========================
   VENTAS
========================= */

app.patch(
  "/ventas/:id/anular",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {
  const client = await db.connect();

  try {
    const empresaId = obtenerEmpresaId(req);
    const ventaId = Number(req.params.id);
    const motivo = String(req.body.motivo || "").trim();
    const passwordAdmin = String(req.body.password_admin || "").trim();

    if (!ventaId) {
      return res.status(400).json({ error: "Venta invalida" });
    }

    if (!motivo) {
      return res.status(400).json({ error: "Ingrese motivo de anulacion" });
    }

    const autorizador = await validarPasswordAdminEmpresa(
      empresaId,
      passwordAdmin
    );

    await client.query("BEGIN");

    const ventaResult = await client.query(
      `
      SELECT *
      FROM ventas
      WHERE id = $1
      AND empresa_id = $2
      FOR UPDATE
      `,
      [ventaId, empresaId]
    );

    if (ventaResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    const venta = ventaResult.rows[0];

    if (venta.estado === "anulada") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "La venta ya esta anulada" });
    }

    const detalles = await client.query(
      `
      SELECT
        dv.*,
        p.controla_stock,
        p.nombre AS producto_nombre
      FROM detalle_ventas dv
      LEFT JOIN productos p
        ON p.id = dv.producto_id
       AND p.empresa_id = $2
      WHERE dv.venta_id = $1
      ORDER BY dv.id ASC
      `,
      [ventaId, empresaId]
    );

    for (const item of detalles.rows) {
      if (item.producto_id && item.controla_stock !== false) {
        await client.query(
          `
          UPDATE productos
          SET existencia = existencia + $1
          WHERE id = $2
          AND empresa_id = $3
          `,
          [Number(item.cantidad || 0), item.producto_id, empresaId]
        );

        await client.query(
          `
          INSERT INTO movimientos_inventario
          (
            producto_id,
            tipo,
            cantidad,
            motivo,
            usuario_id,
            empresa_id
          )
          VALUES
          ($1,'entrada',$2,$3,$4,$5)
          `,
          [
            item.producto_id,
            Number(item.cantidad || 0),
            `Anulacion venta #${ventaId}: ${motivo}`,
            req.user.id,
            empresaId,
          ]
        );
      }
    }

    if (venta.cliente_id) {
      const clienteResult = await client.query(
        `
        SELECT *
        FROM clientes
        WHERE id = $1
        AND empresa_id = $2
        FOR UPDATE
        `,
        [venta.cliente_id, empresaId]
      );

      const cliente = clienteResult.rows[0];

      if (cliente) {
        const saldoFavorAnterior = Number(cliente.saldo_favor || 0);
        const saldoPendienteAnterior = Number(cliente.saldo_pendiente || 0);
        let saldoFavorNuevo = saldoFavorAnterior;
        let saldoPendienteNuevo = saldoPendienteAnterior;
        const movimientosCliente = [];

        if (Number(venta.saldo_favor_usado || 0) > 0) {
          saldoFavorNuevo += Number(venta.saldo_favor_usado || 0);
          movimientosCliente.push({
            tipo: "anulacion_saldo_favor",
            monto: Number(venta.saldo_favor_usado || 0),
            motivo: `Reversion saldo a favor por anulacion venta #${ventaId}`,
          });
        }

        if (venta.tipo_comprobante === "Credito") {
          saldoPendienteNuevo = Math.max(
            saldoPendienteNuevo - Number(venta.total || 0),
            0
          );
          movimientosCliente.push({
            tipo: "anulacion_credito",
            monto: Number(venta.total || 0),
            motivo: `Reversion credito por anulacion venta #${ventaId}`,
          });
        }

        if (
          saldoFavorNuevo !== saldoFavorAnterior ||
          saldoPendienteNuevo !== saldoPendienteAnterior
        ) {
          await client.query(
            `
            UPDATE clientes
            SET
              saldo_favor = $1,
              saldo_pendiente = $2
            WHERE id = $3
            AND empresa_id = $4
            `,
            [saldoFavorNuevo, saldoPendienteNuevo, cliente.id, empresaId]
          );

          for (const movimiento of movimientosCliente) {
            await client.query(
              `
              INSERT INTO clientes_movimientos
              (
                cliente_id,
                tipo,
                monto,
                venta_id,
                motivo,
                saldo_favor_anterior,
                saldo_favor_nuevo,
                saldo_pendiente_anterior,
                saldo_pendiente_nuevo,
                usuario_id,
                empresa_id
              )
              VALUES
              ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
              `,
              [
                cliente.id,
                movimiento.tipo,
                movimiento.monto,
                ventaId,
                movimiento.motivo,
                saldoFavorAnterior,
                saldoFavorNuevo,
                saldoPendienteAnterior,
                saldoPendienteNuevo,
                req.user.id,
                empresaId,
              ]
            );
          }
        }
      }
    }

    for (const item of detalles.rows) {
      const descripcion = String(item.descripcion || "");
      const match = descripcion.match(/Cobro credito venta #(\d+)/i);

      if (!match) continue;

      const ventaCreditoId = Number(match[1]);

      if (!ventaCreditoId) continue;

      const creditoResult = await client.query(
        `
        SELECT *
        FROM ventas
        WHERE id = $1
        AND empresa_id = $2
        AND tipo_comprobante = 'Credito'
        FOR UPDATE
        `,
        [ventaCreditoId, empresaId]
      );

      const credito = creditoResult.rows[0];

      if (!credito || !credito.cliente_id) continue;

      const clienteCreditoResult = await client.query(
        `
        SELECT *
        FROM clientes
        WHERE id = $1
        AND empresa_id = $2
        FOR UPDATE
        `,
        [credito.cliente_id, empresaId]
      );

      const clienteCredito = clienteCreditoResult.rows[0];

      if (!clienteCredito) continue;

      const saldoFavorAnterior = Number(clienteCredito.saldo_favor || 0);
      const saldoPendienteAnterior = Number(clienteCredito.saldo_pendiente || 0);
      const saldoPendienteNuevo =
        saldoPendienteAnterior + Number(credito.total || 0);

      await client.query(
        `
        UPDATE ventas
        SET estado_cuenta = 'pendiente'
        WHERE id = $1
        AND empresa_id = $2
        `,
        [ventaCreditoId, empresaId]
      );

      await client.query(
        `
        UPDATE clientes
        SET saldo_pendiente = $1
        WHERE id = $2
        AND empresa_id = $3
        `,
        [saldoPendienteNuevo, clienteCredito.id, empresaId]
      );

      await client.query(
        `
        INSERT INTO clientes_movimientos
        (
          cliente_id,
          tipo,
          monto,
          venta_id,
          motivo,
          saldo_favor_anterior,
          saldo_favor_nuevo,
          saldo_pendiente_anterior,
          saldo_pendiente_nuevo,
          usuario_id,
          empresa_id
        )
        VALUES
        ($1,'anulacion_pago_credito',$2,$3,$4,$5,$5,$6,$7,$8,$9)
        `,
        [
          clienteCredito.id,
          Number(credito.total || 0),
          ventaId,
          `Reversion pago credito #${ventaCreditoId} por anulacion venta #${ventaId}`,
          saldoFavorAnterior,
          saldoPendienteAnterior,
          saldoPendienteNuevo,
          req.user.id,
          empresaId,
        ]
      );
    }

    await client.query(
      `
      UPDATE comandas
      SET
        estado = 'ENTREGADO',
        observacion = COALESCE(NULLIF(observacion, ''), '') || $3,
        fecha_entregado = COALESCE(fecha_entregado, NOW())
      WHERE venta_id = $1
      AND empresa_id = $2
      `,
      [ventaId, empresaId, ` Anulada: ${motivo}`]
    );

    const anulada = await client.query(
      `
      UPDATE ventas
      SET
        estado = 'anulada',
        fecha_anulacion = NOW(),
        usuario_anulacion_id = $3,
        autorizador_anulacion_id = $4,
        motivo_anulacion = $5
      WHERE id = $1
      AND empresa_id = $2
      RETURNING *
      `,
      [ventaId, empresaId, req.user.id, autorizador.id, motivo]
    );

    await client.query("COMMIT");

    res.json({
      mensaje: "Venta anulada correctamente",
      venta: anulada.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      error: error.message || "Error anulando venta",
    });
  } finally {
    client.release();
  }
  }
);

app.post(
  "/ventas",
  verificarToken,
  permitirRoles("admin", "cajero"),
  async (req, res) => {

  const client = await db.connect();

  try {

    const {
      productos,
      pago,
      empresa_id,
      creditos_pendientes,
      clave_operacion,
    } = req.body;

    empresaIdFinal = obtenerEmpresaId(req);
    claveOperacion = String(clave_operacion || pago?.clave_operacion || "").trim();
    const turnoCaja = await obtenerCajaAbierta(req.user.id, empresaIdFinal);

    if (!turnoCaja) {
      return res.status(400).json({
        error: "Debe aperturar caja antes de realizar ventas",
      });
    }

    const creditosPendientes = Array.isArray(creditos_pendientes)
      ? creditos_pendientes
      : [];

    if (
      (!Array.isArray(productos) || productos.length === 0) &&
      creditosPendientes.length === 0
    ) {
      return res.status(400).json({
        error: "Venta sin productos o creditos pendientes",
      });
    }

    let total = 0;
    const productosVenta = [];

    await client.query("BEGIN");

    if (claveOperacion) {
      const ventaExistente = await client.query(
        `
        SELECT *
        FROM ventas
        WHERE empresa_id = $1
        AND clave_operacion = $2
        LIMIT 1
        `,
        [empresaIdFinal, claveOperacion]
      );

      if (ventaExistente.rows.length > 0) {
        await client.query("COMMIT");
        return res.json(ventaExistente.rows[0]);
      }
    }

    for (const item of productos || []) {

      const cantidad = Number(item.cantidad);

      if (
        !Number.isFinite(cantidad) ||
        cantidad <= 0
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: "Cantidad invalida en venta",
        });
      }

      const result = await client.query(
        `
        SELECT *
        FROM productos
        WHERE id = $1
        AND empresa_id = $2
        FOR UPDATE
        `,
        [
          item.producto_id,
          empresaIdFinal,
        ]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          error: "Producto no encontrado",
        });
      }

      const producto = result.rows[0];
      const controlaStock = producto.controla_stock !== false;
      const complementos = Array.isArray(item.complementos)
        ? item.complementos
        : [];
      const totalExtras = complementos.reduce(
        (sum, grupo) =>
          sum +
          (Array.isArray(grupo.opciones)
            ? grupo.opciones.reduce(
                (sub, opcion) => sub + Number(opcion.precio_extra || 0),
                0
              )
            : 0),
        0
      );
      const precioUnitario = Number(producto.precio) + totalExtras;

      if (producto.habilitado_venta === false) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: `${producto.nombre} no esta habilitado para venta`,
        });
      }

      if (
        controlaStock &&
        Number(producto.existencia) < cantidad
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: `Stock insuficiente para ${producto.nombre}`,
        });
      }

      total += precioUnitario * cantidad;

      productosVenta.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: precioUnitario,
        cantidad,
        controlaStock,
        departamento: String(producto.departamento || "").trim().toUpperCase(),
        complementos,
        observacion: String(item.observacion || "").trim(),
      });
    }

    const creditosVenta = [];

    for (const item of creditosPendientes) {
      const ventaCreditoId = Number(item.venta_credito_id);

      if (!ventaCreditoId) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Credito pendiente invalido",
        });
      }

      const creditoResult = await client.query(
        `
        SELECT
          v.*,
          c.nombre AS cliente_cuenta_nombre,
          c.saldo_pendiente,
          c.saldo_favor
        FROM ventas v
        LEFT JOIN clientes c
          ON c.id = v.cliente_id
        WHERE v.id = $1
        AND v.empresa_id = $2
        AND v.tipo_comprobante = 'Credito'
        AND COALESCE(v.estado_cuenta, 'pendiente') = 'pendiente'
        FOR UPDATE OF v
        `,
        [
          ventaCreditoId,
          empresaIdFinal,
        ]
      );

      if (creditoResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: `Credito pendiente #${ventaCreditoId} no encontrado`,
        });
      }

      const credito = creditoResult.rows[0];
      const montoCredito = Number(credito.total || 0);

      total += montoCredito;

      creditosVenta.push({
        venta_credito_id: credito.id,
        cliente_id: credito.cliente_id,
        cliente_nombre:
          credito.cliente_cuenta_nombre ||
          credito.cliente_nombre ||
          "Cliente",
        monto: montoCredito,
      });
    }

    const subtotal = total;
    const pagoFinal = pago || {};
    const clientesCredito = [
      ...new Set(
        creditosVenta
          .map((credito) => credito.cliente_id)
          .filter(Boolean)
          .map((cliente) => Number(cliente))
      ),
    ];

    if (clientesCredito.length > 1) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "No se pueden cobrar creditos de clientes distintos en la misma venta",
      });
    }

    const tipoComprobante =
      pagoFinal.tipo_comprobante === "Credito"
        ? "Credito"
        : pagoFinal.tipo_comprobante === "Recibo"
        ? "Recibo"
        : "Factura";
    const esCredito = tipoComprobante === "Credito";
    const descuentoTipo =
      pagoFinal.descuento_tipo === "porcentaje"
        ? "porcentaje"
        : "monto";
    const descuentoValor = Number(pagoFinal.descuento_valor || 0);
    let descuentoMonto =
      descuentoTipo === "porcentaje"
        ? subtotal * Math.min(Math.max(descuentoValor, 0), 100) / 100
        : Math.min(Math.max(descuentoValor, 0), subtotal);

    total = Math.max(subtotal - descuentoMonto, 0);

    let clienteCuenta = null;
    const clienteId = pagoFinal.cliente_id || clientesCredito[0] || null;

    if (
      pagoFinal.cliente_id &&
      clientesCredito.length > 0 &&
      Number(pagoFinal.cliente_id) !== clientesCredito[0]
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "El cliente seleccionado no coincide con el credito pendiente",
      });
    }

    const saldoFavorSolicitado = Math.max(Number(pagoFinal.saldo_favor_usado || 0), 0);
    const saldoFavorUsado = esCredito
      ? 0
      : saldoFavorSolicitado;

    if (esCredito && creditosVenta.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "No se puede pagar un credito pendiente cargandolo nuevamente a credito",
      });
    }

    if (saldoFavorUsado > total) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "El saldo a favor usado no puede ser mayor al total",
      });
    }

    if (esCredito || saldoFavorUsado > 0 || creditosVenta.length > 0) {
      if (!clienteId) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: esCredito
            ? "Seleccione un cliente autorizado para credito"
            : "Seleccione un cliente para aplicar el pago",
        });
      }

      const clienteResult = await client.query(
        `
        SELECT *
        FROM clientes
        WHERE id = $1
        AND empresa_id = $2
        FOR UPDATE
        `,
        [
          clienteId,
          empresaIdFinal,
        ]
      );

      if (clienteResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: "Cliente no encontrado",
        });
      }

      clienteCuenta = clienteResult.rows[0];

      if (clienteCuenta.estado !== "activo") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "El cliente no esta activo",
        });
      }
    }

    if (saldoFavorUsado > 0) {
      const saldoFavorDisponible = Number(clienteCuenta.saldo_favor || 0);

      if (saldoFavorUsado > saldoFavorDisponible) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "El saldo a favor disponible no es suficiente",
        });
      }
    }

    if (esCredito) {
      if (clienteCuenta.permite_credito !== true) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "El cliente no esta autorizado para credito",
        });
      }

      const saldoPendiente = Number(clienteCuenta.saldo_pendiente || 0);
      const limiteCredito = Number(clienteCuenta.limite_credito || 0);

      if (saldoPendiente + total > limiteCredito) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "El credito supera el limite autorizado del cliente",
        });
      }
    }

    const ventaResult = await client.query(
      `
      INSERT INTO ventas
      (
        subtotal,
        descuento_tipo,
        descuento_valor,
        descuento_monto,
        total,
        metodo_pago,
        efectivo_recibido,
        cambio,
        tarjeta_autorizacion,
        tarjeta_monto,
        transferencia_monto,
        transferencia_codigo,
        saldo_favor_usado,
        tipo_comprobante,
        recibo_codigo,
        cliente_nit,
        cliente_nombre,
        cliente_direccion,
        cliente_id,
        es_credito,
        estado_cuenta,
        caja_turno_id,
        clave_operacion,
        usuario_id,
        empresa_id
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING *
      `,
      [
        subtotal,
        descuentoTipo,
        descuentoValor,
        descuentoMonto,
        total,
        esCredito ? "Credito" : pagoFinal.metodo_pago || "",
        esCredito ? 0 : Number(pagoFinal.efectivo_recibido || 0),
        esCredito ? 0 : Number(pagoFinal.cambio || 0),
        esCredito ? "" : pagoFinal.tarjeta_autorizacion || "",
        esCredito ? 0 : Number(pagoFinal.tarjeta_monto || 0),
        esCredito ? 0 : Number(pagoFinal.transferencia_monto || 0),
        esCredito ? "" : pagoFinal.transferencia_codigo || "",
        saldoFavorUsado,
        tipoComprobante,
        esCredito ? "" : pagoFinal.recibo_codigo || "",
        pagoFinal.cliente_nit || clienteCuenta?.nit || "",
        pagoFinal.cliente_nombre || clienteCuenta?.nombre || "",
        pagoFinal.cliente_direccion || clienteCuenta?.direccion || "",
        clienteId,
        esCredito,
        esCredito ? "pendiente" : "pagada",
        turnoCaja.id,
        claveOperacion || null,
        req.user.id,
        empresaIdFinal,
      ]
    );

    const venta = ventaResult.rows[0];

    if (saldoFavorUsado > 0 && clienteCuenta) {
      const saldoFavorAnterior = Number(clienteCuenta.saldo_favor || 0);
      const saldoFavorNuevo = saldoFavorAnterior - saldoFavorUsado;
      const saldoPendienteActual = Number(clienteCuenta.saldo_pendiente || 0);

      await client.query(
        `
        UPDATE clientes
        SET saldo_favor = $1
        WHERE id = $2
        AND empresa_id = $3
        `,
        [
          saldoFavorNuevo,
          clienteCuenta.id,
          empresaIdFinal,
        ]
      );

      await client.query(
        `
        INSERT INTO clientes_movimientos
        (
          cliente_id,
          tipo,
          monto,
          venta_id,
          motivo,
          saldo_favor_anterior,
          saldo_favor_nuevo,
          saldo_pendiente_anterior,
          saldo_pendiente_nuevo,
          usuario_id,
          empresa_id
        )
        VALUES
        ($1,'uso_saldo_favor',$2,$3,$4,$5,$6,$7,$7,$8,$9)
        `,
        [
          clienteCuenta.id,
          saldoFavorUsado,
          venta.id,
          `Uso de saldo a favor venta #${venta.id}`,
          saldoFavorAnterior,
          saldoFavorNuevo,
          saldoPendienteActual,
          req.user.id,
          empresaIdFinal,
        ]
      );

      clienteCuenta.saldo_favor = saldoFavorNuevo;
    }

    if (esCredito && clienteCuenta) {
      const saldoFavorAnterior = Number(clienteCuenta.saldo_favor || 0);
      const saldoPendienteAnterior = Number(clienteCuenta.saldo_pendiente || 0);
      const saldoPendienteNuevo = saldoPendienteAnterior + total;

      await client.query(
        `
        UPDATE clientes
        SET saldo_pendiente = $1
        WHERE id = $2
        AND empresa_id = $3
        `,
        [
          saldoPendienteNuevo,
          clienteCuenta.id,
          empresaIdFinal,
        ]
      );

      await client.query(
        `
        INSERT INTO clientes_movimientos
        (
          cliente_id,
          tipo,
          monto,
          venta_id,
          motivo,
          saldo_favor_anterior,
          saldo_favor_nuevo,
          saldo_pendiente_anterior,
          saldo_pendiente_nuevo,
          usuario_id,
          empresa_id
        )
        VALUES
        ($1,'consumo_credito',$2,$3,$4,$5,$5,$6,$7,$8,$9)
        `,
        [
          clienteCuenta.id,
          total,
          venta.id,
          `Consumo a credito venta #${venta.id}`,
          saldoFavorAnterior,
          saldoPendienteAnterior,
          saldoPendienteNuevo,
          req.user.id,
          empresaIdFinal,
        ]
      );
    }

    for (const credito of creditosVenta) {
      const clienteCreditoResult = await client.query(
        `
        SELECT *
        FROM clientes
        WHERE id = $1
        AND empresa_id = $2
        FOR UPDATE
        `,
        [
          credito.cliente_id,
          empresaIdFinal,
        ]
      );

      if (clienteCreditoResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: "Cliente del credito pendiente no encontrado",
        });
      }

      const clienteCredito = clienteCreditoResult.rows[0];
      const saldoFavorAnterior = Number(clienteCredito.saldo_favor || 0);
      const saldoPendienteAnterior = Number(clienteCredito.saldo_pendiente || 0);
      const saldoPendienteNuevo = Math.max(
        saldoPendienteAnterior - Number(credito.monto || 0),
        0
      );

      await client.query(
        `
        UPDATE ventas
        SET estado_cuenta = 'pagada'
        WHERE id = $1
        AND empresa_id = $2
        `,
        [
          credito.venta_credito_id,
          empresaIdFinal,
        ]
      );

      await client.query(
        `
        UPDATE clientes
        SET saldo_pendiente = $1
        WHERE id = $2
        AND empresa_id = $3
        `,
        [
          saldoPendienteNuevo,
          credito.cliente_id,
          empresaIdFinal,
        ]
      );

      await client.query(
        `
        INSERT INTO clientes_movimientos
        (
          cliente_id,
          tipo,
          monto,
          venta_id,
          motivo,
          saldo_favor_anterior,
          saldo_favor_nuevo,
          saldo_pendiente_anterior,
          saldo_pendiente_nuevo,
          usuario_id,
          empresa_id
        )
        VALUES
        ($1,'pago_credito',$2,$3,$4,$5,$5,$6,$7,$8,$9)
        `,
        [
          credito.cliente_id,
          credito.monto,
          venta.id,
          `Pago de credito venta #${credito.venta_credito_id}`,
          saldoFavorAnterior,
          saldoPendienteAnterior,
          saldoPendienteNuevo,
          req.user.id,
          empresaIdFinal,
        ]
      );

      await client.query(
        `
        INSERT INTO detalle_ventas
        (
          venta_id,
          producto_id,
          cantidad,
          precio,
          descripcion,
          complementos
        )
        VALUES
        ($1,NULL,1,$2,$3,'[]'::jsonb)
        `,
        [
          venta.id,
          credito.monto,
          `Cobro credito venta #${credito.venta_credito_id} - ${credito.cliente_nombre}`,
        ]
      );
    }

    for (const producto of productosVenta) {

      await client.query(
        `
        INSERT INTO detalle_ventas
        (
          venta_id,
          producto_id,
          cantidad,
          precio,
          descripcion,
          observacion,
          complementos
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          venta.id,
          producto.id,
          producto.cantidad,
          producto.precio,
          producto.nombre,
          producto.observacion,
          JSON.stringify(producto.complementos || []),
        ]
      );

      if (producto.controlaStock) {
        await client.query(
          `
          UPDATE productos
          SET existencia = existencia - $1
          WHERE id = $2
          AND empresa_id = $3
          `,
          [
            producto.cantidad,
            producto.id,
            empresaIdFinal,
          ]
        );

        await client.query(
          `
          INSERT INTO movimientos_inventario
          (
            producto_id,
            tipo,
            cantidad,
            motivo,
            usuario_id,
            empresa_id
          )
          VALUES
          ($1,$2,$3,$4,$5,$6)
          `,
          [
            producto.id,
            "salida",
            producto.cantidad,
            `Venta #${venta.id}`,
            req.user.id,
            empresaIdFinal,
          ]
        );
      }
    }

    const productosPorDepartamento = productosVenta.reduce((acc, producto) => {
      const departamento = producto.departamento;

      if (!departamento || departamento === "NO APLICA") {
        return acc;
      }

      if (!acc[departamento]) {
        acc[departamento] = [];
      }

      acc[departamento].push(producto);
      return acc;
    }, {});

    const nombreComanda =
      String(pagoFinal.comanda_nombre || "").trim() ||
      String(clienteCuenta?.nombre || pagoFinal.cliente_nombre || "CONSUMIDOR FINAL").trim();

    for (const departamento of Object.keys(productosPorDepartamento)) {
      const comandaResult = await client.query(
        `
        INSERT INTO comandas
        (
          venta_id,
          departamento,
          nombre_cliente,
          observacion,
          estado,
          usuario_id,
          empresa_id
        )
        VALUES
        ($1,$2,$3,$4,'PENDIENTE',$5,$6)
        RETURNING id
        `,
        [
          venta.id,
          departamento,
          nombreComanda,
          "",
          req.user.id,
          empresaIdFinal,
        ]
      );

      for (const producto of productosPorDepartamento[departamento]) {
        await client.query(
          `
          INSERT INTO comanda_detalle
          (
            comanda_id,
            producto_id,
            producto,
            cantidad,
            observacion,
            complementos
          )
          VALUES
          ($1,$2,$3,$4,$5,$6)
          `,
          [
            comandaResult.rows[0].id,
            producto.id,
            producto.nombre,
            producto.cantidad,
            producto.observacion,
            JSON.stringify(producto.complementos || []),
          ]
        );
      }
    }

    const montoCreditosCobrados = redondearMoneda(
      creditosVenta.reduce((sum, credito) => sum + Number(credito.monto || 0), 0)
    );
    const montoVentaProductos = redondearMoneda(total - montoCreditosCobrados);
    const calcularPagosNetos = () => {
      if (esCredito) {
        return {
          efectivo: 0,
          tarjeta: 0,
          transferencia: 0,
        };
      }

      let cambioPendiente = redondearMoneda(Number(pagoFinal.cambio || 0));

      const descontarCambio = (monto) => {
        const bruto = redondearMoneda(Number(monto || 0));
        const descuento = Math.min(bruto, cambioPendiente);
        cambioPendiente = redondearMoneda(cambioPendiente - descuento);
        return redondearMoneda(bruto - descuento);
      };

      return {
        efectivo: descontarCambio(pagoFinal.efectivo_recibido),
        tarjeta: descontarCambio(pagoFinal.tarjeta_monto),
        transferencia: descontarCambio(pagoFinal.transferencia_monto),
      };
    };

    const pagosNetos = calcularPagosNetos();
    const efectivoNeto = pagosNetos.efectivo;
    const tarjetaMonto = pagosNetos.tarjeta;
    const transferenciaMonto = pagosNetos.transferencia;
    const ventaFactura = tipoComprobante === "Factura" && montoVentaProductos > 0;
    const ventaNeta = ventaFactura
      ? redondearMoneda(montoVentaProductos / 1.12)
      : montoVentaProductos;
    const ivaVenta = ventaFactura
      ? redondearMoneda(montoVentaProductos - ventaNeta)
      : 0;

    const lineasPartidaVenta = [
      {
        cuenta: "101",
        debe: efectivoNeto,
        descripcion: `Efectivo venta #${venta.id}`,
      },
      {
        cuenta: "102",
        debe: redondearMoneda(tarjetaMonto + transferenciaMonto),
        descripcion: `Banco/tarjeta venta #${venta.id}`,
      },
      {
        cuenta: "204",
        debe: saldoFavorUsado,
        descripcion: `Uso de saldo a favor venta #${venta.id}`,
      },
      {
        cuenta: "103",
        debe: esCredito ? total : 0,
        descripcion: `Credito cliente venta #${venta.id}`,
      },
      {
        cuenta: "401",
        haber: ventaNeta,
        descripcion: `Ingreso venta #${venta.id}`,
      },
      {
        cuenta: "202",
        haber: ivaVenta,
        descripcion: `IVA debito venta #${venta.id}`,
      },
      {
        cuenta: "103",
        haber: montoCreditosCobrados,
        descripcion: `Cobro de creditos en venta #${venta.id}`,
      },
    ];

    if (redondearMoneda(total) > 0 || montoCreditosCobrados > 0) {
      await registrarPartidaContable(client, {
        empresaId: empresaIdFinal,
        usuarioId: req.user.id,
        descripcion: `Venta #${venta.id} - ${tipoComprobante}`,
        origen: "venta",
        referenciaId: venta.id,
        referenciaCodigo: `${tipoComprobante}-${venta.id}`,
        lineas: lineasPartidaVenta,
      });
    }

    await client.query("COMMIT");

    res.json(ventaResult.rows[0]);

  } catch (error) {

    await client.query("ROLLBACK");

    if (error.code === "23505" && claveOperacion && empresaIdFinal) {
      const ventaExistente = await db.query(
        `
        SELECT *
        FROM ventas
        WHERE empresa_id = $1
        AND clave_operacion = $2
        LIMIT 1
        `,
        [empresaIdFinal, claveOperacion]
      );

      if (ventaExistente.rows.length > 0) {
        return res.json(ventaExistente.rows[0]);
      }
    }

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  } finally {

    client.release();

  }
});

app.use((error, req, res, next) => {
  if (error.type === "entity.too.large") {
    return res.status(413).json({
      error: "La imagen o informacion enviada es demasiado grande.",
    });
  }

  next(error);
});

/* =========================
   SERVER
========================= */

const inicializarBaseDatos = async () => {
  await inicializarDepartamentos();
  await inicializarComplementos();
  await inicializarComandas();
  await inicializarCaja();
  await inicializarSoporte();
  await inicializarContabilidad();
};

const iniciarServidor = async () => {
  await esperarPostgres();
  await inicializarBaseDatos();

  app.listen(PORT, () => {
    console.log(`Servidor funcionando en puerto ${PORT} (${APP_ENV})`);
  });
};

iniciarServidor().catch((error) => {
  console.error("No se pudo iniciar el servidor:", error);
});
