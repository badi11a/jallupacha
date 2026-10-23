# Registro de correcciones y cambios verificables (v15)

> **Archivo histórico:** Las anotaciones C-001 a C-039 (correspondientes a los ciclos previos v13/v14 consolidados en la purga autorizada C-040) se encuentran archivadas en [docs/historico/correcciones_legacy.md](historico/correcciones_legacy.md).

## C-040 — Purga autorizada de archivos generados, históricos y referencias temporales

**Autorización:** el responsable solicita purgar archivos y confirma expresamente incluir «históricos y referencias». Se conservan planillas fuente, migraciones, código y pruebas, dependencias instaladas, configuración/credenciales locales y registro de correcciones. Los documentos históricos versionados permanecen recuperables desde Git; esta tarea no reescribe ese historial.

**Clasificación y comportamiento esperado:** mantenimiento documental y de archivos generados, sin cambio funcional. Retirar ocho documentos superados de v13/v14 y la referencia HTML temporal, corregir enlaces activos y trasladar las instrucciones operativas todavía aplicables a arquitectura v15 §6 antes de retirar su fuente. Conservar reglas del design-system y ejemplos en el patrón de formularios. Los nombres de documentos/capturas citados en correcciones previas son referencias históricas, no archivos vigentes ni enlaces de operación.

**Revisión previa (misma IA autora):** la purga no cambia requisitos, principios PT, reglas R/PUX, permisos, autenticación, datos persistidos ni firmas del kit. No se ejecutan instaladores o comandos de base de datos. Los directorios generados se eliminan solo tras comprobar sus rutas absolutas dentro del proyecto o del directorio temporal propio de esta conversación, sin seguir puntos de reanálisis. No se detienen servicios del usuario.

**Purga ejecutada:**

- Ocho documentos históricos: `adaptacion_visual_mvp_v14.md`, `arquitectura.md`, `arquitectura_mvp_v14.md`, `especificacion.md`, `incremento02_REQ05_REQ06_v1_1228.md`, `incremento03_ciclo_procesos.md`, `mvp_v14.md` y `release01_navegable.md`, todos bajo `docs/`.
- Referencia temporal `docs/design-system/controles.html`, su carpeta vacía y dos `.gitkeep` vacíos en carpetas que ya contienen código.
- Compilaciones `frontend/dist` y `backend/dist`, caché `frontend/.angular` y dos logs QA. Los archivos generados se recrean con las herramientas normales del proyecto cuando se necesiten; no se han eliminado dependencias instaladas.
- Caché de compilación Node, dos auxiliares de servidor y tres capturas de esta conversación, dentro de su directorio temporal propio. Las capturas retiradas son `design-system-controles.png`, `formulario-protegido.png` y `proteccion-ediciones.png`; no se tocan artefactos de otras conversaciones. Las rutas mencionadas en C-032 y C-039 quedan como identificación histórica de evidencia retirada, no como archivos disponibles.
- Total contabilizado: 3.014 archivos y 27.905.365 bytes (aproximadamente 28 MB), contando documentos, placeholders, temporales y archivos generados. Sin fallos de eliminación.

**Consolidación y verificación:**

- Instrucciones operativas vigentes consolidadas antes de retirar su fuente en `docs/arquitectura_v15.md` §6: permisos Oracle, separación de cuentas, instalación/reinicio autorizado, entorno de pruebas, TLS, respaldos y configuración segura. No se ejecutó ninguna de esas operaciones.
- Actualizados AGENTS.md, README y documentos vigentes para no remitir a fuentes retiradas. Se conserva el patrón de formularios con sus ejemplos, contratos, fundamentos y principios del design-system.
- Comparación SHA256 de 197 archivos iniciales: 11 retirados, nueve documentos modificados por la consolidación y 177 archivos conservados, incluido todo el código fuente, pruebas, tokens, migraciones y ambas planillas. Sin archivos nuevos ni cambio funcional.
- Verificación final: 50 enlaces locales en nueve documentos Markdown, sin destinos inexistentes; `git diff --check` sin errores. Bloque PT-01 a PT-14 conservado y ningún destino previsto de purga permanece. Las referencias textuales históricas no se convierten en instrucciones vigentes.
- No se ejecutaron pruebas funcionales, Oracle, contraste ni recompilación: el código permanece idéntico y recompilar recrearía los archivos generados retirados. No se reutilizan los resultados de C-039 como pruebas de esta purga.

