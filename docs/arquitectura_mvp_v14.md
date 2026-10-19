# Arquitectura técnica del MVP v14 — piloto de operador único

## Estado y autoridad

Este documento define el diseño técnico que implementará los 17 requisitos activos de `docs/mvp_v14.md`. Junto con `docs/referencias/Requisitos_Sistema_Procesos_v14.xlsx`, reemplaza `docs/arquitectura.md` para toda decisión nueva del MVP. La arquitectura anterior queda como antecedente histórico: sus contratos de autenticación, perfiles, auditoría de usuario y flujo de revisión no se reutilizan en este piloto.

No se modifican migraciones ya aplicadas. La adaptación se realiza mediante una migración nueva y contratos nuevos o ajustados, con `synchronize: false`.

## Límite de seguridad del piloto

El piloto es para **un operador en un entorno controlado**. No incluye inicio de sesión, perfiles, autorización ni trazabilidad por usuario (C-011). Por tanto:

- el frontend y la API del piloto se restringen a la red local o a un entorno de demostración administrado; no se exponen a Internet ni a usuarios reales;
- las rutas de dominio del piloto no usan `AuthGuard`, `CurrentUser`, perfiles ni `UserIdentity` como regla de negocio;
- `OWNER_USER_ID`, sesiones, auditoría por usuario y asignaciones de perfiles son datos y módulos heredados, no fuente de comportamiento del MVP;
- antes de cualquier despliegue multiusuario o productivo se diseña y aprueba autenticación, autorización, sesiones, revisión/validación y auditoría. Esta arquitectura no satisface PT-07 ni PT-09 fuera de ese límite.

HTTPS (REQ-30) se configura en el proxy o servidor institucional al publicar un entorno de prueba. El acceso local del piloto no se presenta como cumplimiento de HTTPS de producción.

## Decisiones de diseño

| Decisión | Aplicación al MVP |
| --- | --- |
| Estado del proceso | Se conserva únicamente `Borrador`. Es el estado técnico de todo registro editable; no hay transición, envío, aprobación ni publicación. No pretende satisfacer REQ-07. |
| Elaborador y responsable | No se registra una cuenta de usuario. El proceso guarda `elaborador` y `responsable` como persona o cargo informado en la ficha, independientes entre sí y del operador único. Esto satisface REQ-05 sin fingir trazabilidad basada en sesión. |
| Ficha extensa | Los campos de documentos, sistemas, indicadores, oportunidades y BPMN se almacenan como texto o referencias, sin carga ni gestión documental. REQ-08 no está en alcance. |
| Riesgos | Viven exclusivamente bajo la ficha del proceso. Sus niveles son valores fijos `Bajo`, `Medio`, `Alto`, `Crítico`; no hay matriz ni pantallas de configuración. |
| Relaciones | Son dirigidas, con tipo fijo (`Flujo`, `Dependencia`, `Coordinación`) y descripción obligatoria. El origen y destino nunca pueden ser iguales y la combinación origen/destino/tipo no se repite. |
| Estructura fija | Tipos de macroproceso y macroprocesos se crean con semillas versionadas y solo se leen. No habrá rutas, pantallas ni acciones para alterarlos. |

## Modelo de datos objetivo

La migración nueva preserva la información existente y agrega o ajusta el modelo siguiente.

```text
TipoMacroproceso 1 ── * Macroproceso 1 ── * TipoProceso 1 ── * Proceso
UnidadInterna (autorreferencia jerárquica)
Proceso 1 ── * ProcesoUnidad (una RESPONSABLE; varias PARTICIPANTE)
Proceso 1 ── * Riesgo
Proceso 1 ── * RelacionProceso (origen) ── 1 Proceso (destino)
Proceso 1 ── 1 Ficha/Borrador actual
```

