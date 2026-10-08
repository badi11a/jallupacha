# Arquitectura mínima y decisiones

Revisión C-001 v4: Oracle 26ai Free local, sin Docker. Distingue producto, entorno y datos de prueba; sustituye las versiones anteriores.

## Restricciones confirmadas

TypeScript y Angular; backend NestJS; destino on-premise. Desarrollo local con datos de prueba. Oracle AI Database 26ai Free instalado directamente en el computador local, sin Docker. Desarrollo directamente sobre Oracle; despliegue posterior en Oracle institucional. Google Workspace no disponible todavía.

## Componentes

- Angular: interfaz interna de perfiles, catálogos, fichas y revisión de procesos, árbol, búsqueda, historial, auditoría y alertas.
- NestJS: una API HTTP JSON bajo /api, autorización y reglas de negocio. Organizar por identidad, estructura, procesos/versiones, consulta, auditoría y seguridad; no crear servicios distribuidos.
- Oracle 26ai Free: persistencia, restricciones y transacciones mediante TypeORM.
- Sesiones: persistidas en Oracle 26ai Free para invalidación y expiración; cookie HttpOnly, SameSite y Secure bajo HTTPS. Proxy HTTPS del despliegue definitivo por concretar.

Angular nunca accede directamente a la base. API y frontend usan el mismo origen mediante proxy de desarrollo. El acceso local de desarrollo solo escucha en localhost. La base local se utiliza únicamente para desarrollo con datos de prueba y su acceso se restringe al equipo de desarrollo.

## Modelo inicial

- Usuario: identificador interno, identidad institucional separada y estado.
- Identidad: usuario, nombre, correo y asociación al proveedor; de prueba en el entorno local.
- Perfil y UsuarioPerfil: los cuatro perfiles fijos y asignaciones múltiples con clave única compuesta.
- ControlAdministradores: una fila usada para serializar mutaciones del perfil Administrador.
- Macroproceso: identificador, código único inmutable, nombre, descripción, orden y activo.
- TipoProceso: identificador, nombre y activo.
- Auditoria: identificador, fecha UTC, actor interno, acción, tipo/id de entidad y valores antes/después sin datos identificativos personales.
- Sesion: referencia de usuario, hash del identificador aleatorio, última actividad y expiración. Nunca registrar el valor de la cookie.

- Proceso: ID interno, código único, propietario vigente, referencia a versión vigente y desactivación.
- VersionProceso: ID, proceso, número de versión, estado, macroproceso, tipo, campos de ficha, revisión técnica, autor/fecha y aprobación o rechazo. Referencias a catálogos con claves foráneas. Datos de historial conservados sin borrar versiones.
- CambioProceso: versión, fecha, actor interno y cambios sin datos identificativos personales.
- EventoSeguridad: fecha, actor interno opcional, referencia separada a IP, evento y resultado. IP anonimizable sin alterar evidencia no identificativa.
- AlertaSeguridad: usuario interno, intervalo y fecha; visible solo a Administrador.

No crear tablas de riesgos, documentos, unidades ni relaciones mientras sus funciones estén fuera de alcance.

## Interfaces necesarias

- GET /api/me; POST /api/auth/demo/session; POST /api/auth/logout.
- GET /api/users; PUT /api/users/:id/profiles, solo Administrador y con restricciones de REQ-26.
- GET/POST /api/macroprocesses; PATCH /api/macroprocesses/:id; POST /api/macroprocesses/:id/deactivate.
- GET/POST /api/process-types; PATCH /api/process-types/:id; POST /api/process-types/:id/deactivate.
- GET /api/audit, solo Administrador, con paginación limitada.

Lectura de catálogos para usuarios autenticados; creación, edición y desactivación de macroprocesos y tipos solo Administrador. Esta restricción se limita a los catálogos. El endpoint /api/auth/demo/session se habilita únicamente bajo los controles documentados. Usar DTO validados y OpenAPI generado, con pruebas de políticas de cada ruta. 400 para entrada inválida, 401 sin autenticación, 403 sin permiso y 409 para conflictos de estado o concurrencia.

- GET/POST /api/processes; GET/PATCH /api/processes/:id; GET /api/processes/:id/history.
- POST /api/processes/:id/submit, /approve, /reject, /obsolete y /discard-draft, según actor y estado. Enviar ID de versión y revisión técnica en mutaciones.
- GET /api/tree y GET /api/search con paginación y límite.
- GET /api/security-alerts, GET /api/users/:id/personal-data y POST /api/users/:id/anonymize, solo Administrador.
- GET /api/auth/google y callback para el mecanismo institucional; se implementan cuando exista configuración Google autorizada. Validar identidad y dominio en el servidor.

## Persistencia y compatibilidad

TypeORM con driver Oracle; synchronize: false. Migraciones versionadas y cuenta distinta con permisos de cambio de esquema. La cuenta de ejecución no altera esquema ni borra auditoría.

Usar el driver Oracle de TypeORM con node-oracledb. Conexión definida por ambiente mediante host, puerto, servicio, usuario y contraseña; ningún secreto se versiona. Usuario/esquema dedicado para la aplicación, sin usar SYS/SYSTEM. Separar permisos de ejecución y migraciones.