**Estado:** purga y consolidación completas; revisión de la misma IA autora, sin integración ni despliegue. No se hace commit ni se reescribe el historial de Git. Esta limpieza no cambia los pendientes de evaluación o adopción del design-system.

## C-041 — Retiro de códigos visibles en las tarjetas del mapa

**Clasificación y autorización:** defecto de especificación/diseño de C-036, cuya decisión de mostrar códigos retira expresamente el responsable. Fuentes: instrucción del responsable, arquitectura v15 §5.2, REQ-19 y STD-UX-001 R-12. La búsqueda por código o nombre no implica que las tarjetas deban mostrar el identificador.

**Comportamiento esperado y revisión previa (misma IA autora):** las tarjetas muestran nombre, cantidad de procesos y descripción disponible, sin código visible. Se corrige primero arquitectura v15 y se revoca el criterio de C-036. Se conservan datos, búsqueda por código/nombre, destinos y filtros de retorno. No se cambia la planilla, el alcance de requisitos ni el estándar genérico del kit.

**Verificaciones previstas:** actualizar la regresión del mapa para comprobar ausencia del código en la tarjeta, presencia del nombre/contador, búsqueda por código/nombre y enlace al macroproceso. Ejecutar la suite afectada y revisión del cambio. Registrar por separado contraste y revisión visual, sin atribuir resultados no ejecutados.

**Corrección implementada:** retirados el elemento visible del código y su estilo sin uso en `mvp-v14-demo.component.html/.css`. La regresión existente en `mvp-v14-interface.spec.ts` exige que la tarjeta no contenga `MP1`, mantiene nombre y contador y continúa buscando por código y nombre. C-036 queda expresamente revocada en este punto, conservando la trazabilidad histórica.

**Tarea y reglas aplicables:** cualquier perfil autenticado que explora `/mapa` y abre un macroproceso. PUX-02/03/05; R-09.1 y R-09.3 (nombre y destino reconocibles), R-12.1/3/5 (datos y contador conservados, identificación comprensible). Se mantienen los accesos equivalentes ya inventariados en arquitectura §5.1; este cambio no añade, elimina ni redirige enlaces (R-10), ni modifica el retorno (R-11).

**Evidencia y revisión del 2026-10-22, entorno local Windows:**

| Comprobación | Estado y evidencia |
| --- | --- |
| Texto y recorrido funcional automatizado | **Aprobado en la comprobación:** `npm test --workspace frontend -- --include src/app/mvp-v14-interface.spec.ts`, 10 pruebas aprobadas. Incluye tarjeta sin código, nombre/contador, búsqueda por código/nombre, destino del enlace y filtros del recorrido. Render Angular en jsdom; no acredita revisión humana. |
| Contraste | **Aprobado en la comprobación:** `npm run check:contrast --workspace frontend`, 44 combinaciones conformes. Se conserva la paleta y los estilos restantes; la comprobación no acredita toda combinación posible del frontend. |
| Revisión visual en navegador | **No probado:** no se ejecutó inspección visual, reajuste ni ampliación en navegador para este retiro. |
| Revisión de implementación y documentos | **Aprobado en la comprobación:** revisión de la misma IA autora; eliminado el elemento y selector sin uso, sin alterar lógica de búsqueda, datos, permisos, rutas, tokens o contratos. `git diff --check` sin errores de espacios; se preservan cambios previos. No es revisión independiente. |
| Oracle y regresión backend | **No aplica:** no se modifica persistencia, SQL, API ni comportamiento del servidor. |

**Estado:** retiro aplicado y regresión aprobada; revisión visual pendiente, sin declaración de conformidad UX integral. Sin commit, integración ni despliegue.

## C-042 — Descripciones propias de macroprocesos desde la semilla hasta el mapa

**Clasificación y autorización:** cambio de contenido y criterios de presentación expresamente autorizado por el responsable el 2026-10-23, y defecto de implementación al omitir `DESCRIPTION` en la API. REQ-01/02/04, STD-UX-001 R-12.1/2/3/5, PT-01/03/08. Se autoriza además renombrar «Gestión del Talento y Personas» a «Gestión de Personas y Abastecimiento» y «Asesoría Jurídica y Normativa Institucional» a «Gestión de Servicios Tecnológicos», conservando los procesos asociados.

