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
);

CREATE TABLE IF NOT EXISTS comanda_detalle (
  id SERIAL PRIMARY KEY,
  comanda_id INTEGER REFERENCES comandas(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  producto VARCHAR(160) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL,
  complementos JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE comandas
ADD COLUMN IF NOT EXISTS nombre_cliente VARCHAR(160);

ALTER TABLE comandas
ADD COLUMN IF NOT EXISTS observacion TEXT;
