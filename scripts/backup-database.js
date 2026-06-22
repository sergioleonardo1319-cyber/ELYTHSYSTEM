const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const { loadEnv } = require("../config/env");

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
};

const appEnv = getArg("--env") || process.env.APP_ENV || "development";
const dryRun = args.includes("--dry-run");

process.env.APP_ENV = appEnv;
loadEnv();

const projectRoot = path.resolve(__dirname, "..");
const dbHost = process.env.DB_HOST || "127.0.0.1";
const dbPort = process.env.DB_PORT || "5432";
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER || "postgres";
const dbPassword = process.env.DB_PASSWORD || "";
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 30);
const pgDumpPath = process.env.PG_DUMP_PATH || "pg_dump";
let backupDir = process.env.BACKUP_DIR || "backups";

if (!dbName) {
  throw new Error("DB_NAME no esta configurado.");
}

if (!path.isAbsolute(backupDir)) {
  backupDir = path.join(projectRoot, backupDir);
}

const timestamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\..+/, "")
  .replace("T", "-");
const backupFile = path.join(
  backupDir,
  `${dbName}-${appEnv}-${timestamp}.backup`
);

console.log(`Ambiente: ${appEnv}`);
console.log(`Base de datos: ${dbName} en ${dbHost}:${dbPort}`);
console.log(`Destino: ${backupFile}`);

if (dryRun) {
  console.log("DryRun activo: no se creara archivo de respaldo.");
  process.exit(0);
}

fs.mkdirSync(backupDir, { recursive: true });

const result = spawnSync(
  pgDumpPath,
  [
    "-h",
    dbHost,
    "-p",
    dbPort,
    "-U",
    dbUser,
    "-F",
    "c",
    "-b",
    "-v",
    "-f",
    backupFile,
    dbName,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PGPASSWORD: dbPassword,
    },
  }
);

if (result.status !== 0) {
  process.exit(result.status || 1);
}

const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
for (const entry of fs.readdirSync(backupDir)) {
  if (!entry.endsWith(".backup")) continue;
  const fullPath = path.join(backupDir, entry);
  const stat = fs.statSync(fullPath);
  if (stat.mtimeMs < cutoff) {
    fs.unlinkSync(fullPath);
  }
}

console.log("Backup creado correctamente.");