**Origen del texto retirado:** C-033 documentó identificar el alcance de los contadores (mapa completo frente a resultados filtrados), en línea con R-12.3. No se encontró un requisito que exigiera el literal «Tipos y procesos del mapa completo de este macroproceso. Las unidades se cuentan en los resultados filtrados, hasta 300.». Su redacción y ubicación bajo el título fueron decisiones de implementación. El responsable ordena retirarlo; se conservan etiquetas de alcance y el aviso del límite del listado, sin ese párrafo.

**Comportamiento esperado y revisión previa (misma IA autora):** los 11 macroprocesos iniciales reciben descripciones específicas, neutrales y fieles a sus procesos. Cargador y semilla conservan y persisten ese campo; la API lo devuelve y ambas vistas lo muestran bajo el nombre antes de los contadores. Ausencia o blanco no genera texto ficticio. Primero se actualizan criterios de REQ-02 y especificación/arquitectura v15 y se precisa R-12.1, sin cambiar jerarquía, permisos, procesos ni datos de negocio relacionados. No se modifica ninguna migración aplicada ni se reinstala la base de datos.

**Verificaciones previstas:** contenido de los 11 registros, persistencia y lectura en Oracle, respuesta del mapa, descripción y ausencia de texto genérico en ambas vistas, ausencia/blancos, regresión del recorrido y contraste. Registrar por separado revisión visual y límites de la evidencia. Accesos y retorno conservan arquitectura §5.1 (R-09 a R-11).

## C-043 — Estandarización de asistencia y ayuda contextual (R-13)

**Clasificación y autorización:** defecto de especificación/diseño e implementación. La dispersión y ubicación inconsistente de los botones de ayuda en distintas vistas (dentro de toolbars de búsqueda, intercalados erráticamente entre botones transaccionales o de cambio de ciclo de vida del proceso, o el despliegue de modales bloqueantes `confirm()` para definiciones de una sola línea) degradaban la ergonomía, accesibilidad y predictibilidad de la interfaz. Autorizado expresamente por el responsable para estandarizar principios, directrices, especificación y arquitectura antes de modificar el código.

**Fuentes:** STD-UX-001 (regla R-13 incorporada), AGENTS.md, `docs/marco_estandar_ux_institucional.md`, `docs/catalogo-componentes.md`, `docs/design-system.md`, `docs/arquitectura_v15.md`, PT-01, PT-02, PT-03, WCAG 2.2 AA.

**Documentos corregidos previamente (document-first):**

1. `AGENTS.md`: Incorporación de la regla obligatoria de Asistencia y Ayuda Contextual Estandarizada (R-13).
2. `docs/marco_estandar_ux_institucional.md`: Especificación formal de R-13 estructurada en tres niveles estrictos:
   - *Nivel 1 (Global de módulo/sistema):* en barra superior `ui-module-nav`, alineada al extremo derecho contigua a controles de sesión.
   - *Nivel 2 (Vista o pantalla):* en cabecera del panel o franja contextual superior (`panelActions` o bloque de orientación). Se implementa con botón secundario discreto (`.help-button`) y diálogo modal accesible (`UiDialogService.confirm`). Queda estrictamente prohibido incrustar botones de ayuda dentro de barras de búsqueda/filtros o intercalarlos entre botones transaccionales o de cambio de ciclo de vida (guardar, solicitar revisión, aprobar, retirar).
   - *Nivel 3 (Micro-ayuda de campo o indicador):* contigua a la etiqueta (`<label>`) o título mediante micro-botón circular (`.info-icon-btn` de 18-20 px), con asistencia no bloqueante mediante tooltip o texto contextual accesible (`title`, `aria-label`, `aria-describedby`). Prohibido lanzar modales bloqueantes `confirm()` para definiciones de una línea.
   - Actualización de los 4 arquetipos visuales y adición de la comprobación R-13 a la matriz de verificación §6.2.
3. `docs/catalogo-componentes.md`: Especificación técnica del patrón de asistencia y ayuda (.help-button e .info-icon-btn) en §5.
4. `docs/design-system.md`: Especificación de diseño, estilos, dimensiones y tokens para `.help-button` e `.info-icon-btn`.
5. `docs/arquitectura_v15.md`: Incorporación en la arquitectura de interfaz §5.

**Código e interfaces corregidas:**

