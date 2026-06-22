INSERT INTO usuarios
(
  id,
  nombre,
  email,
  password,
  rol,
  empresa_id,
  usuario_login
)
VALUES
(
  1,
  'Administrador',
  'sergioleonardo1319@hotmail.com',
  'Sergio0219',
  'superadmin',
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  nombre = EXCLUDED.nombre,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  rol = EXCLUDED.rol,
  empresa_id = NULL,
  usuario_login = NULL;

SELECT setval('usuarios_id_seq', GREATEST((SELECT MAX(id) FROM usuarios), 1), true);
