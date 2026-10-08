# Release 01 — Mapa interno y consulta de riesgos

Estado: alcance aprobado para implementación incremental. Se actualiza por decisión del responsable del producto del 8 de octubre de 2026; reemplaza para este release la propuesta previa de mapa público. Cotejada con los requisitos fuente v13 transcritos en `docs/especificacion.md`. No declara completos requisitos parcialmente implementados.

## Objetivo y orden de entrega

Entregar una aplicación interna autenticada que permita navegar macroprocesos, procesos —incluidos los Borradores—, fichas y riesgos. Se reutilizan la ficha, catálogos, perfiles, sesiones, auditoría, API y kit UI existente. El release consta de:

1. Mapa interno autenticado Macroproceso → Proceso → Ficha, con procesos agrupados por tipo y estado visible. La navegación incluye procesos Borrador sin convertirlos en públicos ni saltarse los permisos de ficha (REQ-18, REQ-06).
2. Registro y consulta de riesgos con descripción, causa, consecuencia, tipo y nivel, respetando las políticas de REQ-10/11 y la administración de listas de REQ-28.
3. Restablecimiento explícito del esquema local de desarrollo y carga genérica repetible para poblar los tres macroprocesos con procesos y riesgos por proceso. Solo puede apuntar al esquema local permitido, ejecuta migraciones en orden y no borra ni altera otros esquemas.

Quedan postergados la aprobación/envío/rechazo y toda generación/publicación de exportaciones públicas (REQ-07, REQ-17, REQ-36, REQ-52), el versionado e historial completos (REQ-09/REQ-56), editar o alterar directamente procesos Vigentes, su retiro, el descarte de Borradores y el tratamiento de riesgos más allá de registrar/consultar. No asignar estados ni simular aprobación mediante carga.

## Requisitos y dependencias

| Área | Requisitos | Dependencias relevantes |
| --- | --- | --- |
| Árbol y ficha | REQ-18, REQ-06 | REQ-05, REQ-51, REQ-01 |
| Riesgos y listas | REQ-10, REQ-11, REQ-28 | REQ-05; autorización por solicitud; niveles y reglas de catálogos conforme v13 |
| Mapa interno | REQ-18, REQ-06 | REQ-05, perfiles actuales; navegación autenticada |
| Riesgos | REQ-10, REQ-11, REQ-28 | REQ-05 y proceso existente; permisos comprobados en servidor |
| Restablecimiento y datos genéricos | Decisión técnica de desarrollo local | Migraciones versionadas y finales; destino local validado y separado de otros esquemas |
| Aprobación y exportación pública | Postergados | REQ-07, REQ-17, REQ-36, REQ-52 no se implementan en este release |

El texto fuente de REQ-10/11/17/28/36/52 se transcribe en `docs/especificacion.md`. Las decisiones de este documento —entre ellas el formato de carga y el modo de producir artefactos autónomos— son diseño del Release 01, no texto de v13.

## 1. Mapa interno Macroproceso → Proceso → Ficha

- Disponible a cualquier usuario autenticado, conforme REQ-18. Es una superficie de navegación interna, no la publicación pública.
- Presenta macroprocesos en orden configurado. Expandir un macroproceso muestra procesos asociados, agrupables por tipo y estado, incluidos los Borradores existentes. Indica cantidad de procesos y tipos según reglas de estructura; no duplica versiones como procesos.
- Abrir un proceso presenta la ficha existente con todos los campos de REQ-06, responsable vigente y estado. La ficha y el mapa son superficies internas autenticadas; no se exponen rutas anónimas.
- Borradores son visibles dentro del mapa interno conforme a REQ-18 y a la sesión autenticada. Las mutaciones continúan sujetas a políticas de dueño/Administrador del backend.
- Versiones históricas no se cuentan como procesos adicionales. Los elementos de navegación representan solo procesos persistidos y su estado real; no fabricar datos ni cambiar estado.
- Reutilizar proceso, catálogos y UI kit existentes. Consulta es de solo lectura; las capacidades de edición no cambian por añadir árbol.