1. `frontend/src/app/shared/ui/styles/base.css`: Definición transversal de las clases `.help-button` e `.info-icon-btn` con foco visible, contraste normativo y comportamiento accesible.
2. `frontend/src/app/mvp-v14-demo.component.html` y `.css`: Botón de ayuda movido fuera de `.map-toolbar` (barra de filtros) a `.map-heading` (cabecera contextual del mapa de procesos).
3. `frontend/src/app/macroprocess-detail.component.ts`: Botón de ayuda unificado como `.help-button` en `.top-nav-bar`; micro-ayuda de "TIPO DE PROCESO" convertida a `.info-icon-btn` no bloqueante con `title`/`aria-label` (eliminado el modal intrusivo `openTypeHelp()`).
4. `frontend/src/app/process-detail.component.ts`: Botón de ayuda contextual reubicado en `.top-nav-tools` y separado de las acciones de ciclo de vida en `.workflow-actions-bar`. Micro-botones `?` de "TIPO DE PROCESO", "MACROPROCESO", "ÁREA DE NEGOCIO" y "Nivel de riesgo" convertidos a `.info-icon-btn` no bloqueantes (eliminados los diálogos bloqueantes de una línea). Preservadas las protecciones de edición y guardado conforme a C-032.
5. `frontend/src/app/mvp-v14-interface.spec.ts`: Regresión añadida para comprobar que el botón de ayuda del mapa se ubica en `.map-heading` y no en `.map-toolbar`.
6. `frontend/src/app/process-lifecycle.spec.ts`: Regresión añadida para comprobar que en la ficha del proceso el botón de ayuda está en `.top-nav-tools`, separado de `.workflow-actions-bar`, y que los indicadores emplean micro-ayuda accesible no bloqueante.

**Evidencia de verificación (entorno local Windows):**

| Comprobación | Estado y evidencia |
| --- | --- |
| Pruebas automatizadas frontend | **Aprobado en la comprobación:** `npm test --workspace frontend`, 10 archivos de prueba y 96 pruebas aprobadas (100% de éxito). Incluye pruebas unitarias de UI, formularios, navegación, auditoría, usuarios, ciclo de vida, protección de ediciones e interfaz. |
| Contraste normativo WCAG 2.2 AA | **Aprobado en la comprobación:** `npm run check:contrast --workspace frontend`, 44 combinaciones conformes (todas superan ratios 4.5:1 texto normal y 3:1 componentes de interfaz/foco). |
| Reglas de navegación y UX | **Aprobado en la comprobación:** regla R-13 cumplida en sus tres niveles en todas las vistas afectadas; preservadas R-07.2 (protección de ediciones), R-09/R-10/R-11 (rutas, accesos equivalentes y retorno). |
| Backend y persistencia | **No aplica:** la estandarización es estrictamente de presentación, directrices y experiencia de usuario frontend; no altera persistencia ni endpoints. |

**Estado:** Directrices y código corregidos y verificados. Sin commit, integración ni despliegue.

## C-044 — Retiro integral de asistencia y controles de ayuda de la interfaz

**Clasificación y autorización:** cambio de producto y especificación/diseño expresamente ordenado por el responsable el 2026-10-23. Se revoca por completo la incorporación de botones, modales y micro-ayudas contextuales en la interfaz del producto, procediendo a su eliminación tanto de las definiciones normativas como de toda la implementación frontend.

**Fuentes:** instrucción directa del responsable; revocación de R-13 en STD-UX-001; PT-01, PT-02, PT-03.

**Documentos corregidos (document-first):**

1. `AGENTS.md`: Eliminada la regla R-13 de asistencia y ayuda contextual de las directrices para desarrolladores y agentes.
2. `docs/marco_estandar_ux_institucional.md`: Eliminada la regla R-13 de los principios PUX-01, PUX-02, PUX-06 y de la matriz de verificación §6.2. Eliminada la sección formal de R-13 y ajustados los arquetipos 1, 2, 3 y 4 y el diagrama Mermaid para reflejar cabeceras y paneles limpios sin controles de ayuda.
3. `docs/catalogo-componentes.md`: Eliminado el patrón de «Asistencia y Ayuda» (`.help-button` e `.info-icon-btn`) de la tabla de patrones compartidos en §5.
4. `docs/design-system.md`: Eliminada la sección de estilos y especificaciones para controles de asistencia.
5. `docs/arquitectura_v15.md`: Eliminada la arquitectura de asistencia contextual de §5.

