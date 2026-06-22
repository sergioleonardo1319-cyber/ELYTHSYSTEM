CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  nit VARCHAR(30),
  direccion TEXT,
  telefono VARCHAR(40),
  correo VARCHAR(120),
  fecha_cumpleanos DATE,
  permite_credito BOOLEAN DEFAULT FALSE,
  limite_credito NUMERIC(12,2) DEFAULT 0,
  saldo_favor NUMERIC(12,2) DEFAULT 0,
  saldo_pendiente NUMERIC(12,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'activo',
  empresa_id INTEGER NOT NULL,
  usuario_id INTEGER,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS clientes_movimientos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  venta_id INTEGER REFERENCES ventas(id) ON DELETE SET NULL,
  motivo TEXT,
  saldo_favor_anterior NUMERIC(12,2) DEFAULT 0,
  saldo_favor_nuevo NUMERIC(12,2) DEFAULT 0,
  saldo_pendiente_anterior NUMERIC(12,2) DEFAULT 0,
  saldo_pendiente_nuevo NUMERIC(12,2) DEFAULT 0,
  usuario_id INTEGER,
  empresa_id INTEGER NOT NULL,
  fecha TIMESTAMP DEFAULT NOW()
);

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL;

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS es_credito BOOLEAN DEFAULT FALSE;

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS estado_cuenta VARCHAR(20) DEFAULT 'pagada';
