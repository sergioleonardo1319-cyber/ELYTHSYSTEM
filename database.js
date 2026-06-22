const { Pool } = require("pg");
const { loadEnv } = require("./config/env");

loadEnv();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "127.0.0.1",
  database: process.env.DB_NAME || "pos",
  password: process.env.DB_PASSWORD || "1234",
  port: Number(process.env.DB_PORT || 5432),
});

module.exports = pool;
