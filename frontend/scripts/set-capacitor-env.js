import fs from "fs";
import path from "path";

const mode = process.argv[2] || "production";
const rootDir = path.resolve(import.meta.dirname, "..");
const configPath = path.join(rootDir, "capacitor.config.json");

const configs = {
  production: {
    appId: "com.elythsystems.pos",
    appName: "ELYTH POS",
    url: "https://elythsystem.vercel.app",
  },
  sandbox: {
    appId: "com.elythsystems.pos.sandbox",
    appName: "ELYTH POS Sandbox",
    url: "https://elythsystem.vercel.app",
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
  server: {
    ...(config.server || {}),
    url: selected.url,
    cleartext: false,
    androidScheme: "https",
  },
};

fs.writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`);

console.log(`Capacitor configurado para ${mode}: ${selected.appId}`);