Identificadores numéricos generados por secuencias Oracle. Fechas de eventos en UTC. Valores antes/después como JSON serializado en CLOB, validado en la aplicación. Banderas persistidas con NUMBER(1) y restricción 0/1; no depender del BOOLEAN SQL reciente. Considerar que Oracle trata las cadenas vacías como NULL en validación y consultas. Definir longitudes y nulabilidad explícitas en entidades y migraciones.

Pruebas de restricciones, transacciones, bloqueos y concurrencia se ejecutan en Oracle real. Evitar funciones recientes o exclusivas de edición que no sean necesarias. No asumir compatibilidad con la versión institucional desconocida: antes del despliegue recrear el esquema y ejecutar pruebas contra esa versión. La transferencia a la base institucional usa migraciones versionadas y, si corresponde, un procedimiento explícito de traslado de datos; no copiar automáticamente la base local.

## Ejecución y pruebas

Angular y NestJS se ejecutan con Node.js/npm en el equipo local, conectados a la instalación nativa de Oracle 26ai Free. Documentar instalación, configuración, creación del esquema, aplicación de migraciones y carga de datos de prueba para reproducir el ambiente desde cero. Restablecimiento de datos de prueba explícito y restringido al esquema local de pruebas, sin afectar otros esquemas. Docker y Docker Compose no forman parte del entorno acordado. Versiones de runtime y dependencias fijadas al crear el scaffold, lockfile incluido. No cambiar versiones arbitrariamente durante generación con IA.

Pruebas unitarias de reglas, integración Oracle 26ai Free de restricciones/transacciones y concurrencia, API de autorización y pruebas funcionales Angular. CI ejecuta las verificaciones exigidas por PT-03, PT-08, PT-11 y PT-12. El incremento 1 está implementado según el informe de Copilot; registrar por separado la evidencia efectiva de CI y pruebas, sin presumir su ejecución.

## Decisiones postergadas

Versión y edición de Oracle institucional, infraestructura institucional, integración Google y dominio permitido, proxy definitivo y almacenamiento de archivos. No afectan a preparar el incremento local, pero las decisiones pertinentes deben documentarse antes de construir cada función o desplegarla.

## Modelo de verificación transversal

Sesiones con expiración por inactividad de 30 minutos, cierre explícito e invalidación. Protección CSRF en escrituras, validación de DTO y escape de salida. Límite configurable por origen con 429 sin bloquear a usuarios de otros orígenes; valores concretos de límites se fijan y verifican con la prueba de carga. Cabeceras CSP/HSTS para HTTPS y errores sin detalles internos.

Respaldo diario de base de datos con cuenta específica, ubicación separada y control de acceso/cifrado; restaurar en instancia aislada antes de producción. El entorno local HTTP no valida REQ-30 ni HSTS. No excluirlos del alcance.

La autenticación local, el dominio Google pendiente y la versión Oracle institucional son restricciones técnicas registradas, no preguntas abiertas de requisitos. No modificar la planilla.

## Cuentas y permisos Oracle

Usar dos cuentas distintas en el servicio/PDB local:

- Propietaria del esquema: crea objetos y aplica migraciones. Sus credenciales no se usan en el proceso normal del backend.
- Ejecución: sin objetos propios ni privilegios DDL; recibe CREATE SESSION y permisos específicos sobre objetos del esquema propietario. Referenciar el esquema explícitamente en TypeORM.

La cuenta de ejecución recibe SELECT/INSERT sobre Auditoria, CambioProceso y EventoSeguridad, sin UPDATE/DELETE. Las asociaciones identificativas y las IP se guardan en tablas separadas; estas sí admiten los cambios necesarios para REQ-49. No colocar datos personales identificativos en el contenido inmutable. Otorgar los permisos de actualización de negocio y gestión de sesiones únicamente sobre sus tablas respectivas. No usar SYS/SYSTEM para ejecutar la aplicación.

Verificación: una prueba conectada como cuenta de ejecución intenta modificar/borrar auditoría y recibe rechazo de Oracle; otra comprueba anonimización de identidad e IP sin alterar auditoría/historial. La cuenta propietaria es administrativa y se protege fuera del acceso de la aplicación; la restricción de ejecución no implica inmunidad frente a administradores de base.

## Políticas de autorización por operación

| Operación | Permiso y condición |
| --- | --- |
| Leer ficha, árbol y búsqueda | Cualquier usuario autenticado, sin añadir filtro obligatorio por estado. |
| Crear proceso | Dueño de proceso. Administrador puede realizar carga inicial conforme REQ-26 y el perfil descrito en Inicio. |
| Editar proceso | Dueño responsable del proceso o Administrador. |
| Reasignar responsable | Administrador; destino con perfil Dueño de proceso. PATCH /api/processes/:id/owner. |
| Enviar Borrador a revisión | Dueño responsable. |
| Aprobar/rechazar En revisión | Administrador; rechazo requiere motivo. |
| Marcar Vigente Obsoleto | Administrador. |
| Descartar Borrador contemplado por REQ-56 | Dueño responsable; desactivación sin borrado físico. |
| Leer historial del proceso | Dueño responsable, conforme REQ-09. |
| Administrar perfiles y catálogos | Administrador, respetando las restricciones originales. |
| Consultar auditoría/alertas y gestionar derechos personales | Administrador. |