**Aceptación:** usuarios autenticados de cada perfil ven macroprocesos y procesos, incluidos Borradores, y abren fichas según su permiso; respuesta de mapa mantiene jerarquía y grupo por tipo y estado; contadores coinciden con Oracle; llamada sin sesión recibe 401; no se alteran referencias de catálogos ni datos; teclado y diseño adaptable funcionan sin desplazamiento horizontal desde 360 px.

## 2. Registro y consulta de riesgos

- El Gestor de riesgos registra uno o más riesgos asociados a procesos existentes, cada uno con descripción, causa, consecuencia, tipo y nivel.
- El dueño responsable puede consultar los riesgos de sus propios procesos.
- Consulta no puede consultar riesgos ni datos de riesgo mediante ficha, árbol, búsquedas, exportaciones, API directa u otra ruta lateral. La autorización se verifica en servidor por cada solicitud; ocultar acciones no basta.
- Los niveles iniciales son Bajo, Medio, Alto y Crítico. El nivel se define por criterio experto, sin matriz de riesgo; se muestra con etiqueta y color y es obligatorio para guardar.
- El Administrador gestiona listas configurables de tipos de riesgo y niveles de riesgo conforme REQ-28. Los valores nuevos quedan disponibles de inmediato; los valores ya usados se desactivan, no se borran. Los estados de procesos y acciones son fijos y no configurables. El catálogo de tipos de documento continúa siendo parte de REQ-28, pero su uso en documentos no integra este release.
- Esta entrega excluye el tratamiento de riesgos y cualquier workflow adicional a registrar/consultar que no esté confirmado por el texto original.
- El Gestor registra; el dueño consulta únicamente riesgos de sus procesos; Consulta no ve riesgos. No se conceden permisos adicionales por inferencia. Datos y API de riesgo permanecen fuera de la proyección pública, exportaciones HTML/JSON y mapa.

**Diseño mínimo:** entidad de riesgo relacionada por FK al proceso y referencias a catálogos configurables de tipo y nivel; API autenticada de registro/consulta y políticas explícitas en el backend existente. No se agrega historial ni ciclo de tratamiento de riesgos.

**Aceptación:** Gestor registra riesgo con los cinco campos y referencias válidas; falta de nivel se rechaza; se ofrecen los cuatro niveles iniciales y el Administrador puede mantener listas sin eliminar valores usados; responsable consulta únicamente riesgos de sus procesos propios; dueño ajeno y Consulta reciben 403 por llamadas directas; entradas inválidas se rechazan; los riesgos y campos de riesgo no se filtran a roles no autorizados; auditoría no incorpora PII innecesaria.

## Contratos API para la vista

Se implementan como contrato de lectura:

- `GET /api/process-map` devuelve `{ macroprocesses: [{ id, code, name, order, processTypes: [{ id, name, processes: [{ id, code, name, status, processTypeId }] }] }] }`. Incluye todos los estados persistidos actuales, particularmente `Borrador`, ordena macroprocesos y procesos determinísticamente y requiere sesión más cualquier perfil vigente.
- `GET /api/processes/:id` mantiene la ficha existente (campos REQ-06 y responsable vigente) y requiere sesión más autorización de lectura.
- `GET /api/processes/:id/risks?page=1&limit=100` devuelve `{ items, total, page, limit }`. `POST /api/processes/:id/risks` recibe `{ description, cause, consequence, riskTypeId, riskLevelId }`; no acepta owner, processId alternativo ni etiquetas derivadas del cliente.
- El acceso a la ruta de riesgos requiere perfil Administrador, Gestor de riesgos o Dueño de proceso; el servicio verifica la propiedad actual del proceso en cada lectura. Administrador/Gestor ve todos; Dueño ve solo sus procesos; Consulta y dueños ajenos reciben 403/404 según corresponda. Solo Gestor registra riesgos.
- Listas: `GET /api/risk-types` y `GET /api/risk-levels` para Administrador, Gestor y Dueño. Devuelven `{ items: [{ id, name, isActive }] }`; Administrador ve inactivos para gestión y los demás solo activos. `POST /api/risk-types` y `POST /api/risk-levels` agregan valores; `POST /api/risk-types/:id/deactivate` y `POST /api/risk-levels/:id/deactivate` los desactivan sin borrarlos. Todas las mutaciones son exclusivas de Administrador.