| Componente | Diseño y restricciones |
| --- | --- |
| `MACROPROCESS_TYPE` | Nuevo catálogo fijo: código único, nombre, orden y activo. Semillas: `ESTRATEGICOS`, `MISIONALES`, `APOYO`, en ese orden. Sin API de escritura. |
| `MACROPROCESS` | Agrega `MACROPROCESS_TYPE_ID` obligatorio. Sus filas de semilla se mantienen fijas; sin escritura desde la aplicación. |
| `PROCESS_TYPE` | Agrega `MACROPROCESS_ID` obligatorio. La unicidad es por macroproceso y nombre. Se puede crear, editar y desactivar; no se desactiva si tiene procesos activos y el error informa la cantidad a reclasificar. |
| `ORGANIZATIONAL_UNIT` | Nueva tabla con código único, nombre, `PARENT_UNIT_ID` opcional, activo y control contra ciclos. No se borra. Una unidad inactiva puede verse en fichas históricas, pero no asociarse ni seleccionarse para cambios nuevos. |
| `PROCESS` y ficha actual | Conserva código inmutable y agrega/normaliza clasificación, alias, descripción, objetivo, alcance de inicio/término, área, elaborador y responsable en texto, involucrados, entradas, salidas, proveedores, clientes, documentos, sistemas, indicadores, oportunidades, criticidad, automatización, periodicidad, inicio, término, plan de desarrollo, operación, diseño, validación y referencia BPMN. La ficha muestra siempre el estado `Borrador`. |
| `PROCESS_UNIT` | Nueva asociación con `PROCESS_ID`, `UNIT_ID`, rol `RESPONSABLE` o `PARTICIPANTE` y función obligatoria solo para participantes. Índice único por proceso/unidad y restricción de a lo sumo una responsable. La ficha completa exige una responsable activa; el borrador puede estar incompleto. |
| `PROCESS_RISK` | Conserva riesgos ligados al proceso, sin creador ni módulo transversal. Tipo es descriptivo; nivel obligatorio y limitado a los cuatro valores fijos. Sin campos de controles, tratamiento, acciones ni seguimiento. |
| `PROCESS_RELATION` | Nueva tabla con proceso origen, destino, tipo fijo y descripción obligatoria. Restricciones contra autorrelación y duplicado. |

La ficha puede continuar usando `PROCESS_VERSION` como contenedor de borrador y su contador de revisión para concurrencia técnica. No se crean versiones funcionales, historial, retiro ni cambios de estado mientras REQ-07, REQ-09 y REQ-56 estén postergados.

### Carga inicial autorizada

La carga de demostración se deriva de `backend/src/database/generic-content.json`, autorizada por el responsable como contenido inicial. Se conserva su contenido funcional (24 procesos, con alcance, unidades y riesgos) y se normaliza su jerarquía así:

| Tipo de macroproceso | Macroproceso inicial | Tipos de proceso iniciales |
| --- | --- | --- |
| Estratégicos | Estratégicos | Planificación; Seguimiento y evaluación |
| Misionales | Misionales | Atención y servicios; Fiscalización y evaluación |
| De apoyo | De apoyo | Gestión interna; Tecnología y soporte |

La coincidencia de nombre entre un tipo de macroproceso y su macroproceso inicial es intencional: refleja los datos existentes y no autoriza modificar la estructura fija desde el piloto. Los veinticuatro procesos (PR1 a PR24), sus descripciones, objetivos, alcances, unidades internas (una responsable y las participantes indicadas) y riesgos se cargan como borradores de demostración. Cada uno recibe `elaborador` y `responsable` genéricos de demostración, sin crear cuentas de usuario.

## Reglas de dominio y validación

- Un proceso pertenece a un tipo de proceso y este debe pertenecer al macroproceso seleccionado. El servidor rechaza cualquier combinación inconsistente.
- El código se asigna en el servidor, es único e inmutable.
- Se permite guardar borradores incompletos. La validación de ficha completa exige los mínimos de REQ-05: elaborador, nombre, clasificación, descripción, objetivo, alcance de inicio y término, responsable, una unidad responsable activa, al menos una entrada y una salida.
- Antes de informar que la ficha está completa, el servidor busca posibles duplicados por nombre o alias normalizado dentro de la misma clasificación. Es una advertencia, nunca una prohibición automática.
- Una unidad no puede ser padre de sí misma ni de un descendiente; una unidad inactiva no puede agregarse a una ficha.
- Una relación no puede autorreferenciarse ni repetirse. La dirección se conserva al consultar y navegar.
- La desactivación conserva datos históricos. No hay borrado físico de tipos de proceso ni unidades mediante la aplicación.

## API del piloto

Todas las rutas se validan en el servidor y responden errores de negocio claros sin detalles internos. No requieren sesión solo dentro del límite de seguridad del piloto.