**Código e interfaces corregidas:**

1. `frontend/src/app/shared/ui/styles/base.css`: Eliminadas las clases `.help-button` e `.info-icon-btn`.
2. `frontend/src/app/mvp-v14-demo.component.html` y `.ts`: Eliminado el botón «Ayuda» del encabezado del mapa (`.map-heading`), el método `help()` y la inyección no utilizada de `UiDialogService`.
3. `frontend/src/app/macroprocess-detail.component.ts`: Eliminado el botón «Ayuda» de la cabecera, la micro-ayuda de «TIPO DE PROCESO», los estilos locales asociados, el método `openHelp()` y la inyección de `UiDialogService`.
4. `frontend/src/app/process-detail.component.ts`: Eliminado el botón «Ayuda» de la barra contextual superior (`.top-nav-tools`), eliminados los 4 micro-botones de «TIPO DE PROCESO», «MACROPROCESO», «ÁREA DE NEGOCIO» y «Nivel de riesgo», los estilos asociados y el método `openHelp()`. Preservadas intactas las protecciones de guardado y edición (C-032).
5. `frontend/src/app/mvp-v14-interface.spec.ts`: Actualizada la prueba del mapa para verificar ausencia de `.help-button` en lugar de abrir el modal de ayuda.
6. `frontend/src/app/process-lifecycle.spec.ts`: Actualizada la prueba para verificar que no se renderizan botones de ayuda ni micro-ayuda en el detalle del proceso (`.help-button` e `.info-icon-btn` ausentes).

**Evidencia de verificación (entorno local Windows):**

| Comprobación | Estado y evidencia |
| --- | --- |
| Pruebas automatizadas frontend | **Aprobado en la comprobación:** `npm test --workspace frontend`, 10 suites y 96 pruebas aprobadas (100% de éxito). |
| Contraste normativo WCAG 2.2 AA | **Aprobado en la comprobación:** `npm run check:contrast --workspace frontend`, 44 combinaciones conformes. |
| Integridad de interfaz y navegación | **Aprobado en la comprobación:** navegación, cabeceras, filtros y formularios operan de forma limpia y despojada de controles de ayuda, manteniendo intactas las protecciones de edición (R-07.2) y los recorridos (R-09 a R-11). |
| Backend y persistencia | **No aplica:** cambio estrictamente visual y de presentación frontend. |

**Estado:** Retiro completado y verificado. Sin commit, integración ni despliegue.

## C-045 — Consumo consistente de tokens dimensionales del kit

**Hallazgo y clasificación SDD (2026-10-23):** defecto de implementación. El responsable solicita corregir valores de espaciado, tamaño y radio escritos directamente en los estilos compartidos cuando existe un token equivalente. Fuentes: `docs/design-system.md`, sección 4; `docs/catalogo-componentes.md`, secciones 1 y 5; PT-01 y PT-03. Se conserva la especificación y el diseño aprobado.

**Tarea, perfiles y recorrido:** presentación compartida de paneles, formularios, mensajes, tablas, diálogos, migas y navegación para todos los perfiles. Se revisan por separado el CSS común y el CSS encapsulado de navegación; las vistas y rutas del producto no se editan.

**Comportamiento esperado y decisión previa:** sustituir únicamente literales con equivalencia exacta y rol semántico adecuado por tokens existentes, incluidas expresiones dimensionales y reglas adaptables. Mantener los valores calculados por defecto, selectores, textos, destinos, orden, foco, estados y los siete HEX de marca. Los valores sin token equivalente y las constantes estructurales permanecen; no se amplía la escala ni se aproximan medidas.

**Reglas y verificaciones previstas:** R-01.1/1.3/1.4/1.6 (estabilidad y adaptación), R-08.1–4 (accesibilidad, contraste, ampliación y reajuste). Comparación antes/después al resolver tokens, compilación, contraste y pruebas focalizadas existentes; inspección visual y textos/recorrido de una muestra neutra con los estilos reales. R-02 a R-07 y R-09 a R-12: sin cambios de semántica, contenido ni comportamiento; comprobar conservación por revisión del cambio. Oracle: no aplica por ausencia de persistencia, SQL, grants o transacciones.