Todas las rutas aplican sesión y perfiles actuales en servidor. Respuestas 401/403/404/400/409 siguen las convenciones existentes. Listados de riesgos están limitados/paginados. En OpenAPI se documentan ejemplos, errores y política de cada operación. Estos contratos son fuente compartida entre backend y vista; la vista no dependerá de lectura SQL ni de un listado plano de procesos.

## Restablecimiento local y carga genérica

- Comando explícito raíz: `npm run db:reset:local`. No se ejecuta con el arranque, `db:migrate` ni `db:seed`.
- El comando valida desarrollo local, autenticación local de desarrollo, ambos hosts loopback, usuario de migración igual al propietario y usuario runtime separado. Exige `LOCAL_RESET_SCHEMA` igual a `ORACLE_SCHEMA` y `LOCAL_RESET_CONFIRM="RESET <esquema>@<servicio>"`. Si alguna condición no se cumple, aborta antes de cualquier DDL.
- Restablece únicamente ese esquema local de desarrollo, aplica las migraciones versionadas en orden mediante el comando normal y luego carga el paquete genérico idempotente. No modifica historial manualmente ni llama directamente a `up()`.
- Paquete de procesos en JSON UTF-8 versionado; contiene 12 procesos genéricos (4 por macroproceso) y un riesgo por proceso. Usa tipos iniciales de proceso Planificación, Seguimiento y evaluación, Atención y servicios, Fiscalización y evaluación, Gestión interna y Tecnología y soporte. Tipos de riesgo: Operacional, Estratégico, Cumplimiento, Tecnológico y Financiero. No contiene datos personales reales ni etiquetas visibles de entorno. Procesos quedan Borrador; la semilla no implementa aprobación.
- Semilla valida nombres/tipos de catálogos y referencias, genera IDs/códigos y propietario desde configuración semilla local existente; registra errores explícitamente; no sobrescribe datos editados fuera del comando destructivo local.

**Aceptación:** al ejecutar en un esquema local vacío, migraciones y carga terminan y el mapa devuelve datos de los tres macroprocesos, procesos Borrador y riesgos por proceso; una segunda carga sin reset no duplica ni sobrescribe; sin bandera o con conexión no local no emite DDL; usuario y esquemas ajenos no son alterados. No ejecutar el reset contra la instancia compartida existente.

## Diseño mínimo reutilizando lo implementado

- Una aplicación Angular/NestJS y Oracle existente; no añadir servicios, librerías de interfaz ni una aplicación separada para publicar.
- Árbol interno consume lectura autorizada de procesos/catálogos y navega a la ficha existente. Mantener la interfaz existente y el kit en `frontend/src/app/shared/ui/`; importarlo por su API pública y no reemplazar sus estilos, componentes ni diálogo.
- Separar explícitamente endpoints internos autenticados y proyección pública de lectura. API interna de riesgos siempre autenticada y autorizada. La superficie pública no acepta escrituras ni comparte endpoints privilegiados.
- Persistencia propuesta: reutilizar `PROCESS`, `PROCESS_VERSION`, catálogos y perfiles; agregar entidad/tablas de riesgo y catálogos configurables por migración versionada, sin editar migraciones aplicadas.
- Árbol de lectura reúne procesos por macroproceso y tipo sin filtrar Borradores. La ficha consulta el proceso seleccionado. Riesgos se recuperan por proceso con autorización por recurso, con lecturas/escrituras consistentes y auditadas en transacción cuando el servicio de auditoría aplica.
- Comando de restablecimiento separa claramente migración y carga; aplica el historial normal de TypeORM y limita destrucción al esquema local aprobado. JSON genérico con claves de semilla estables, sin estado de aprobación ni usuario real.
- No implementar endpoints de envío/aprobación/rechazo, retiros, APIs de exportación pública ni rutas anónimas de mapa en este release. Mantener `synchronize: false`, privilegios mínimos, SQL parametrizado, escape y controles de sesión/CSRF/autorización.
- Mantener `synchronize: false`, SQL parametrizado, restricciones FK/UNIQUE apropiadas, escape de salida y los controles existentes de sesión/CSRF/autorización. El mapa público no amplía permisos de lectura de ficha ni riesgo.

## Verificaciones diferidas antes de producción

