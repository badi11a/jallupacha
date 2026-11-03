# Instrucciones de desarrollo

La fuente de requisitos del producto es `Requisitos_Sistema_Procesos_v15.xlsx` (en `docs/referencias/Requisitos_Sistema_Procesos_v15.xlsx`), actualizada a la **Versión 15 (v15)** por decisión autorizada del responsable del producto para su operación en intranet mediante **Autenticación Local Institucional con Argon2id** (estableciendo REQ-25 para operación en red interna institucional) y reactivación del modelo institucional multiusuario con perfiles y ciclo de vida de procesos. La especificación y arquitectura vigentes son `docs/producto/especificacion_v15.md` y `docs/producto/arquitectura_v15.md`. La documentación histórica v13/v14 se retiró del árbol de trabajo mediante la purga autorizada C-040; los documentos versionados siguen recuperables desde Git. No inventar requisitos ni cambiar su alcance sin aprobación del responsable.

## Reglas de trabajo

- TypeScript, Angular, NestJS y TypeORM; Oracle Database 19c es la plataforma oficial para desarrollo, pruebas y producción. Instalación directa en el equipo local, sin Docker. El despliegue es on-premise; verificar versión, edición y compatibilidad de la instalación institucional antes de desplegar.
- Mantener una aplicación backend. No introducir microservicios, capas o patrones sin necesidad concreta.
- La aplicación es el producto institucional. Todo endpoint fuera de `/api/auth/login` requiere autenticación y una política explícita de autorización. Verificar permisos en el servidor y consultar perfiles actuales en cada solicitud (PT-07). La excepción del piloto de operador único (C-011) queda superada por la arquitectura multiusuario v15.
- Esquema Oracle versionado y reproducible; `synchronize: false`. El producto se instala desde un esquema vacío mediante el instalador vigente, no mediante una cadena incremental de migraciones de TypeORM. Git conserva el historial técnico de instaladores retirados. Si algún ambiente con datos institucionales debiera conservarlos, se diseña y aprueba por separado una migración de datos; nunca se presupone un reinicio destructivo.
- Permisos Oracle: solo en `backend/database/grant-runtime.sql` (objetos) y `grant-system.sql` (sistema); el instalador de esquema no otorga permisos. Ver `docs/producto/arquitectura_v15.md`, sección 6, «Operación e infraestructura».
- Cada cambio debe referenciar requisitos, incluir verificación apropiada y tener revisión registrada antes de integrarse.
- Ejecutar la verificación significativa más pequeña para el comportamiento afectado. Usar pruebas Oracle para persistencia, SQL, grants o transacciones; ampliar o repetir verificaciones solo cuando el impacto o un fallo lo justifique. Mantener PT-03 y ejecutar las verificaciones requeridas para liberar.
- Toda prueba `*.oracle.e2e-spec.ts` que inserte registros reales (`PROCESS`, `PROCESS_VERSION`, etc.) debe eliminarlos explícitamente en `afterAll`, usando los IDs capturados al crearlos, antes de cerrar la conexión. No usar transacciones con rollback como sustituto (atan la limpieza al motor de base de datos vigente). Un test que no deja la base como la encontró es un defecto de implementación, aunque sus aserciones pasen.
- No declarar cumplida una verificación que no se ejecutó. La autenticación local de desarrollo no cumple REQ-25.
- No incluir datos reales, secretos ni tokens en código, fixtures o registros.
- Datos estrictamente genéricos y neutrales: todo dato de prueba, semilla (seed), fixture, descripción y texto del sistema debe ser organizacionalmente neutro (utilizando términos como «la entidad», «la institución» o «la organización»). Queda estrictamente prohibido utilizar términos como «Universidad», facultades, departamentos académicos o copiar nombres, estadísticas, textos o literales del modelo de referencia o de cualquier institución específica.
- Configuración por variables de entorno; mantener `backend/.env.example` actualizado al añadir variables y validarlas en `backend/src/common/config.ts`.
- No modificar la planilla ni resolver decisiones de producto por cuenta propia.

## Principios técnicos obligatorios

Texto y verificación transcritos de la planilla v13. Rigen los principios listados (C-062).

### PT-01

Las decisiones de tecnología y arquitectura (incluidos dónde se guardan los archivos y cómo se documentan las interfaces) se documentan antes de construir y se respetan.

**Verificación:** El documento de arquitectura está en el repositorio; los cambios que se apartan de él se revisan.

### PT-02

Las reglas del proyecto, incluidos estos principios, están escritas en el repositorio en un archivo de instrucciones para quien desarrolle, sea persona o IA.

**Verificación:** El archivo existe y se actualiza cuando cambia un principio.

### PT-03

Los cambios que afectan el comportamiento del sistema cuentan con pruebas apropiadas y son revisados antes de integrarse.

**Verificación:** Cada cambio de comportamiento tiene pruebas (automáticas cuando es posible; si no, una prueba manual descrita) y una revisión registrada. La automatización se amplía progresivamente.

### PT-07

Cada permiso se verifica en el servidor en cada solicitud; ocultar un botón no es control de acceso.

**Verificación:** Pruebas automáticas que llaman directamente a la API sin permiso y esperan rechazo (403).

### PT-08

Todo dato externo es no confiable: se valida en el servidor, las consultas usan parámetros y lo que se muestra se escapa.