**Revisión previa:** misma IA autora; corrección acotada al consumo de tokens, sin nuevos requisitos, dependencias ni controles. Resultados y límites pendientes de registrar tras ejecutar las verificaciones.

**Corrección implementada:** 30 sustituciones en `frontend/src/app/shared/ui/styles/base.css` y cuatro en `frontend/src/app/shared/ui/module-nav.component.ts`. Espacios de encabezados, mensajes, paneles, tablas, paginación, migas y controles segmentados; separación de bordes del contenido/diálogo; márgenes negativos en pantalla estrecha; radio del mensaje, tamaño del título de sección e interlineado del diálogo. Se consumen tokens existentes con equivalencia exacta; no se modificó `tokens.css`. Las medidas sin equivalente semántico permanecen; por ejemplo, una altura no se vincula a un token de espacio solo por compartir valor numérico.

**Evidencia ejecutada (Windows local, 2026-10-23):**

| Comprobación | Estado, método y resultado |
| --- | --- |
| Equivalencia de estilos y conservación de contenido | **Aprobado en la comprobación:** comparación completa contra copias anteriores a esta tarea; al resolver las variables y normalizar decimales y márgenes negativos, ambos archivos son equivalentes. Conservados selectores, consultas de medios, plantilla, API y lógica de navegación. Los 34 reemplazos tienen el mismo valor predeterminado. Evidencia auxiliar en `C:/Users/altir/.codex/visualizations/2026/10/23/01a16703-1992-7152-8add-f8c70d337683/kit-token-consistency/equivalence.json`. |
| Pruebas existentes del kit | **Aprobado en la comprobación:** `npm test --workspace frontend -- --include='src/app/shared/ui/*.spec.ts'`, tres suites y 18 pruebas aprobadas. Para evitar el error EPERM de la ejecución previa del análisis, se asignaron TEMP/TMP solo en el proceso de prueba a un directorio escribible de evidencias; sin cambios de configuración del producto. |
| Compilación frontend | **Aprobado en la comprobación:** `npm run build --workspace frontend`, correcta. |
| Contraste | **Aprobado en la comprobación:** `npm run check:contrast --workspace frontend`, 44 combinaciones aprobadas. `tokens.css` coincide íntegramente con la copia previa; paleta y colores conservados. Contraste efectivo en navegador: **no probado** en esta tarea. |
| Textos, rutas y recorridos | Conservación estática **aprobada en su alcance** mediante equivalencia completa de los archivos y pruebas existentes de navegación/diálogos. Recorrido funcional en navegador de la aplicación: **no probado**; la muestra HTML no acredita el producto Angular. |
| Revisión visual y reajuste | **No probado:** se preparó una comparación neutra con los estilos reales antes/después, pero el navegador de la herramienta devolvió `ERR_CONNECTION_TIMED_OUT` al acceder al servidor temporal en bucle local, tanto dentro como fuera del entorno restringido. Se detuvieron ambos servidores. La equivalencia calculada no se presenta como inspección visual. Ampliación real al 200 %, reajuste observado y tecnologías de asistencia: **no probados**. |
| Alcance, controles y revisión final | **Aprobado en la comprobación:** revisión de la misma IA autora contra las copias previas; solo consumo de tokens en dos archivos de estilos y este registro. Sin cambios de requisitos, permisos, datos, rutas, guardas, textos, formularios ni controles técnicos. `git diff --check` sin errores. Se conserva el trabajo local preexistente. Revisión no independiente. |

**Estado y límites:** corrección implementada y verificación técnica aprobada; comprobaciones visuales y de navegador pendientes con los límites anteriores, sin declarar conformidad integral de interfaz ni WCAG. Sin commit, integración ni despliegue; la revisión no sustituye la conformidad requerida para producción.

## C-046 — Aislamiento y contratos de reutilización del kit

**Hallazgo y clasificación previa (2026-10-23):** defecto de especificación/diseño en el contrato de CSS global y en el criterio implícito del contador; implementación posterior de la corrección autorizada por el responsable al aceptar el abordaje de riesgos de reutilización. Fuentes: fundamentos y catálogo del kit, patrón de formularios, arquitectura v15 §5; PT-01/03/08 y STD-UX-001 R-01.1/1.3/1.4/1.6, R-05.4, R-06.1 y R-08.1–4. No se amplían funciones, límites, permisos ni requisitos de producto.

