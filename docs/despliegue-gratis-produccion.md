# Despliegue Gratuito Inicial

Esta guia deja ELYTH POS listo para pruebas reales usando servicios gratuitos.

## Arquitectura Recomendada

- Base de datos: Neon PostgreSQL Free.
- Backend: Render Web Service Free.
- Frontend: Vercel Free.

## 1. Crear Base Productiva En Neon

Crear un proyecto PostgreSQL en Neon.

Guardar estos datos:

- Host.
- Database.
- User.
- Password.
- Port `5432`.

En Render se usaran como:

```text
DB_HOST=
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_SSL=true
```

Importar estructura y usuario inicial:

```bash
psql "postgresql://USER:PASSWORD@HOST/neondb?sslmode=require" -f database/schema.sql
psql "postgresql://USER:PASSWORD@HOST/neondb?sslmode=require" -f database/seed-superadmin.sql
```

## 2. Crear Base Sandbox En Neon

Crear otra base, proyecto o branch para sandbox.

En Render se usaran como:

```text
SANDBOX_DB_HOST=
SANDBOX_DB_PORT=5432
SANDBOX_DB_NAME=
SANDBOX_DB_USER=
SANDBOX_DB_PASSWORD=
SANDBOX_DB_SSL=true
```

Importar la misma estructura y usuario inicial:

```bash
psql "postgresql://USER:PASSWORD@HOST/neondb?sslmode=require" -f database/schema.sql
psql "postgresql://USER:PASSWORD@HOST/neondb?sslmode=require" -f database/seed-superadmin.sql
```

## 3. Subir Backend A Render

Crear un Web Service desde el repositorio.

Configuracion:

```text
Build Command: npm install
Start Command: npm start
Health Check Path: /health
```

Variables:

```text
APP_ENV=production
NODE_ENV=production
JWT_SECRET=crear_clave_larga_segura
DB_HOST=...
DB_PORT=5432
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_SSL=true
SANDBOX_DB_HOST=...
SANDBOX_DB_PORT=5432
SANDBOX_DB_NAME=...
SANDBOX_DB_USER=...
SANDBOX_DB_PASSWORD=...
SANDBOX_DB_SSL=true
```

## 4. Subir Frontend A Vercel

Crear proyecto usando la carpeta `frontend`.

Configuracion:

```text
Framework: Vite
Build Command: npm run build:production
Output Directory: dist
```

Variables:

```text
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
VITE_PRODUCTION_API_URL=https://tu-api.onrender.com
VITE_SANDBOX_API_URL=https://tu-api.onrender.com
VITE_ENV_SELECTOR_USERS=sergioleonardo1319@hotmail.com
```

Si luego se crea un backend sandbox separado, cambiar `VITE_SANDBOX_API_URL`.

## 5. Usuario Temporal Superadmin

Usuario:

```text
sergioleonardo1319@hotmail.com
```

Clave:

```text
Sergio0219
```

Despues de subir a produccion, conviene cambiar esta clave desde el sistema.

## 6. Primer Ingreso

Entrar al Panel Admin SaaS y crear la empresa real:

```text
Alma Gourmet 502
```

Por ahora solo es obligatorio el nombre comercial. Los datos fiscales se pueden llenar despues.