El alcance aprobado no equivale a liberación ni a conformidad total. Antes de producción registrar: transcripción/revisión de los requisitos fuente y conformidad del responsable (PT-03/04); recreación desde cero en pruebas (PT-05); pruebas directas de permisos y regresión de cada perfil (PT-07); entradas maliciosas y SAST (PT-08); sesiones, CSRF y expiración (PT-09); DAST, CSP/HSTS y mensajes seguros (PT-10); detección de secretos (PT-11); dependencias (PT-12); cifrado, control de acceso y restauración de backups (PT-13); grants mínimos (PT-14); compatibilidad con Oracle institucional; HTTPS (REQ-30); revisión legal de datos personales (REQ-35); carga a 20 usuarios y umbral REQ-31; WCAG 2.2 AA (REQ-32); adaptación a 360 px (REQ-33); restauración de backup (REQ-34). No declarar ejecutada ninguna de estas verificaciones por este documento.

## Evidencia y pendientes

Alcance aprobado para esta implementación: mapa interno y ficha (REQ-18/06), riesgos y listas necesarias (REQ-10/11/28), reset/carga local como soporte técnico. Aprobación y mapa/exportación públicos quedan postergados. La evidencia y los pendientes verificados se registran a continuación. REQ-06/10/11/18/28 se declaran completos solo cuando se implementen y verifiquen todos sus criterios. Las verificaciones de producción al inicio de este documento permanecen pendientes.

**Verificaciones ejecutadas:**

- `npm run build --workspace backend`: correcto.
- `npm run test:e2e --workspace backend -- --runTestsByPath test/processes.e2e-spec.ts`: 1 suite, 8 pruebas aprobadas; cubre autenticación, lectura del mapa y políticas de rutas de riesgos.
- `npm run db:migrate --workspace backend`: la ejecución inicial terminó correctamente; luego se ejecutó dos veces con el registro explícito del resultado y ambas informaron `No pending migrations.`
- `npm run db:seed --workspace backend`: terminó correctamente y aseguró los catálogos de riesgos. Informó `Generic process content was not loaded because processes already exist.`
- `npm run test:e2e --workspace backend -- --runTestsByPath test/release01-map-risks.oracle.e2e-spec.ts`: 1 suite, 1 prueba Oracle aprobada. Creó un Borrador, lo recuperó en el mapa, abrió la ficha, registró y volvió a consultar un riesgo persistido; comprobó denegación para otro dueño y para Consulta, y verificó el evento `PROCESS_RISK_CREATED` en auditoría.
- Validación local del paquete JSON: 12 procesos, cuatro por cada uno de los tres macroprocesos, y un riesgo por proceso. Esto verifica el contenido versionado, no su carga en Oracle.
- `git diff --check`: correcto; solo advirtió conversiones de fin de línea CRLF en archivos existentes.

**Recreación local (PT-05, esquema local `JALLUPACHA_OWNER@freepdb1`, purga autorizada por el responsable):** se ejecutó `npm run db:reset:local` con `LOCAL_RESET_SCHEMA` y `LOCAL_RESET_CONFIRM` definidos solo en el proceso, sin SQL de purga manual ni otros esquemas. Resultado: tablas y secuencias enumeradas eliminadas, migraciones aplicadas por TypeORM y "Loaded 12 generic processes and 12 associated risks". Consultas posteriores: 3 macroprocesos; 12 procesos (4 por macroprocesos Estratégicos, Misionales y de Apoyo); 12 riesgos; 0 riesgos sin proceso; exactamente 1 riesgo por proceso; 6 registros en `migrations`. `db:migrate` posterior: "No pending migrations."; `db:seed` posterior no duplicó contenido. Esto cubre la recreación desde cero en el esquema local; no se verificó en un esquema de pruebas separado ni en Oracle institucional, por lo que PT-05 queda verificado solo para el entorno local. Corrección posterior (C-005): ese reset dejó a la cuenta de ejecución sin grants sobre las tablas base; se corrigió el comando y se verificó con la cuenta de ejecución (ver `docs/correcciones.md`). La verificación Oracle demuestra el recorrido de API; el recorrido visual se registra en «Vista Angular y revisión visual». También quedan pendientes las verificaciones de producción enumeradas arriba.