**Tarea, perfiles y recorrido:** todas las vistas de Jallupacha consumen el kit dentro del contenedor raíz; otro consumidor puede integrar una sección sin afectar controles externos. Se revisan navegación común, contenido de ruta y host modal por separado; destinos y accesos equivalentes se conservan. Los formularios actuales del flujo usan validación UTF-16 del servidor; otros DTO usan el cálculo de validator. El inventario no encuentra consumidores productivos del contador ni de `UiDialogService.form`.

**Diseño corregido antes de implementar y revisión previa (misma IA autora):** tokens y selectores, también en consultas de medios, se activan solo con `ui-root`; el restablecimiento de página se separa y requiere `body.ui-page`. Adoptarlo en `app-root` sin tocar rutas ni formularios de negocio. Compartir el cálculo de longitud entre contador/diálogo: UTF-16 por defecto y modo validator explícito, sin normalización ni cambios de límites del servidor. Preservar el modo anterior mediante opción documentada; no usar `maxlength` nativo como equivalente a validator. Documentar migración, muestra de convivencia y condiciones de compatibilidad antes de construir.

**Casos previstos:** cargar CSS junto a controles externos → estilos/tokens externos conservados; activar un contenedor → controles propios estilizados; segundo contenedor con sobrescritura → primero conservado; modal dentro del ámbito → foco/error/cancelación conservados; texto ASCII, emoji, selector de variación, marca combinada y espacios → contador y validación coinciden según criterio explícito. Compilación, pruebas existentes y nuevas, contraste y revisión del cambio. Revisión visual, teclado, ampliación/reajuste y contraste efectivo se registrarán según ejecución real. Oracle no aplica al no modificar persistencia, SQL, grants ni transacciones.

**Implementación:**

- `tokens.css` activa variables en `.ui-root`; `base.css` delimita selectores sin aumentar su especificidad (prefijo `:where` salvo la sustitución equivalente de `:root`), incluidas consultas de medios, pseudoestados y movimiento reducido. `page.css` separa el restablecimiento opcional de `body.ui-page`. Jallupacha activa esas clases en el host raíz y documento; navegación, contenido de rutas y host modal permanecen dentro del mismo ámbito. Se conservan REQ-05/06/19 y los controles de acceso de REQ-25/26.
- `text-length.ts` comparte el cálculo entre contador y validación modal; ambos admiten `lengthMode` y usan UTF-16 por defecto. La opción `validator` conserva el criterio anterior del contador y no utiliza `maxlength` nativo como equivalente. Se mantienen normalización de extremos, valores enviados, errores, foco y validación del servidor. No se cambian longitudes permitidas ni DTO, migraciones o datos.
- Muestra neutra en `frontend/test/fixtures/ui-compatibility.html`: controles externos, consumidor predeterminado y consumidor con roles propios. No se incorpora al producto ni ofrece persistencia. Tres regresiones en `frontend/scripts/ui-compatibility.spec.mjs`, ejecutadas automáticamente mediante `pretest`, comprueban estilos externos, variables por consumidor y todos los ámbitos de selectores.
- Pruebas Angular de Unicode y validación modal, actualización explícita del contrato del contador y comprobación de activación del kit en la aplicación. Fundamentos, catálogo, patrón y arquitectura documentan consumo, migración y límites; no se instala ninguna dependencia ni se extrae un paquete.

**Evidencia ejecutada (Windows local, 2026-10-23):**

