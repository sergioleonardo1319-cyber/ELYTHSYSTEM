import fs from "fs";
import path from "path";

const mode = process.argv[2] || "production";
const rootDir = path.resolve(import.meta.dirname, "..");
const configPath = path.join(rootDir, "capacitor.config.json");

const configs = {
  production: {
    appId: "com.cafeteria.pos",
    appName: "Cafeteria POS",
  },
  sandbox: {
    appId: "com.cafeteria.pos.sandbox",
    appName: "Cafeteria POS Sandbox",
  },
};

const selected = configs[mode];

if (!selected) {
  throw new Error(`Ambiente Capacitor no valido: ${mode}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const nextConfig = {
  ...config,
  appId: selected.appId,
  appName: selected.appName,
};

fs.writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`);

console.log(`Capacitor configurado para ${mode}: ${selected.appId}`);
