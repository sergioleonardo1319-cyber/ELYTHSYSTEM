CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER
        REFERENCES productos(id)
        ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,
    cantidad INTEGER NOT NULL,
    motivo TEXT,
    usuario_id INTEGER,
    empresa_id INTEGER NOT NULL,
    fecha TIMESTAMP DEFAULT NOW()
);