| Comprobación | Estado, método y resultado |
| --- | --- |
| Aislamiento, activación y consumidores | **Aprobado en la comprobación:** `npm run check:ui-compatibility --workspace frontend`, tres pruebas aprobadas sobre el CSS y muestra reales en DOM. La misma verificación se ejecutó por el nuevo `pretest` con `npm test --workspace frontend`. Comparación de estilos y variables externas antes/después, roles independientes y comprobación de cada rama de selectores, incluidas reglas adaptables y pseudo-elementos. No equivale a un segundo producto real. |
| Regresiones y recorridos Angular | **Aprobado en la comprobación:** `npm test --workspace frontend`, diez suites y 98 pruebas aprobadas, además de las tres de compatibilidad de `pretest`. Incluye navegación, sesión, protección de cambios, formularios y modales. TEMP/TMP asignados solo al proceso a un directorio de evidencias escribible; sin cambiar configuración del producto. |
| Criterios de longitud frente al servidor | **Aprobado en la comprobación:** 60 comparaciones de frontera con las funciones reales `optionalText` del flujo vigente y `maxLength` de class-validator instalado. ASCII, emoji, secuencias de presentación, caracteres combinados y espacios; comparación de aceptación en límite y fuera de él. Prueba pura, sin persistencia ni solicitudes. Las regresiones Angular comprueban además contador, errores, corrección, foco y valores del diálogo para ambos modos. |
| Compilación y contraste de tokens | **Aprobado en la comprobación:** `npm run build --workspace frontend`, correcto; `npm run check:contrast --workspace frontend`, 44 combinaciones aprobadas. |
| Revisión de cascada y paleta | **Aprobado en la comprobación:** comparación mediante analizador CSS contra copias previas: 106 reglas conservan declaraciones y orden; se retira únicamente la regla de body a `page.css` y se añade display block al nuevo contenedor. Todos los tokens, incluidos los siete HEX de marca, permanecen idénticos en sus declaraciones. `git diff --check` sin errores. |
| Textos, aspecto y convivencia en navegador | **Aprobado en el alcance de la muestra:** revisión visual a ancho efectivo de 1600 píxeles CSS. Controles externos conservan Georgia y radio 0, sin `--brand-ink`; el kit conserva su familia y radio de 7 px; segundo consumidor usa radio de 4 px y su primario propio. Se leen completos títulos, etiquetas, error, acciones, estado y tabla; no hay contenido de rutas del producto en la muestra. Evidencia: `C:/Users/altir/.codex/visualizations/2026/10/23/01a16703-1992-7152-8add-f8c70d337683/ui-reuse/desktop.jpg`. |
| Contraste efectivo | **Aprobado en los pares medidos en navegador:** borde de campo sobre blanco, 3,09:1; borde inválido, 7,64:1; texto principal de botón, 10,48:1; foco sobre panel, 3,30:1. Medidos a partir de estilos calculados. No acredita todas las combinaciones de futuros consumidores. |
| Teclado y reajuste | **Aprobado en el alcance de la muestra:** Tab de Nombre a Descripción, después casilla y Guardar, con foco visible. Se comprobó también acceso al botón del segundo consumidor. Ancho efectivo `innerWidth=320`; ancho de documento 301 px (barra vertical), sin desbordamiento horizontal. Revisados visualmente parte superior e inferior, botones envueltos, tabla y segundo consumidor; fuentes y textos largos conservados. El navegador tenía escala previa de 80 %, por lo que se ajustó la dimensión solicitada y se verificó el ancho CSS real. Se restableció el tamaño temporal. Evidencias: `ui-reuse/narrow-320.jpg`, `ui-reuse/narrow-320-lower.jpg` y `ui-reuse/browser-evidence.json` en el directorio de evidencias anterior. |
| Ampliación real al 200 %, tecnologías de asistencia y personas representativas | **No probado:** el reajuste por ancho CSS no acredita ampliación real; el atajo del navegador no cambió su escala. No se realizó evaluación con lector de pantalla ni usuarios. |
| API, seguridad y Oracle | Persistencia, SQL, grants y transacciones: **no aplica**, sin modificaciones. Conservación de controles técnicos y alcance: **aprobada por revisión estática y regresiones frontend**; no se ejecutó una auditoría de seguridad ni se modificaron servidor, requisitos o planilla. |

**Revisión final registrada:** misma IA autora, no independiente. Revisados contrato público, consumidores, reglas de ámbito, cascada, paleta, fallback de longitud, ausencia de nuevas dependencias y conservación del trabajo local previo. El cambio exige `ui-root` en consumidores del CSS anterior y selección explícita de `validator` si necesitan preservar ese criterio del contador; ambas adaptaciones quedan documentadas. Los estilos del anfitrión aún pueden entrar al ámbito, por lo que cada nueva integración requiere revisión. La muestra acredita aislamiento en ese contexto y no adopción institucional ni conformidad WCAG integral.

**Estado:** corrección implementada y comprobaciones técnicas y visuales anteriores aprobadas en su alcance. Pendientes de evaluación humana/entorno: ampliación real al 200 %, tecnologías de asistencia y uso en un segundo producto real; el responsable mantiene la decisión de adopción. Sin commit, integración ni despliegue; no sustituye conformidad de producción. Servidor temporal de la muestra detenido tras la verificación.
