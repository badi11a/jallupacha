# Adaptación visual del MVP v14

## Referencia detallada de mapa aprobada por el responsable

La imagen y descripción aportadas definen dos paneles: resumen superior y mapa con barra de búsqueda/familias/ayuda; contexto a la izquierda, bandas horizontales centrales con títulos sobre las tarjetas y resultados a la derecha. Se adapta la composición, no los datos ni los tokens de B. El título sigue siendo «Mapa de procesos»; no se incorporan año, nombre institucional, catálogo, cifras ni declaraciones territoriales de B. Los laterales son leyendas explicativas genéricas de entradas y resultados, no datos institucionales. No hay portal ni barras globales.

Clasificación: corrección de diseño visual y navegación del mapa (REQ-01/02/04/19, PT-01/03). Se revisa antes de implementar: el catálogo ilustrativo de 11 macroprocesos, sus descripciones y cifras 5/3/3/46/533 no sustituyen las semillas fijas de v14. Las tarjetas y todos los contadores se obtienen de `map`; se muestran los nombres existentes y sus cantidades de tipos/procesos, sin descripciones inventadas ni cambios Oracle. Cualquier reemplazo de estructura fija exige una decisión de producto separada.

La búsqueda del mapa filtra macroprocesos por código o nombre sin distinguir tildes/mayúsculas; las opciones Todos/Estratégicos/Misionales/De apoyo filtran las bandas sin cambiar su color. La búsqueda de procesos permanece disponible mediante enlace contextual a Procesos. Se conserva Nuevo proceso como acción contextual, fuera del resumen del diagrama. Ayuda abre un diálogo del kit con instrucciones del recorrido. Las tres bandas usan colores aprobados: tinta/blanco, azul acero/blanco y amarillo/tinta para mantener contraste; el texto blanco sobre amarillo sugerido en el adjunto no se aplica porque no cumple el contraste del sistema de diseño.

Revisión previa del agente: no se modifica backend, contrato de datos, estructura fija ni campos de ficha. Solo se incorporan presentación y filtros locales de macroprocesos; las rutas de exploración existentes continúan. Verificación prevista: combinaciones de filtros y búsqueda, familias vacías, colores estables al filtrar, conteos reales, navegación, ayuda, carga/error y revisión visual de escritorio respecto a la imagen.

### Evidencia de la adaptación a la referencia

Compilación frontend aprobada. Las tres suites seleccionadas (`mvp-v14-interface`, `shared/ui/ui`, `shared/ui/navigation`) aprobaron sus 22 pruebas. La regresión del mapa ahora verifica búsqueda de macroprocesos, normalización sin tildes, combinación con clasificación, color semántico estable, conteos de API, ausencia de datos de B y apertura/cierre de ayuda. Las 44 combinaciones de contraste aprobaron, incluidas las bandas: 15,47:1 estratégicos, 5,35:1 misionales y 7,61:1 apoyo. Los siete HEX de marca no se modificaron; los nuevos roles `--ui-color-map-*` referencian la paleta existente de A.

Recorrido real de escritorio realizado: seleccionar De apoyo, buscar MP1 (sin resultados), seleccionar Todos (MP1 visible), abrir/cerrar ayuda, abrir macroproceso Estratégicos y volver al mapa. Revisión visual del resultado frente a la imagen: dos paneles, banda superior en cada familia, marco de contexto/resultados, filtros y tarjetas centradas; ningún menú global. El entorno respondió con 3 macroprocesos, 7 tipos y 24 procesos; son cantidades observadas, no constantes del frontend. Captura: `mapa-referencia-v14.png` en las visualizaciones de esta conversación.

El servidor Angular local conservaba el código anterior y se reinició exclusivamente en 4200; el backend y los datos QA no se modificaron. Revisión final del agente: solo se cambió la presentación del mapa, se retiró su búsqueda local anterior de fichas y se preservó el acceso a Buscar procesos con la búsqueda completa del servidor. No hay cambios de alcance de dominio, esquema, permisos ni contratos. La suite histórica completa y auditoría WCAG completa no se ejecutaron; este registro no declara una liberación.

## Corrección de alcance visual solicitada por el responsable

