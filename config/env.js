const fs = require("fs");
const path = require("path");

const parseEnvFile = (filePath, override = false) => {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (override || !process.env[key]) {
      process.env[key] = value;
    }
  });
};

const loadEnv = () => {
  const rootDir = path.resolve(__dirname, "..");
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "development";

  parseEnvFile(path.join(rootDir, ".env"));
  parseEnvFile(path.join(rootDir, `.env.${appEnv}`), true);
};

module.exports = {
  loadEnv,
};
