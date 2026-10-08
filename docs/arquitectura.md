# Arquitectura mínima y decisiones

## Restricciones confirmadas

TypeScript y Angular; backend NestJS; destino on-premise. Prototipo local con datos ficticios. Oracle AI Database 26ai Free instalado directamente en el computador local, sin Docker. Desarrollo directamente sobre Oracle; despliegue posterior en Oracle institucional. Google Workspace no disponible todavía.

## Componentes

- Angular: interfaz interna, formularios de perfiles y catálogos, consulta de auditoría.
- NestJS: una API HTTP JSON bajo /api, autorización y reglas de negocio. Organizar por identidad, estructura y auditoría; no crear servicios distribuidos.
- Oracle 26ai Free: persistencia, restricciones y transacciones mediante TypeORM.
- Sesiones: persistidas en Oracle 26ai Free para invalidación y expiración; cookie HttpOnly, SameSite y Secure bajo HTTPS. Proxy HTTPS del despliegue definitivo por concretar.

Angular nunca accede directamente a la base. API y frontend usan el mismo origen mediante proxy de desarrollo. El modo simulado solo escucha en localhost. La base local se utiliza únicamente para desarrollo con datos ficticios y su acceso se restringe al equipo de desarrollo.

## Modelo inicial

- Usuario: identificador interno, identidad institucional separada y estado.
- Identidad: usuario, nombre, correo y asociación al proveedor; exclusivamente ficticios en demo.
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

Lectura de estructura para usuarios autenticados; mutaciones solo Administrador. Demo/session se habilita únicamente bajo los controles documentados. Usar DTO validados y OpenAPI generado, con pruebas de políticas de cada ruta. 400 para entrada inválida, 401 sin autenticación, 403 sin permiso y 409 para conflictos de estado o concurrencia.

- GET/POST /api/processes; GET/PATCH /api/processes/:id; GET /api/processes/:id/history.
- POST /api/processes/:id/submit, /approve, /reject, /obsolete y /discard-draft, según actor y estado. Enviar ID de versión y revisión técnica en mutaciones.
- GET /api/tree y GET /api/search con paginación y límite.
- GET /api/security-alerts, GET /api/users/:id/personal-data y POST /api/users/:id/anonymize, solo Administrador.
- GET /api/auth/google y callback para el mecanismo institucional; se implementan cuando exista configuración Google autorizada. Validar identidad y dominio en el servidor.

## Persistencia y compatibilidad

TypeORM recomendado para ambos motores; synchronize: false. Migraciones versionadas y cuenta distinta con permisos de cambio de esquema. La cuenta de ejecución no altera esquema ni borra auditoría.

Usar el driver Oracle de TypeORM con node-oracledb. Conexión definida por ambiente mediante host, puerto, servicio, usuario y contraseña; ningún secreto se versiona. Usuario/esquema dedicado para la aplicación, sin usar SYS/SYSTEM. Separar permisos de ejecución y migraciones.

Identificadores numéricos generados por secuencias Oracle. Fechas de eventos en UTC. Valores antes/después como JSON serializado en CLOB, validado en la aplicación. Banderas persistidas con NUMBER(1) y restricción 0/1; no depender del BOOLEAN SQL reciente. Considerar que Oracle trata las cadenas vacías como NULL en validación y consultas. Definir longitudes y nulabilidad explícitas en entidades y migraciones.

Pruebas de restricciones, transacciones, bloqueos y concurrencia se ejecutan en Oracle real. Evitar funciones recientes o exclusivas de edición que no sean necesarias. No asumir compatibilidad con la versión institucional desconocida: antes del despliegue recrear el esquema y ejecutar pruebas contra esa versión. La transferencia a la base institucional usa migraciones versionadas y, si corresponde, un procedimiento explícito de traslado de datos; no copiar automáticamente la base local.

## Ejecución y pruebas

Angular y NestJS se ejecutan con Node.js/npm en el equipo local, conectados a la instalación nativa de Oracle 26ai Free. Documentar instalación, configuración, creación del esquema, aplicación de migraciones y carga de datos ficticios para reproducir el ambiente desde cero. Restablecimiento de demo explícito y restringido al esquema local de pruebas, sin afectar otros esquemas. Docker y Docker Compose no forman parte del entorno acordado. Versiones de runtime y dependencias fijadas al crear el scaffold, lockfile incluido. No cambiar versiones arbitrariamente durante generación con IA.

Pruebas unitarias de reglas, integración Oracle 26ai Free de restricciones/transacciones y concurrencia, API de autorización y pruebas funcionales Angular. CI ejecuta las verificaciones exigidas por PT-03, PT-08, PT-11 y PT-12. No se ha creado ni ejecutado todavía el scaffold o la CI.

## Decisiones postergadas

Versión y edición de Oracle institucional, infraestructura institucional, integración Google y dominio permitido, proxy definitivo y almacenamiento de archivos. No afectan a preparar el incremento local, pero las decisiones pertinentes deben documentarse antes de construir cada función o desplegarla.

## Modelo de verificación transversal

Sesiones con expiración por inactividad de 30 minutos, cierre explícito e invalidación. Protección CSRF en escrituras, validación de DTO y escape de salida. Límite configurable por origen con 429 sin bloquear a usuarios de otros orígenes; valores concretos de límites se fijan y verifican con la prueba de carga. Cabeceras CSP/HSTS para HTTPS y errores sin detalles internos.

Respaldo diario de base de datos con cuenta específica, ubicación separada y control de acceso/cifrado; restaurar en instancia aislada antes de producción. El prototipo local HTTP no valida REQ-30 ni HSTS. No excluirlos del alcance.

La simulación, el dominio Google pendiente y la versión Oracle institucional son restricciones técnicas registradas, no preguntas abiertas de requisitos. No modificar la planilla.
