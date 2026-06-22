# Ambientes, Sandbox y APKs

## Ambientes

- Development: usa backend `http://localhost:3000` y base `pos`.
- Sandbox: usa backend `http://localhost:3001` y base `pos_sandbox`.
- Production: debe usar la URL real del backend productivo y una base productiva separada.

## Entrar A Productivo O Sandbox Desde El Login

El frontend puede conectarse a productivo o sandbox desde una sola pantalla de login.

Para usarlo localmente, abre tres terminales:

Terminal 1:

```bash
node server.js
```

Terminal 2:

```bash
npm run start:sandbox
```

Terminal 3:

```bash
cd frontend
npm run dev
```

Luego entra al frontend. El usuario configurado en `VITE_ENV_SELECTOR_USERS`
vera la opcion para elegir:

- Productivo: conecta con `http://localhost:3000`.
- Sandbox: conecta con `http://localhost:3001`.

Los demas usuarios entran directo a productivo y no ven el selector.

Para cambiar quien puede ver el selector, edita:

```text
frontend/.env.development
frontend/.env.sandbox
frontend/.env.production.example
```

Campo:

```text
VITE_ENV_SELECTOR_USERS=sergioleonardo1319@hotmail.com
```

Puedes colocar varios separados por coma:

```text
VITE_ENV_SELECTOR_USERS=sergioleonardo1319@hotmail.com,supervisor1,otro@correo.com
```

## Refrescar Sandbox

Para actualizar sandbox con una copia fresca de la base principal:

```bash
npm run sandbox:refresh
```

Este comando toma la base `pos` y reconstruye `pos_sandbox`.

## Preparar Frontend Para APK

Desde la carpeta `frontend`:

```bash
npm run prepare:apk:production
```

```bash
npm run prepare:apk:sandbox
```

Estos comandos generan `frontend/dist` con la configuracion correspondiente.

## Paso Pendiente Para APK Real

El proyecto Android se maneja con Capacitor.

Para sincronizar la app productiva:

```bash
cd frontend
npm run android:sync:production
```

Para sincronizar la app sandbox:

```bash
cd frontend
npm run android:sync:sandbox
```

Para abrir Android Studio:

```bash
cd frontend
npm run android:open
```

Para generar un APK debug desde consola, si Android Studio y el SDK estan instalados:

```bash
cd frontend
npm run apk:debug:production
```

```bash
cd frontend
npm run apk:debug:sandbox
```

Los APK debug quedan en:

```text
frontend/android/app/build/outputs/apk/debug/
```

La APK productiva usa el ID `com.cafeteria.pos`.
La APK sandbox usa el ID `com.cafeteria.pos.sandbox`.

## Requisito En La Computadora

Para compilar el APK real se necesita tener instalado:

- Android Studio.
- Android SDK.
- JDK configurado en `JAVA_HOME`.

Si al ejecutar `npm run apk:debug:sandbox` aparece `JAVA_HOME is not set`,
la app ya esta preparada, pero Windows aun no tiene Java/Android configurado.
