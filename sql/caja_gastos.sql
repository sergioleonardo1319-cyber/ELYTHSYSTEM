CREATE TABLE IF NOT EXISTS caja_gastos (
  id SERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  autorizado_por VARCHAR(150) NOT NULL,
  usuario_id INTEGER,
  empresa_id INTEGER NOT NULL,
  fecha TIMESTAMP DEFAULT NOW()
);