### Vista Angular y revisión visual

**Implementación:**

- Rutas:
  - `/mapa`: entrada autenticada; `/` redirige aquí.
  - `/mapa/macroprocesos/:id`: agrupación por tipo o, con `?agrupar=estado`, por estado.
  - `/procesos/:id`: ficha existente.
  - `/procesos/:id/riesgos`.
- Navegación principal: «Mapa de procesos» y «Procesos». Las migas de pan siguen la jerarquía Mapa → Macroproceso → Proceso → Riesgos.
- La vista consume solo los contratos de este documento: `GET /api/process-map`, `GET /api/processes/:id`, `GET`/`POST /api/processes/:id/risks`, `GET /api/risk-types` y `GET /api/risk-levels`. No hay endpoints nuevos ni datos simulados, y no se modificó el backend.
- La interfaz muestra el enlace a riesgos a Administrador, Gestor de riesgos y Dueño responsable, y el formulario de registro solo al Gestor. Consulta y los dueños ajenos no solicitan riesgos, y un 403 del servidor oculta la lista. El servidor sigue autorizando cada solicitud.
- Registro:
  - los cinco campos son obligatorios, con validación junto al campo según las reglas del DTO (longitud y sin marcado HTML);
  - los niveles se ordenan Bajo, Medio, Alto, Crítico, con etiqueta «Nivel X» y color;
  - se protegen los datos sin registrar.

**Pruebas:** `npm run test:frontend`: 5 archivos y 40 pruebas aprobadas, incluidas `process-map.component.spec.ts` y `process-risks.component.spec.ts`. `npm run build --workspace frontend` y `npm run check:contrast --workspace frontend` (37 combinaciones WCAG 2.2 AA) correctos.

**Revisión visual (2026-10-08):**

- Entorno local con datos genéricos y cuentas de prueba; viewport de 360 × 800 px.
- Solo se iniciaron y cerraron sesiones; no se registraron riesgos ni se modificaron procesos.
- En el formulario del Gestor se probó solo la validación previa al envío, sin solicitudes `POST`.
- Sin sesión, `GET /api/auth/me` y `GET /api/process-map` respondieron 401. La dirección `/mapa` mostró el acceso y se mantuvo tras iniciar sesión.

| Perfil (cuenta de prueba) | Comprobado |
| --- | --- |
| Consulta | Mapa con 3 macroprocesos en orden. Contadores iguales a la respuesta del mapa: Estratégicos 4 procesos · 2 tipos; Misionales 5 · 3; De Apoyo 4 · 2; 13 procesos, todos Borrador. Misionales se agrupa por tipo y por estado, con enlaces a cada ficha. Ficha PR5: 6 secciones y 29 campos REQ-06, migas Mapa → Misionales → PR5, sin «Riesgos del proceso» ni «Editar borrador». `/procesos/5/riesgos` muestra «Los riesgos de este proceso no están disponibles para su perfil.» sin solicitar riesgos; el API directo responde 403. |
| Dueño de proceso | Proceso propio (PR5): enlace a riesgos, lista con nivel y tipo, sin formulario. Proceso ajeno (PR2): sin enlace; la dirección directa muestra el mensaje sin solicitar riesgos y el API directo responde 403. |
| Gestor de riesgos | PR2: enlace a riesgos, lista, tipos activos (5) y niveles Bajo, Medio, Alto, Crítico. Al enviar vacío se muestran 5 errores junto a los campos, el foco va al primero y no hay `POST`. El marcado HTML se rechaza. Al salir con datos se pide confirmación modal; se salió sin guardar. |
| Administrador | PR2: enlace a riesgos y lista, sin formulario. |
| Dueño y Gestor | PR1 y PR2: lista y formulario, conforme a la suma de perfiles. |

- 360 px: en todas las pantallas del recorrido (acceso, mapa, macroproceso, ficha y riesgos), el ancho de la página no superó el viewport.
- Observación fuera del recorrido: la tabla «Auditoría reciente» del panel de Administrador usa desplazamiento horizontal dentro de su contenedor; la página no se desborda.
- Teclado: todos los controles del recorrido son enlaces o botones nativos, sin `tabindex` negativo, y existe el enlace «Ir al contenido principal».