| Área | Contrato mínimo |
| --- | --- |
| Mapa fijo | `GET /api/macroprocess-types` devuelve tipos, macroprocesos y tipos de proceso activos para navegar. No hay `POST`, `PUT`, `PATCH` ni `DELETE` de tipos de macroproceso o macroprocesos. |
| Tipos de proceso | `GET/POST/PATCH /api/process-types`; `PATCH .../deactivate` valida procesos activos. El cuerpo siempre declara el macroproceso al que pertenece. |
| Unidades | `GET/POST/PATCH /api/organizational-units`; `PATCH .../deactivate`. La lectura permite árbol completo e incluye inactivas solo cuando se consulta una ficha existente. |
| Procesos | `GET /api/processes` filtra por clasificación, unidad, código, nombre, descripción y responsable; `GET /api/processes/:id`; `POST/PATCH /api/processes`. La ficha puede incluir riesgos y asociaciones de unidades en una operación transaccional. |
| Búsqueda | Los textos se comparan sin distinguir mayúsculas ni tildes mediante normalización compatible con Oracle e índices apropiados. La respuesta identifica la clasificación y permite abrir ficha o navegar el mapa. |
| Riesgos | `POST/PATCH/DELETE /api/processes/:id/risks` y lectura dentro de la ficha. No se publica una ruta de gestión independiente ni de configuración de niveles. |
| Relaciones | `GET/POST/PATCH/DELETE /api/processes/:id/relations`; la lectura de ficha incluye salientes y entrantes para navegar en ambos sentidos. |

Los endpoints heredados de `auth`, `users`, `audit`, perfiles, revisión, publicación y exportación quedan fuera de la navegación y de los recorridos del piloto. No se eliminan ni se declaran compatibles: se aíslan hasta que exista una decisión para el producto multiusuario.

### Rutas implementadas del piloto

Defecto de diseño corregido: `ProcessController` heredado ya ocupa `/api/processes` y `/api/processes/:id/risks` con `AuthGuard` global, por lo que las rutas de la tabla anterior colisionan. El piloto publica el mismo contrato bajo el prefijo `/api/mvp-v14/` (controlador `@Public()` limitado a la excepción C-011): `map`; `processes` (`q`, `macroprocessId`, `processTypeId`, `unitId`; máximo 300 resultados), `processes/:id`, `processes/:id/risks[/:riskId]`, `processes/:id/relations[/:relationId]`; `process-types[/:id]` y `process-types/:id/deactivate`; `units[/:id]` y `units/:id/deactivate`. El nombre y la clasificación son obligatorios al crear un proceso; el borrador puede quedar incompleto y la ficha informa los mínimos de REQ-05 faltantes (`completeness`) y los posibles duplicados por nombre o alias dentro de la misma clasificación (advertencia, no bloqueo). Un tipo de proceso no cambia de macroproceso. Una unidad inactiva solo se rechaza al asociarla de nuevo.

## Interfaz MVP

Por corrección explícita del responsable, la adaptación visual se limita al contenido del mapa y sus vistas interiores. No incluye barra lateral, cabecera superior ni pie de aplicación. Se conserva la navegación contextual y las rutas funcionales existentes; las secciones siguientes no implican un menú global visible.

La referencia visual detallada se adapta mediante dos paneles: resumen con conteos de API y mapa con tres bandas de clasificación, contexto/resultados explicativos y tarjetas de macroprocesos. La búsqueda local del mapa filtra macroprocesos por código/nombre (sin mayúsculas ni tildes), combinada con la clasificación. El enlace Buscar procesos conserva acceso a la búsqueda de fichas del servidor. No se importan datos, marcas, cifras ni tokens del equipo B. Detalle y evidencia en `adaptacion_visual_mvp_v14.md`.

La adaptación visual aprobada del equipo B se documenta en `adaptacion_visual_mvp_v14.md`. Su primera etapa cambia la estructura visual común y las tarjetas del mapa, conservando las rutas, contratos y alcance descritos aquí.

La continuación aprobada incorpora exploración de solo lectura en `/mapa/macroprocesos/:id`, subordinada a Mapa de procesos. Reutiliza la estructura del mapa y la búsqueda existente por macroproceso, tipo y unidad; no agrega una sección principal, escritura de estructura fija ni contrato backend. La ficha reorganiza los campos existentes sin ocultarlos ni introducir riesgo agregado o render BPMN.

La navegación presenta solamente:

1. Mapa de procesos (jerarquía fija y navegación a ficha).
2. Procesos (búsqueda y creación/edición de borrador).
3. Unidades internas.
4. Tipos de proceso.

