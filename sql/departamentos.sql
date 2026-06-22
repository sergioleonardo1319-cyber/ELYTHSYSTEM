CREATE TABLE IF NOT EXISTS departamentos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fecha TIMESTAMP DEFAULT NOW(),
  UNIQUE (nombre, empresa_id)
);

INSERT INTO departamentos (nombre, empresa_id)
SELECT 'COCINA', e.id
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1
  FROM departamentos d
  WHERE d.empresa_id = e.id
  AND LOWER(d.nombre) = 'cocina'
);