**Verificación:** Pruebas automáticas con entradas maliciosas.

## Correcciones mediante SDD

Antes de editar comportamiento, clasificar el hallazgo como defecto de implementación, defecto de especificación/diseño o cambio de producto. Identificar la fuente aplicable y escribir el comportamiento esperado con verificaciones concretas.

- Defecto de implementación: conservar la especificación y añadir prueba de regresión apropiada.
- Defecto de especificación/diseño: corregir primero el documento que define ese comportamiento y revisar la corrección antes de implementarla.
- Cambio de producto: señalarlo y obtener aprobación antes de ampliar o modificar requisitos.

Registrar el hallazgo, documentos afectados, corrección y evidencia de verificación en el mismo cambio de Git; no crear un sistema paralelo de seguimiento. Un prompt remite a esa base, no sustituye la especificación. No declarar verificado lo que no se ejecutó.

## Separación entre producto y entorno

No trasladar nombres de modos técnicos, fixtures, credenciales o condiciones del entorno a títulos, menús, botones o registros del producto sin una razón definida en la especificación. Los avisos de seguridad necesarios se mantienen en el lugar indicado, sin repetirse por toda la interfaz.

Al modificar la navegación, rutas o la estructura común de la interfaz, revisar por separado el contenido común y el contenido propio de cada ruta, y comprobar que ningún panel o función queda mostrado en una ruta que no le corresponde. Para el producto multiusuario vigente, las decisiones de navegación están en `docs/producto/arquitectura_v15.md`, sección 5; los documentos v14 son antecedentes archivados.

Antes de cerrar un cambio de interfaz, verificar textos visibles y recorrido funcional, además de pruebas de lógica y seguridad. Antes de cerrar cualquier corrección, revisar que no cambió el alcance ni debilitó controles técnicos.

## Sistema de diseño visual y navegación

- Aplicar `docs/diseno/base-frontend.md` (STD-FE-001, C-048) al construir o modificar frontend/base reutilizable. Respetar dependencias core/platform → contratos genéricos; core/auth → adaptación del producto; features → dominio; shared/ui → presentación independiente. Registrar los criterios FE afectados y la migración de consumidores antes de integrar.
- La base se distribuye inicialmente mediante generador local versionado y fuentes explícitas. No copiar secretos, datos ni funcionalidades del producto; no sobrescribir consumidores ni publicar paquetes sin una solicitud que lo autorice. La plantilla debe compilarse y verificarse como consumidor neutral.

- Consultar `docs/diseno/design-system.md` para la paleta, tipografía y marca de producto del kit compartido.
- Aplicar `docs/diseno/marco_estandar_ux_institucional.md` (STD-UX-001) como guía de principios, reglas y criterios de revisión de los próximos cambios de interfaz del proyecto. Su adopción institucional para otros sistemas permanece pendiente y no se presume conformidad del frontend existente.
- Antes de construir o revisar un cambio UX, identificar tarea, recorrido y reglas aplicables, incluidas sus subreglas. Usar el procedimiento, matriz y registro de evidencia de la sección 6 de la guía; conservar hallazgo, decisión y revisión en el mismo cambio de Git. Registrar cada comprobación como aprobada en su alcance, fallida, no probada o no aplicable con justificación.
- Inventariar accesos equivalentes al revisar navegación. Permitir caminos alternativos que sirvan tareas distintas; justificar repeticiones en una misma pantalla y comprobar etiquetas, destinos y retorno con contexto (R-09 a R-11). No imponer un camino único ni convertir la disposición de Jallupacha en obligación universal.
- Mantener los siete tokens `--brand-*` con sus HEX aprobados exactos. Los colores funcionales adicionales son semánticos de interfaz y no forman parte de esa paleta.
- Mantener la identidad visual propia de cada producto y el sistema independiente de marcas externas. No incorporar fuentes sin licencia comprobada.
- Mantener fundamentos y componentes genéricos en `frontend/src/app/shared/ui/`; lógica de negocio y navegación específica permanecen en la aplicación.
- Protección obligatoria de cambios no guardados (R-07.2): Todo componente que gestione formularios —sean pantallas completas de captura, subformularios embebidos (como riesgos y relaciones en la ficha de proceso) o formularios inline en paneles de catálogo— DEBE implementar `LeavesWithConfirmation` y asociar la guarda `canDeactivate: [unsavedChangesGuard]` en `app.routes.ts`. La lógica debe verificar si el formulario contiene modificaciones pendientes (`isDirty()`); si no hay cambios, la salida o cancelación debe ocurrir inmediatamente sin mostrar ningún diálogo. Si existen cambios pendientes, tanto el botón Cancelar del formulario como la navegación fuera de la pantalla deben requerir confirmación modal accesible (`UiDialogService.confirm`) antes de descartar.
- Al verificar cambios visuales, registrar explícitamente recorrido/textos visibles, revisión visual y pruebas. No declarar completada una comprobación que no se ejecutó.
- C-048 precisa la guarda de formularios embebidos: la ruta mantiene `canDeactivate` sobre su contenedor y este agrega la protección de los editores; no crear rutas artificiales para subformularios. Ningún editor puede descartar otro sin resolver sus cambios. El acceso también implementa su contrato de salida, sin persistir ni serializar contraseñas.
