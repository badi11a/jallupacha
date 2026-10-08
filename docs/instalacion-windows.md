# Instalación local en Windows

Estos pasos preparan exclusivamente el incremento 1 con datos ficticios en Oracle local. La autenticación demo no implementa REQ-25 y no debe exponerse a la red ni usarse con información real. No se incluye Docker.

## Requisitos

- Windows 10/11 de 64 bits.
- Oracle AI Database 26ai Free instalado nativamente y un servicio/PDB local, por ejemplo `FREEPDB1`. Compruebe `sqlplus -v`, el servicio con `lsnrctl status` y el banner del motor ejecutando `SELECT BANNER FROM V$VERSION;` en SQL*Plus. El banner debe identificar **Oracle AI Database 26ai Free**; el número de release de SQL*Plus por sí solo no determina el nombre comercial del motor.
- Node.js 24.15.0 y npm 11.12.x (`node --version`, `npm --version`). El archivo `.nvmrc` fija Node.js.
- Git y PowerShell. No se necesita Angular CLI global.

El nombre `ORACLE_HOME` o una carpeta que diga `26ai` no demuestra la versión instalada: verifique el banner del motor. No conecte una cuenta institucional ni copie datos institucionales a este prototipo.

## Crear las cuentas Oracle

Use la consola SQL*Plus local como operador DBA autorizado, cambie a la PDB de desarrollo y cree dos usuarios distintos. No ejecute la aplicación como `SYS` ni `SYSTEM`, y no escriba las contraseñas en este archivo, en el historial de comandos ni en el repositorio.

```sql
sqlplus / as sysdba
ALTER SESSION SET CONTAINER=FREEPDB1;
```

En esa sesión, sustituya `JALLUPACHA_OWNER` y `JALLUPACHA_APP` solo si cambia también la configuración de ejemplo. Introduzca contraseñas locales seguras; no comparta la transcripción de SQL*Plus.

```sql
CREATE USER JALLUPACHA_OWNER IDENTIFIED BY "<contraseña-local>"
  DEFAULT TABLESPACE USERS TEMPORARY TABLESPACE TEMP QUOTA 200M ON USERS;
GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE TO JALLUPACHA_OWNER;

CREATE USER JALLUPACHA_APP IDENTIFIED BY "<otra-contraseña-local>"
  DEFAULT TABLESPACE USERS TEMPORARY TABLESPACE TEMP QUOTA 0 ON USERS;
GRANT CREATE SESSION TO JALLUPACHA_APP;
```

La cuenta propietaria queda reservada para migraciones y semilla. La cuenta de ejecución no tiene permisos DDL ni cuota; recibe solo los permisos de objetos enumerados en [`backend/database/grant-runtime.sql`](../backend/database/grant-runtime.sql). Ejecute ese archivo conectado como `JALLUPACHA_OWNER` después de migrar. Revise su contenido antes de ejecutarlo.

La instancia y el esquema deben ser locales y exclusivos para desarrollo. No se incluye un comando de borrado/restablecimiento.

## Configuración e instalación

Desde la raíz del repositorio, en PowerShell:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Edite el archivo local excluido de Git:

- `ORACLE_HOST`, `ORACLE_PORT` y `ORACLE_SERVICE`: conexión a la PDB local (normalmente `127.0.0.1`, `1521` y `freepdb1`).
- `ORACLE_SCHEMA=JALLUPACHA_OWNER`.
- `DATABASE_USER=JALLUPACHA_APP` y su `DATABASE_PASSWORD`.
- `MIGRATION_USER=JALLUPACHA_OWNER` y su `MIGRATION_PASSWORD`.
- Mantenga `NODE_ENV=development`, `AUTH_MODE=demo`, `DEMO_DATA_ENABLED=true`, `HOST=127.0.0.1` y `DEMO_UI_ORIGIN=http://127.0.0.1:4200` únicamente para la demostración local. El endpoint de sesión también verifica este `Origin`.

No añada contraseñas a `backend/.env.example`. Compruebe que `backend/.env` no aparece en `git status`.

Instale exactamente lo registrado en el lockfile:

```powershell
npm ci
```

Aplique el esquema versionado y luego cargue los datos ficticios iniciales. Ambos comandos usan la cuenta propietaria:

```powershell
npm run db:migrate
sqlplus JALLUPACHA_OWNER@//127.0.0.1:1521/freepdb1
@backend/database/grant-runtime.sql
npm run db:seed
```

SQL*Plus pedirá la contraseña de forma interactiva. La migración tiene `synchronize: false`; la API nunca ejecuta migraciones ni recibe credenciales de propietario.

La semilla es idempotente: crea perfiles si faltan, los tres macroprocesos iniciales con códigos `MP` generados, y cinco identidades demo ficticias terminadas en `example.test`. No reemplaza las identidades o asignaciones ya existentes. No hay contraseña para esas identidades; el selector demo local las usa solo para comprobar perfiles.

## Ejecutar

```powershell
npm run start:dev
```

Abra `http://127.0.0.1:4200`. Angular usa su proxy local `/api` hacia el backend en `127.0.0.1:3000`; ambos escuchan solo en loopback. El banner de demostración permanece visible tras ingresar. No habilite túneles ni cambie el host de escucha cuando `AUTH_MODE=demo`.

El backend emite cookies de sesión `HttpOnly`, `SameSite=Strict`, tokens aleatorios almacenados como hash en Oracle y expiración deslizante tras 30 minutos de inactividad. Las escrituras requieren el token CSRF asociado a la sesión. Los perfiles se consultan desde Oracle en cada solicitud. Auditoría guarda IDs internos y valores sin nombres, correos ni IP; los eventos de seguridad mantienen la IP en su tabla separada. La cuenta de ejecución tiene solo `SELECT`/`INSERT` sobre auditoría/eventos, sin `UPDATE`/`DELETE`.

## Comprobaciones

En otra consola:

```powershell
npm test
npm run test:api
npm run test:frontend
npm run build
npm run audit:dependencies
```

Genere la descripción OpenAPI (no la publica sin autenticación como una ruta HTTP):

```powershell
npm run docs:openapi --workspace backend
```

El comando genera `backend/openapi.json`. No incluya ese archivo en un despliegue sin aplicar la autorización correspondiente a la documentación.

Las pruebas automatizadas no sustituyen pruebas de migraciones, restricciones Oracle, concurrencia, privilegios efectivos, DAST, HTTPS/HSTS, accesibilidad manual, restauración de respaldos o carga con 20 usuarios. Ejecute esas verificaciones con Oracle 26ai Free y el entorno de pruebas antes de integrar o desplegar. La demo no satisface REQ-25.