La referencia comprende exclusivamente el contenido del mapa y sus vistas interiores. La barra lateral, la cabecera superior y el pie de aplicación incorporados por el agente no corresponden al alcance y se retiran. Esta decisión sustituye las menciones anteriores a navegación lateral o estructura común. Clasificación SDD: defecto de interpretación del diseño; no cambia requisitos funcionales.

Jallupacha muestra únicamente el contenido de la ruta dentro del área principal, conservando el salto accesible al contenido y el anfitrión de diálogos. Se mantienen los enlaces contextuales mapa → macroproceso → ficha, las rutas existentes y las funciones del MVP, sin un menú global ni una marca superior. Verificación: ausencia de cabecera/barra lateral/pie en mapa, macroproceso y ficha; conservación de filtros, campos y acciones.

Evidencia final de esta corrección y de la continuación: compilación frontend aprobada; 21 pruebas seleccionadas aprobadas (`mvp-v14-interface`, `shared/ui/ui`, `shared/ui/navigation`); 41 combinaciones de contraste aprobadas antes de retirar las barras, sin nuevos colores en la retirada. Las pruebas afirman ausencia de estructura global en las rutas y conservación de los campos y guardado de riesgo con API simulada. En el recorrido real de lectura se comprobó mapa → macroproceso Estratégicos → filtro Planificación (4 resultados) → búsqueda PR14 (1 resultado) → ficha y Atrás con filtros conservados. Tras retirar las barras se revisaron visualmente las tres vistas. Capturas finales: `mapa-sin-barras.png`, `macroproceso-sin-barras.png` y `ficha-sin-barras.png` en las visualizaciones de esta conversación. No hubo escrituras contra QA.

Revisión final del agente: las barras se retiraron del consumidor Jallupacha, y se revirtió la extensión lateral innecesaria del kit. Permanecen navegación contextual, área principal accesible y diálogos. El cambio no toca backend, API ni persistencia. No se integró ni se declara una liberación; la suite histórica completa y una auditoría de accesibilidad completa no se ejecutaron. Las evidencias anteriores con barras describen un estado sustituido por esta corrección.

## Decisión previa a implementación — 2026-10-19

El responsable confirmó adaptar el repositorio existente usando el equipo B como referencia visual. La planilla v14, `mvp_v14.md`, `arquitectura_mvp_v14.md` y `design-system.md` conservan su autoridad funcional.

Clasificación SDD: adaptación de diseño de interfaz aprobada, sin cambio de producto. No se considera defecto funcional la diferencia estética con B.

Etapa 1: estructura común y mapa. El kit incorpora una zona genérica para navegación lateral; Jallupacha conserva sus cuatro enlaces y rutas. En pantallas pequeñas la navegación vuelve al flujo del documento. El mapa conserva la jerarquía completa, búsqueda por código/nombre, estados y enlaces a ficha; se presenta mediante familias y tarjetas. No agrega una pantalla de macroproceso, filtros nuevos, cifras institucionales, datos ficticios, cuentas, sesiones, logos externos ni módulos adicionales.

Se mantienen los siete tokens de marca y la tipografía aprobada. Los componentes genéricos permanecen en `shared/ui`; la navegación específica y las tarjetas de procesos permanecen en la aplicación. No se alteran API, backend, modelo, migraciones ni conexión QA.

Trazabilidad: REQ-01, REQ-02 y REQ-04 (estructura fija); REQ-06 (acceso a ficha y estado); REQ-19 (acceso a búsqueda); PT-01 y PT-03 (diseño previo, verificación y revisión).

Revisión del diseño previa a código: se contrastó esta decisión con «Interfaz MVP» y el sistema de diseño. No exige contratos ni datos adicionales; conserva las cuatro secciones y separa navegación común de contenido de ruta. Revisión realizada por el agente; no sustituye conformidad del responsable para producción.

## Etapas siguientes

### Continuación aprobada — mapa, macroproceso y ficha

El responsable solicita continuar los puntos 1 a 3, centrados en experiencia de escritorio. Se revisa previamente este diseño contra REQ-01/02/04/06/19/55 y «Interfaz MVP»: adaptación de presentación y navegación, sin nuevas reglas de dominio.

