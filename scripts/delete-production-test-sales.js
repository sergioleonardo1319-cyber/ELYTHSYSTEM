const { Pool } = require("pg");
const { loadEnv } = require("../config/env");

process.env.APP_ENV = process.env.APP_ENV || "production";
loadEnv();

const args = process.argv.slice(2);

const getArg = (name) => {
  const prefixed = `${name}=`;
  const found = args.find((arg) => arg.startsWith(prefixed));
  return found ? found.slice(prefixed.length) : "";
};

const ids = getArg("--ids")
  .split(",")
  .map((item) => Number(item.trim()))
  .filter(Boolean);
const fecha = getArg("--fecha");
const force = args.includes("--force");

if (process.env.APP_ENV !== "production") {
  throw new Error("Este script solo debe ejecutarse con APP_ENV=production.");
}

if (ids.length === 0) {
  throw new Error("Indica ventas con --ids=1,2");
}

if (!fecha) {
  throw new Error("Indica fecha con --fecha=YYYY-MM-DD");
}

if (!force) {
  throw new Error("Agrega --force para confirmar la eliminacion definitiva.");
}

const usarSSL = String(process.env.DB_SSL || "").toLowerCase() === "true";

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: process.env.DB_USER || "postgres",
        host: process.env.DB_HOST || "127.0.0.1",
        database: process.env.DB_NAME || "pos",
        password: process.env.DB_PASSWORD || "1234",
        port: Number(process.env.DB_PORT || 5432),
        ssl: usarSSL ? { rejectUnauthorized: false } : false,
      }
);

const main = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ventasResult = await client.query(
      `
      SELECT *
      FROM ventas
      WHERE id = ANY($1::int[])
      AND fecha::date = $2::date
      ORDER BY id
      FOR UPDATE
      `,
      [ids, fecha]
    );

    const encontradas = ventasResult.rows;
    const encontradasIds = new Set(encontradas.map((venta) => Number(venta.id)));
    const noEncontradas = ids.filter((id) => !encontradasIds.has(id));

    if (noEncontradas.length > 0) {
      throw new Error(
        `No se encontraron estas ventas en ${fecha}: ${noEncontradas.join(", ")}`
      );
    }

    for (const venta of encontradas) {
      const ventaId = Number(venta.id);
      const detalles = await client.query(
        `
        SELECT dv.producto_id, dv.cantidad, p.controla_stock
        FROM detalle_ventas dv
        LEFT JOIN productos p ON p.id = dv.producto_id
        WHERE dv.venta_id = $1
        `,
        [ventaId]
      );

      for (const detalle of detalles.rows) {
        if (detalle.producto_id && detalle.controla_stock !== false) {
          await client.query(
            `
            UPDATE productos
            SET existencia = COALESCE(existencia, 0) + $1
            WHERE id = $2
            `,
            [Number(detalle.cantidad || 0), detalle.producto_id]
          );
        }
      }

      if (venta.cliente_id) {
        const saldoFavorUsado = Number(venta.saldo_favor_usado || 0);
        const total = Number(venta.total || 0);

        if (saldoFavorUsado > 0) {
          await client.query(
            `
            UPDATE clientes
            SET saldo_favor = COALESCE(saldo_favor, 0) + $1
            WHERE id = $2
            `,
            [saldoFavorUsado, venta.cliente_id]
          );
        }

        if (venta.es_credito === true || venta.metodo_pago === "Credito") {
          await client.query(
            `
            UPDATE clientes
            SET saldo_pendiente = GREATEST(COALESCE(saldo_pendiente, 0) - $1, 0)
            WHERE id = $2
            `,
            [total, venta.cliente_id]
          );
        }
      }

      await client.query(
        `
        DELETE FROM clientes_movimientos
        WHERE venta_id = $1
        `,
        [ventaId]
      );

      await client.query(
        `
        DELETE FROM movimientos_inventario
        WHERE motivo = $1
        OR motivo LIKE $2
        `,
        [`Venta #${ventaId}`, `Venta #${ventaId} %`]
      );

      await client.query(
        `
        DELETE FROM detalle_ventas
        WHERE venta_id = $1
        `,
        [ventaId]
      );

      await client.query(
        `
        DELETE FROM comandas
        WHERE venta_id = $1
        `,
        [ventaId]
      );

      await client.query(
        `
        DELETE FROM ventas
        WHERE id = $1
        `,
        [ventaId]
      );
    }

    await client.query("COMMIT");

    console.log(
      `Ventas eliminadas definitivamente de productivo: ${ids.join(", ")}`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
