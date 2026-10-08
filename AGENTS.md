# Instrucciones de desarrollo

La fuente de verdad del producto es Requisitos_Sistema_Procesos_v13.xlsx, suministrada por el responsable del producto. No está incorporada al repositorio todavía. No inventar requisitos ni cambiar su alcance sin aprobación. Consultar docs/especificacion.md y docs/arquitectura.md antes de modificar comportamiento.

## Reglas de trabajo

- TypeScript, Angular, NestJS, TypeORM y Oracle AI Database 26ai Free instalado directamente en el equipo local. Sin Docker. Destino definitivo on-premise sobre Oracle institucional; verificar compatibilidad con su versión y edición antes de desplegar.
- Mantener una aplicación backend. No introducir microservicios, capas o patrones sin necesidad concreta.
- Prototipo local con datos ficticios. Las identidades simuladas nunca están disponibles en producción.
- Todo endpoint requiere autenticación y una política explícita de autorización. Verificar permisos en el servidor y consultar perfiles actuales en cada solicitud.
- Migraciones versionadas; synchronize: false. Nunca borrar ni alterar una migración ya aplicada.
- Cada cambio debe referenciar requisitos, incluir verificación apropiada y tener revisión registrada antes de integrarse. La revisión de IA no sustituye la conformidad requerida para producción.
- No declarar cumplida una verificación que no se ejecutó. La autenticación simulada no cumple REQ-25.
- No incluir datos reales, secretos ni tokens en código, fixtures o registros.
- No modificar la planilla ni resolver decisiones de producto por cuenta propia.

## Principios técnicos obligatorios

Texto y verificación transcritos de la planilla v13.

### PT-01

Las decisiones de tecnología y arquitectura (incluidos dónde se guardan los archivos y cómo se documentan las interfaces) se documentan antes de construir y se respetan.

**Verificación:** El documento de arquitectura está en el repositorio; los cambios que se apartan de él se revisan.

### PT-02

Las reglas del proyecto, incluidos estos principios, están escritas en el repositorio en un archivo de instrucciones para quien desarrolle, sea persona o IA.

**Verificación:** El archivo existe y se actualiza cuando cambia un principio.

### PT-03

Los cambios que afectan el comportamiento del sistema cuentan con pruebas apropiadas y son revisados antes de integrarse.

**Verificación:** Cada cambio de comportamiento tiene pruebas (automáticas cuando es posible; si no, una prueba manual descrita) y una revisión registrada. La automatización se amplía progresivamente.

### PT-04

Los ambientes se instalan de forma reproducible, y nada llega a producción sin probarse en el ambiente de pruebas.

**Verificación:** Instalación desde cero en pruebas; conformidad del responsable del área antes de producción.

### PT-05

Los cambios en la estructura de datos se gestionan mediante mecanismos versionados y reproducibles.

**Verificación:** La estructura de datos se puede recrear desde cero en el ambiente de pruebas aplicando los cambios versionados.

### PT-06

Se usa OWASP ASVS nivel 2 como referencia de seguridad.

**Verificación:** Lista de verificación revisada antes de producción, con excepciones documentadas.

### PT-07

Cada permiso se verifica en el servidor en cada solicitud; ocultar un botón no es control de acceso.

**Verificación:** Pruebas automáticas que llaman directamente a la API sin permiso y esperan rechazo (403).

### PT-08

Todo dato externo es no confiable: se valida en el servidor, las consultas usan parámetros y lo que se muestra se escapa.

**Verificación:** Pruebas automáticas con entradas maliciosas; análisis de código (SAST) en la CI.

### PT-09

Las sesiones y credenciales de autenticación se gestionan de forma segura según el mecanismo de autenticación utilizado. La sesión se cierra tras 30 minutos de inactividad.

**Verificación:** Prueba de seguridad antes de producción que comprueba, según corresponda al mecanismo usado: expiración, invalidación al cerrar sesión, protección de tokens, atributos seguros de cookies, protección CSRF y otros controles aplicables.

### PT-10

La aplicación usa las protecciones estándar de su tipo de interfaz y sus mensajes de error no muestran detalles internos.

**Verificación:** Prueba de seguridad automática (DAST) sin hallazgos altos ni críticos; en interfaces web incluye, por ejemplo, cabeceras de seguridad como HSTS y CSP.

### PT-11

Las claves y credenciales nunca están en el código; se guardan como configuración segura de cada ambiente.

**Verificación:** La CI detecta claves en el repositorio y bloquea el cambio.

### PT-12

Las librerías de terceros no tienen vulnerabilidades conocidas críticas o altas, salvo excepción documentada.

**Verificación:** La CI revisa las dependencias en cada cambio y bloquea si encuentra alguna.

### PT-13

Los datos almacenados que lo requieran y los respaldos se protegen mediante controles de cifrado y acceso adecuados; los respaldos se guardan en una ubicación separada.

**Verificación:** Revisión de configuración antes de producción, junto con la prueba de restauración de los respaldos.

### PT-14

Cada componente tiene solo los permisos que necesita; la aplicación usa un usuario de base de datos con mínimos privilegios.

**Verificación:** Revisión de configuración antes de producción.