- Mapa: familias horizontales con tarjetas de macroproceso, clasificación y conteos derivados de la API. La búsqueda por código/nombre conserva acceso directo a las fichas y muestra los resultados dentro de su jerarquía. No se agregan descripciones ni cifras del mockup.
- Exploración: ruta subordinada `/mapa/macroprocesos/:id`, sin quinta sección principal. Muestra nombre, clasificación, conteos de la estructura recibida, selector de tipo, búsqueda y unidad; usa `map`, `units` y `processes` del contrato actual. El filtrado por unidad mantiene la semántica del servidor (unidad asociada). Los resultados conservan el límite de 300 y su aviso; el total de mapa no se deduce de la lista truncada. No hay distribución de riesgo ni descripción de macroproceso inventada. Atrás/Adelante y acceso por URL usan Angular Router.
- Ficha: cabecera con clasificación y estado, propósito destacado, tarjetas de gobernanza (responsable, elaborador y unidades con funciones), información agrupada y referencia BPMN textual. Todos los campos REQ-06, avisos de completitud/duplicados, jerarquía padre/subprocesos y acciones de riesgos/relaciones se conservan. No hay riesgo agregado, contactos inventados ni diagrama simulado.

Revisión previa por el agente: el recorrido amplía la presentación dentro del mapa, autorizada por el responsable, sin cambiar jerarquías ni catálogos. Se mantienen las cuatro secciones, separación de kit y negocio, API y Oracle. Pruebas previstas: navegación mapa → macroproceso → ficha, acceso directo y cambio de identificador, filtros enviados al servidor, ruta inexistente, campos completos y acciones existentes. Revisión visual de escritorio y contraste de los roles usados; móvil no es objetivo de esta continuación.

Listado y ficha; después formularios, unidades y tipos. Se reutilizan contratos y validaciones de A. El riesgo agregado del proceso y el render BPMN no están autorizados por esta adaptación.

## Verificación prevista

Compilación frontend, prueba de navegación entre las cuatro rutas sin paneles ajenos, búsqueda del mapa y enlaces de todos los registros, estados de carga/error/vacío, contraste de combinaciones usadas y revisión visual en escritorio y pantalla estrecha. No se prueban escrituras contra QA para esta etapa.

## Evidencia

- Compilación frontend ejecutada y aprobada.
- Pruebas seleccionadas ejecutadas: `mvp-v14-interface.spec.ts` y `shared/ui/ui.spec.ts`, 15 casos aprobados. Cubren las cuatro rutas y su contenido exclusivo, ausencia de autenticación, enlaces y estados del mapa, filtrado, carga/error y componentes compartidos.
- El primer intento de pruebas falló antes de ejecutar casos por permisos de archivos temporales de Windows. Se repitió fuera del aislamiento. Se corrigió el anfitrión del test del logo para notificar cambios mediante una señal Angular; no cambia el comportamiento del producto.
- Contraste: 39 combinaciones aprobadas mediante `check:contrast`, incluidas las nuevas combinaciones del contador y foco sobre fondo acentuado. No equivale a una auditoría completa WCAG.
- Recorrido real de lectura en la aplicación local existente, puerto 4200: mapa con 24 procesos, búsqueda PR24 (1 de 24), apertura de `/procesos/24` y vuelta al mapa. Se revisaron textos visibles y estado Borrador. No hubo escrituras contra QA.
- Revisión visual de escritorio realizada sobre la aplicación renderizada: cabecera, cuatro enlaces laterales, búsqueda y tarjetas. Evidencia en la carpeta de visualizaciones de esta conversación, `jallupacha-mapa.png`.
- Ancho móvil y recorrido manual completo por teclado: pendientes. El cambio incluye reglas adaptables pero no se declara comprobada su presentación móvil.
- Revisión final del diff por el agente: navegación de aplicación fuera del kit; zona de proyección genérica en el kit; datos y lógica de búsqueda preservados; sin cambios de backend, API, migraciones ni requisitos. Se revisaron contraste del foco sobre selección y ajuste de encabezados. No se integra ni se declara liberado.
- La suite histórica completa no se ejecutó: contiene expectativas v13 de autenticación y rutas ajenas al piloto. No se declara actualizada ni aprobada por las pruebas seleccionadas.