La ficha muestra todos los campos de REQ-06, unidades con su rol, riesgos y relaciones. Las secciones sin datos indican que el borrador está incompleto, sin ocultar los campos. No muestra cuenta, perfiles, auditoría, envío a revisión, aprobación, exportación, Google Workspace ni acciones de publicación.

## Operación e infraestructura

- Oracle 19c sigue siendo la plataforma objetivo. Las nuevas tablas, índices, restricciones y semillas se crean en una migración versionada; los permisos de runtime se agregan en `backend/database/grant-runtime.sql`.
- Se documenta un procedimiento de respaldo y restauración verificable para la base de datos (REQ-34): responsable, frecuencia, ubicación separada, cifrado/acceso, retención y prueba de restauración. No se sustituye por una función de la interfaz.
- El despliegue institucional termina TLS en Nginx u otro proxy equivalente, redirige HTTP a HTTPS y aplica cabeceras de seguridad. Su verificación pertenece al ambiente de pruebas antes de publicación.
- Los campos personales se limitan a persona o cargo responsable e involucrados cuando sean necesarios para operar el proceso. No se usan datos personales para navegación, trazabilidad o riesgos en este piloto.

### Instalación limpia v14

El reinicio heredado reconstruye el modelo v13 y por ello no se usará para una instalación v14. La instalación limpia del piloto debe seguir este contrato:

1. Verifica una confirmación explícita, el nombre exacto del esquema objetivo, una cuenta propietaria de migración separada de la cuenta de ejecución y que se trate de un entorno permitido.
2. Elimina todas las tablas, secuencias, índices dependientes y registro de migraciones que pertenezcan a la aplicación en ese esquema. No toca objetos ajenos al producto ni otros esquemas.
3. Ejecuta exclusivamente el conjunto inicial versionado de v14 y sus semillas fijas; nunca las migraciones ni semillas v13.
4. Aplica los permisos mínimos del runtime v14 y termina informando los objetos creados y la versión instalada.

El comando será deliberadamente destructivo y no se ejecutará automáticamente al iniciar la aplicación. Su nombre, mensajes y validaciones dejarán inequívoco que borra todos los datos del esquema objetivo. Hasta que se implemente, `db:reset:local` queda identificado como herramienta histórica v13 y no es válido para instalar el MVP v14.

Los archivos v13 se conservan inicialmente como evidencia del historial; se retiran del camino de instalación v14, no se ejecutan. Una vez verificada la instalación limpia y confirmado que no hay ambientes que dependan del histórico, se pueden archivar fuera del conjunto ejecutable en un cambio dedicado.

## Trazabilidad y verificación

| Requisitos activos | Evidencia mínima antes de integrar |
| --- | --- |
| REQ-01, 02, 04, 51 | Migración Oracle y pruebas de jerarquía/semillas, restricciones y desactivación de tipo de proceso. |
| REQ-54, 55 | Pruebas de árbol, ciclo, inactivación, asociación única y responsable activa en ficha completa. |
| REQ-05, 06 | Pruebas de creación de borrador, código inmutable, validación mínima, aviso de duplicados y render de ficha. |
| REQ-10, 11 | Pruebas de riesgos solo bajo proceso, nivel obligatorio fijo y ausencia de controles/acciones. |
| REQ-14, 15 | Pruebas de autorrelación, duplicado y lectura/navegación entrante-saliente. |
| REQ-19, 29 | Pruebas de filtros, búsqueda sin mayúsculas/tildes y todas las reglas de integridad del servidor. |
| REQ-34, 30, 35 | Evidencia operativa de respaldo/restauración, configuración TLS en pruebas y revisión de los datos personales almacenados. |

Las pruebas contra Oracle son obligatorias para migraciones, restricciones, consultas de búsqueda y permisos. Se registrará lo ejecutado; una revisión documental no se declarará como prueba de infraestructura ni de base de datos.

## Fuera de alcance y puertas de reingreso

Permanecen postergados REQ-25, REQ-26, REQ-27, REQ-07, REQ-09, REQ-56, REQ-36, REQ-17 y REQ-52. Para reincorporar cualquiera se requiere actualizar esta arquitectura antes de código, en especial para resolver identidad, autorización por solicitud, segregación entre elaborador y revisor, versiones, auditoría y exportación pública.

La próxima etapa de implementación se divide en cambios verificables: (1) migración y semillas, (2) API de estructura/unidades, (3) ficha y riesgos, (4) relaciones y búsqueda, (5) interfaz y operación. Ninguna etapa incorpora los requisitos postergados.
