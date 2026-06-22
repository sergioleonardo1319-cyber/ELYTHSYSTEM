CREATE TABLE IF NOT EXISTS proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(50),
    email VARCHAR(150),
    direccion TEXT,
    empresa_id INTEGER NOT NULL,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compras (
    id SERIAL PRIMARY KEY,
    proveedor_id INTEGER
        REFERENCES proveedores(id)
        ON DELETE SET NULL,
    documento VARCHAR(100),
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    usuario_id INTEGER,
    empresa_id INTEGER NOT NULL,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compra_detalle (
    id SERIAL PRIMARY KEY,
    compra_id INTEGER
        REFERENCES compras(id)
        ON DELETE CASCADE,
    producto_id INTEGER
        REFERENCES productos(id)
        ON DELETE SET NULL,
    cantidad INTEGER NOT NULL,
    costo_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);