**Pendientes de la revisión visual:**

- El recorrido con teclado y las capturas se completaron en la revisión PT-03 siguiente.
- Los 13 procesos observados incluyen uno creado por la prueba Oracle (`PR13`) además de los 12 genéricos.
- Esta revisión no equivale a la verificación WCAG 2.2 AA (REQ-32) ni a la de adaptación de REQ-33 antes de producción.

### Revisión PT-03 del release interno — interfaz (2026-10-08)

Revisión de la vista Angular del Release 01 hecha por el asistente de IA sobre el entorno local. Registra resultados y limitaciones; **no constituye la conformidad del responsable** que PT-03 y AGENTS.md exigen antes de integrar ni una declaración de cumplimiento WCAG 2.2 AA (REQ-32) o de REQ-33.

**Alcance y método:**

- Navegador integrado con el panel visible, viewport de 360 × 800 px y teclado real (Tab, Shift+Tab, Enter, espacio, flechas y Escape).
- Cuentas de prueba Gestor de riesgos y Administrador. Los permisos por perfil ya aprobados en la revisión visual anterior no se repitieron.
- Sin cambios de backend ni de datos: solo se iniciaron y cerraron sesiones. Los formularios se probaron sin enviar (validación) o cancelando; no hubo solicitudes `POST` de riesgos ni de catálogos.
- Las capturas de pantalla se tomaron durante la revisión y no se versionan en el repositorio.

**Resultados conformes:**

| Área | Resultado |
| --- | --- |
| Foco visible | Todos los controles recorridos muestran contorno de 3 px `#c4541a` con `:focus-visible`: enlace de salto, marca, selector, botones, navegación, tarjetas, migas, control segmentado, enlaces de proceso, campos y botones de diálogo. |
| Acceso con teclado | Usuario seleccionado con flechas e ingreso con Enter, sin mouse. |
| Orden de foco | Mapa: navegación → tarjetas de macroproceso. Macroproceso: migas → «Volver al mapa» → «Por tipo» → «Por estado» → procesos. Ficha: migas → «Volver al listado» → «Riesgos del proceso». Riesgos: tipo → nivel → descripción → causa → consecuencia → «Registrar riesgo». |
| Control segmentado | Enter y espacio cambian la agrupación, actualizan `aria-pressed` y conservan el foco en el botón. Un desplazamiento inesperado observado una vez no se reprodujo con mediciones antes y después. |
| Validación de riesgo | Enter en «Registrar riesgo» con el formulario vacío muestra 5 errores, lleva el foco al primer campo inválido (con `aria-describedby` hacia su error) y no envía nada. |
| Diálogos | Confirmación y formulario modales (`:modal`), con `aria-labelledby` y `aria-describedby`. El foco inicial va a la opción segura «Seguir editando» o al primer campo; Tab circula dentro del diálogo; Escape cierra sin navegar ni perder lo escrito; «Salir sin guardar» con teclado completa la navegación. |
| 360 px | Acceso, mapa, macroproceso, ficha, riesgos y diálogos sin desbordamiento horizontal de la página. |

**Hallazgos.** R1–R3 se corrigieron en C-007 (ver «Seguimiento de hallazgos» y `docs/correcciones.md`); R4–R9 siguen pendientes:

