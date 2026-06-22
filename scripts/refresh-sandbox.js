const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const { loadEnv } = require("../config/env");

const projectRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const force = args.includes("--force");

const run = (command, commandArgs, env) => {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

const getConfig = (appEnv) => {
  process.env.APP_ENV = appEnv;
  loadEnv();

  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || "5432",
    database: process.env.DB_NAME,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    pgDumpPath: process.env.PG_DUMP_PATH || "pg_dump",
  };
};

const development = getConfig("development");
const sandbox = getConfig("sandbox");

if (!development.database || !sandbox.database) {
  throw new Error("DB_NAME debe estar configurado para development y sandbox.");
}

if (development.database === sandbox.database) {
  throw new Error("Sandbox y development no pueden usar la misma base de datos.");
}

const pgBin = path.dirname(development.pgDumpPath);
const psqlPath = path.join(pgBin, "psql.exe");
const createdbPath = path.join(pgBin, "createdb.exe");
const dropdbPath = path.join(pgBin, "dropdb.exe");
const pgRestorePath = path.join(pgBin, "pg_restore.exe");

const tempDir = path.join(projectRoot, "backups", "sandbox-refresh");
fs.mkdirSync(tempDir, { recursive: true });

const timestamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\..+/, "")
  .replace("T", "-");
const dumpFile = path.join(tempDir, `${development.database}-to-${sandbox.database}-${timestamp}.backup`);

const sourceEnv = {
  ...process.env,
  PGPASSWORD: development.password,
};

console.log(`Creando copia de ${development.database} para sandbox...`);
run(
  development.pgDumpPath,
  [
    "-h",
    development.host,
    "-p",
    development.port,
    "-U",
    development.user,
    "-F",
    "c",
    "-b",
    "-f",
    dumpFile,
    development.database,
  ],
  sourceEnv
);

const targetEnv = {
  ...process.env,
  PGPASSWORD: sandbox.password,
};

const exists = spawnSync(
  psqlPath,
  [
    "-h",
    sandbox.host,
    "-p",
    sandbox.port,
    "-U",
    sandbox.user,
    "-d",
    "postgres",
    "-tAc",
    `SELECT 1 FROM pg_database WHERE datname='${sandbox.database.replace(/'/g, "''")}'`,
  ],
  {
    encoding: "utf8",
    env: targetEnv,
  }
);

if (exists.status !== 0) {
  process.stderr.write(exists.stderr || "");
  process.exit(exists.status || 1);
}

if (exists.stdout.trim() === "1") {
  if (!force) {
    console.log(`La base ${sandbox.database} ya existe. Usa --force para refrescarla.`);
    process.exit(0);
  }

  console.log(`Eliminando base sandbox existente: ${sandbox.database}`);
  run(
    psqlPath,
    [
      "-h",
      sandbox.host,
      "-p",
      sandbox.port,
      "-U",
      sandbox.user,
      "-d",
      "postgres",
      "-c",
      `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${sandbox.database.replace(/'/g, "''")}'
      AND pid <> pg_backend_pid();
      `,
    ],
    targetEnv
  );

  run(
    dropdbPath,
    [
      "-h",
      sandbox.host,
      "-p",
      sandbox.port,
      "-U",
      sandbox.user,
      "--if-exists",
      sandbox.database,
    ],
    targetEnv
  );
}

console.log(`Creando base sandbox: ${sandbox.database}`);
run(
  createdbPath,
  [
    "-h",
    sandbox.host,
    "-p",
    sandbox.port,
    "-U",
    sandbox.user,
    sandbox.database,
  ],
  targetEnv
);

console.log(`Restaurando datos en ${sandbox.database}...`);
run(
  pgRestorePath,
  [
    "-h",
    sandbox.host,
    "-p",
    sandbox.port,
    "-U",
    sandbox.user,
    "-d",
    sandbox.database,
    "--no-owner",
    "--role",
    sandbox.user,
    dumpFile,
  ],
  targetEnv
);

console.log("Sandbox actualizado correctamente.");
