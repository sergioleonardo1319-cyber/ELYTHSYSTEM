# ELYTH POS

Sistema POS SaaS para cafeterias y restaurantes.

## Modulos principales

- POS y ventas.
- Inventario, compras y proveedores.
- Clientes, credito y saldo a favor.
- Comandas por departamento.
- Caja, apertura, cierre y gastos.
- Contabilidad basica.
- Panel Admin SaaS.
- Ambientes productivo y sandbox.

## Backend

```bash
npm install
npm start
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Despliegue

La guia de despliegue gratuito inicial esta en:

```text
docs/despliegue-gratis-produccion.md
```

## Usuario inicial

El usuario superadmin inicial se crea con:

```text
database/seed-superadmin.sql
```

Despues del primer ingreso, cambiar la clave temporal desde el sistema.