| # | Severidad | Hallazgo | Corrección propuesta |
| --- | --- | --- | --- |
| R1 | Alta | El enlace «Ir al contenido principal» (`href="#main-content"`) se resuelve contra `<base href="/">` como `/#main-content`: recarga la aplicación y lleva a `/mapa`. Desde una ficha o un formulario se pierde la ubicación y, con cambios pendientes, se activa el aviso de salida del navegador. | En `ui-app-shell`, interceptar el enlace y enfocar `#main-content` sin navegar; agregar prueba de regresión. |
| R2 | Alta | Al cerrar un diálogo (Escape, Cancelar o confirmar sin navegar), el foco cae en `body` en lugar de volver al control que lo abrió. El servicio intenta devolverlo mientras el `<dialog>` modal sigue en el documento, y el navegador lo impide. | En `UiDialogService`/`ui-dialog-host`, cerrar el `<dialog>` antes de devolver el foco o devolverlo tras el render; agregar prueba. |
| R3 | Media | Al cambiar de ruta, el foco queda en `body`, no se anuncia la nueva pantalla y se conserva el desplazamiento anterior. Lo mismo ocurre al iniciar sesión, porque el botón «Ingresar» desaparece. | Al terminar cada navegación, mover el foco al título del área de contenido (o a `#main-content`) y volver arriba, salvo en cambios de agrupación o página dentro de la misma pantalla. |
| R4 | Baja | A 360 px, las acciones del encabezado del panel («Volver a la ficha», «Volver al mapa») se parten en varias líneas junto al título. | Apilar las acciones bajo el título en pantallas angostas. |
| R5 | Baja | A 360 px, la ficha y los riesgos mantienen dos columnas de etiqueta y valor; los valores quedan muy angostos. | Apilar etiqueta y valor bajo 520 px. |
| R6 | Baja | A 360 px, los botones del diálogo se apilan en orden inverso al de foco: «Salir sin guardar» se ve arriba, pero el foco recorre primero «Seguir editando». | Hacer coincidir el orden visual con el orden de foco. |
| R7 | Baja | Mientras cargan las identidades, la pantalla de acceso no muestra el selector ni un indicador de carga. | Mostrar «Cargando…» con `role="status"`. |
| R8 | Observación | En el móvil, el mapa empieza por debajo de la mitad de la pantalla, después de la barra, el aviso de entorno, el mensaje de sesión y el saludo. | Evaluar con el responsable la compactación del saludo en pantallas angostas. |
| R9 | Observación (fuera del recorrido) | A 360 px, el formulario en línea de catálogos y la tabla de auditoría del panel de Administrador tienen una disposición estrecha; la tabla se desplaza dentro de su contenedor. | Revisar al rediseñar la administración. |

**Limitaciones:**

- Sin lector de pantalla (NVDA/JAWS/VoiceOver): no se verificó cómo se anuncian las pantallas, regiones vivas ni mensajes.
- Un solo motor de navegador; sin zoom del 200 %, espaciado de texto ni modo de alto contraste.
- Herramientas automáticas de accesibilidad (axe u otras) no ejecutadas.
- El contraste se verificó para los tokens (`check:contrast`), no sobre cada combinación renderizada.
- Datos genéricos con un solo riesgo por proceso: no se observaron listas largas ni paginación de riesgos con datos reales.

**Conclusión:** el recorrido mapa → macroproceso → ficha → riesgos es operable con teclado y a 360 px, con foco visible y diálogos modales correctos. R1 y R2 debían corregirse antes de considerar la interfaz lista para integración, y R3 se recomendaba en el mismo cambio. Queda pendiente la conformidad del responsable.

#### Seguimiento de hallazgos — C-007 (2026-10-08)

| # | Estado | Evidencia |
| --- | --- | --- |
| R1 | Corregido | Enter en «Ir al contenido principal» desde `/mapa/macroprocesos/1`: sin recarga, dirección sin cambios y foco en `#main-content`. Regresión en `ui.spec.ts`. |
| R2 | Corregido | Escape en la confirmación de salida, en «Editar macroproceso» y en «Desactivar» devuelve el foco a «Volver a la ficha», «Editar» y «Desactivar», sin cambios de datos. Regresión en `ui.spec.ts`, que falla con la implementación anterior. |
| R3 | Corregido | Títulos por pantalla («<pantalla> · Sistema de Procesos Institucionales», «Acceso · …» sin sesión). Foco en el encabezado tras cambiar de ruta, iniciar sesión y cerrarla. Una navegación nueva empieza arriba. Atrás/Adelante restauraron 758, 150 y 300 px en un ciclo completo. Los cambios de agrupación no mueven foco ni desplazamiento. Regresiones en `navigation.spec.ts`. |

Pruebas: regresiones afectadas en 5 archivos y 42 pruebas, más 16 tras el último ajuste; build correcto. Atrás/Adelante se comprobaron con `history.back()`/`history.forward()`, porque los atajos del navegador no llegan al panel integrado. Sin lector de pantalla. Observación nueva, no corregida: la marca de la barra superior (`href="/"`) navega con recarga completa; conviene tratarla como R10 en un cambio posterior.