Una persona con varios perfiles obtiene las facultades de cada uno; ser Administrador no convierte automáticamente a la persona en dueño responsable. Todas las comprobaciones se ejecutan en el servidor, incluida pertenencia del ID de versión al proceso. Pruebas directas de API cubren cada ruta con actor autorizado y no autorizado.

## Autenticación local local

Desactivada por defecto. Solo se habilita con AUTH_MODE=demo y NODE_ENV=development; rechazar el arranque si AUTH_MODE=demo bajo otro entorno o con dirección de escucha distinta de loopback. Frontend y backend accesibles únicamente en el equipo local; no habilitar túneles ni publicación de este modo.

El selector solo ofrece identidades de prueba precargadas; el servidor comprueba su pertenencia a la semilla y no acepta perfiles enviados por el cliente. Crear sesión de servidor, proteger escrituras contra CSRF, cerrar e invalidar sesión y aplicar 30 minutos de inactividad. Mostrar un único aviso discreto de acceso local, conforme a la sección Presentación del producto de docs/especificacion.md.

Pruebas automáticas de arranque inválido, identidad ajena a la semilla, perfiles falsificados, cierre y expiración. Este modo no satisface REQ-25 ni se distribuye como autenticación institucional.

## Instalación reproducible prevista

La implementación debe mantener estos pasos reproducibles y documentar los comandos concretos en docs/instalacion-windows.md:

1. Instalar Oracle 26ai Free local y las versiones fijadas de Node.js y herramientas del proyecto. Registrar versión exacta y requisitos del equipo.
2. Conectar al servicio/PDB de desarrollo; crear las cuentas propietaria y de ejecución con cuota y permisos mínimos. El script administrativo se ejecuta por un operador autorizado, no por el backend.
3. Configurar conexión mediante archivo local excluido de Git y proporcionar .env.example sin secretos. Nunca compartir contraseñas en documentación o CI.
4. Instalar dependencias mediante npm ci y aplicar migraciones con la cuenta propietaria, sin synchronize.
5. Ejecutar semilla idempotente: cuatro perfiles y macroprocesos Estratégicos, Misionales y de Apoyo en ese orden. La carga de datos de prueba es explícita y separada, crea usuarios de prueba y Administrador inicial sin sobrescribir cuentas existentes.
6. Arrancar backend y frontend en loopback. Verificar conexión, sesión local de prueba, permisos y persistencia tras reinicio.
7. Restablecer únicamente el esquema local de pruebas bajo un comando explícito con comprobación de ambiente y destino. Nunca restablecer automáticamente al arrancar ni apuntar al esquema institucional.

PT-04/PT-05 se verifican reproduciendo estos pasos sobre un esquema limpio. La instalación Oracle local no se borra como parte del restablecimiento.

## Lugar de ejecución de pruebas

Las pruebas de integración y concurrencia usan un esquema Oracle de pruebas dedicado en el computador local; nunca datos de producción ni el esquema de uso normal. Registrar comando, commit, versión Oracle y resultado antes de integrar cambios afectados.

La CI ejecuta comprobaciones estáticas, pruebas independientes de Oracle, SAST, secretos y dependencias. No conectar un runner público a la base institucional ni afirmar que la CI prueba Oracle si no tiene instancia asignada. Las pruebas Oracle locales con evidencia y revisión satisfacen la modalidad inicial de PT-03; ampliar automatización posteriormente sin cambiar las reglas del producto.

## Catálogos y versiones

Para REQ-04 y REQ-51 contar IDs de proceso distintos: un proceso activo referencia un catálogo si lo usa su versión Vigente o su versión de trabajo activa (Borrador/En revisión). No contar versiones históricas ni procesos Obsoletos o borradores descartados.

Crear o cambiar referencias exige catálogos activos. Las versiones históricas pueden conservar referencias a catálogos desactivados: no se reescribe el historial. Al aprobar, comprobar de nuevo los catálogos de la versión. La desactivación y las mutaciones de referencias comparten bloqueo transaccional para impedir carreras.

## Separación de entorno y presentación — C-001

Los identificadores existentes de configuración/API se conservan por compatibilidad; no son textos de presentación. AUTH_MODE=demo, los endpoints y los marcadores internos no se renombran solo por motivos de presentación. Los textos visibles siguen la sección Presentación del producto en especificacion.md.

Ajustar la semilla de nuevas instalaciones con nombres neutros. En instalaciones existentes, cualquier corrección de etiquetas se limita a identidades y registros inequívocamente identificados como semilla de desarrollo; no sobrescribir contenido editado por usuarios, no reiniciar perfiles ni borrar auditoría. Si se cambia un dato persistido, usar el mecanismo correspondiente, mantener idempotencia y registrar la modificación conforme a las reglas de auditoría.
