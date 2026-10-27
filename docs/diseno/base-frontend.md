# STD-FE-001 — Base de frontend: seguridad, eficiencia y reutilización

Versión 0.2.0 (ampliación compatible C-050 de paginación; la base inicial 0.1.0 se definió en C-048). Decisión de diseño C-048, autorizada el 2026-10-26 por el responsable al solicitar implementación y adopción en SDD. Aplica al frontend Angular de este repositorio y a la plantilla que genera. La adopción por otros productos requiere comprobar sus contratos y recorridos; no concede conformidad institucional automática.

## 1. Clasificación, fuentes y revisión previa

Mejora de diseño autorizada: separar responsabilidades, consolidar un núcleo configurable y producir una base reproducible. Defectos de implementación asociados: confianza inicial en identidad de sessionStorage, clasificación imprecisa de URLs HTTP, ocultación de errores de cierre, pérdida de retorno en ficha y consumo desigual de estilos/formularios. Se conservan requisitos y contratos del producto (REQ-05/06/19/25/26; PT-01/02/03/08/09/10/11/12).

Arquitectura v15 §5 y este documento definen el diseño antes del código. STD-UX-001 y el patrón de formularios conservan su autoridad sobre interacción/accesibilidad. Revisión previa de la misma IA autora: responsabilidades, dependencias, estados y criterios siguientes cotejados con esas fuentes. Revisión no independiente; las evidencias ejecutadas se registran en correcciones.md.

## 2. Responsabilidades y dependencias permitidas

* `core/platform`: mecanismos genéricos de sesión por cookies, clasificación de API, destinos internos y cambios pendientes. Configuración inyectable, sin nombres, perfiles ni rutas de Jallupacha.
* `core/auth`: adaptación del contrato de identidad/perfiles y políticas de navegación del producto. Las guardas sirven a navegación; cada permiso sigue siendo verificado en el servidor.
* `features/<funcionalidad>`: pantallas, componentes propios, servicios y modelos del dominio. Carga diferida por ruta; infraestructura y UI no importan funcionalidades.
* `shared/ui`: API pública y estilos genéricos. Sin HTTP de negocio ni imports de core/features. El dominio compone componentes; no copia sus selectores internos.
* Composición raíz: configuración del producto, proveedores, navegación, outlet y host modal. Un formulario hijo participa del contrato de salida del contenedor; la ruta guarda al contenedor y este agrega sus cambios. No se crean rutas artificiales para campos o editores.

Separar HTML/CSS de pantallas extensas. Extraer componentes cuando exista una responsabilidad delimitada; no usar cantidad de líneas como único criterio. Separar modelos/metadatos de servicios HTTP. No introducir gestores de estado, capas ni dependencias sin necesidad comprobada.

## 3. Contrato del núcleo seguro

La identidad inicial se obtiene mediante el endpoint configurado de sesión. El almacenamiento del navegador no acredita una sesión; no persistir credenciales, tokens ni datos de formularios para recuperarla. Validar la estructura de la identidad y los perfiles que admita cada producto. Deducir capacidades desde esa identidad y reconciliarla al iniciar o recuperar autorización.

Clasificar direcciones con URL y límites de segmento/origen, no con `startsWith('/api')`. Solo destinos configurados reciben credenciales/CSRF y tratamiento de expiración; una respuesta 401 externa no cierra la sesión del producto. La configuración de esta base utiliza API del mismo origen. `provideCookieSessionHttp` registra conjuntamente credenciales y double-submit CSRF acotado a esa API: sustituye el interceptor XSRF global de HttpClient para evitar que adjunte el token a otras rutas del mismo origen. No desactivar esa protección desde consumidores. Una integración entre orígenes necesita diseño y verificación propios.

Deduplicar consultas simultáneas de sesión y salidas por 401. Descartar respuestas de sesión anteriores a un login/logout/expiración; no permitir que una petición tardía restaure identidad. Un error de red/403 al cerrar sesión se informa y conserva estado para reintentar; 401 acredita que ya no hay sesión. No anunciar revocación por haber limpiado memoria. Confirmar modificaciones antes de iniciar el cierre.

Destinos posteriores al acceso deben ser internos, de la aplicación, sin esquemas, doble barra, barras inversas, controles ni outlets auxiliares. Cada producto restringe además los destinos de retorno de sus colecciones. No usar saltos de sanitización para renderizar datos externos. No reintentar automáticamente escrituras.

La única adaptación de API necesaria para este cambio es permitir que los cinco perfiles ya definidos consulten y cierren su propia sesión: me/logout deben incluir VALIDATOR. No cambia persistencia ni amplía permisos de negocio.

## 4. Eficiencia e interacción

Elegir carga inmediata para entrada pequeña y diferida para funcionalidades. Medir paquete inicial antes/después y conservar presupuesto. Componer cargas independientes; cambios de parámetros usan cancelación o invalidación de respuestas anteriores. No declarar mejor latencia sin medición.

Formularios nuevos/extensos: preferir controles reactivos tipados; mantener límites y obligatoriedad del contrato. Migrar consumidores existentes con regresiones, no cambiar de paradigma por uniformidad cosmética. Compartir auxiliares de cambios pendientes, errores/foco y presentación; reglas del dominio permanecen en su funcionalidad. Descarte limpio inmediato, confirmación solo con cambios, bloqueo coherente mientras guarda, preservación ante fallo y protección entre editores.

Títulos, rutas y disposición de navegación son configuración del producto. La plantilla no impone el mapa, perfiles ni el menú de Jallupacha. Mantener paleta aprobada y roles semánticos, errores asociados y contornos de foco; comprobar estilos efectivos en los consumidores. No inventar contactos ni responsabilidades como atributos de registros.

## 5. Plantilla, versiones y distribución

La fuente mantenida es el núcleo y kit de este repositorio. Un manifiesto versionado y un generador con lista explícita de archivos producen una aplicación Angular neutral, con configuración propia y ejemplo mínimo de formulario. No copiar funcionalidades, datos, credenciales, node_modules ni configuración local. El generador rechaza destinos existentes y enlaces simbólicos en fuentes; no sobrescribe proyectos.

La salida registra versión y hashes de procedencia. La comprobación de procedencia detecta divergencias de inventario y archivos; no determina compatibilidad funcional ni actualiza consumidores silenciosamente. API incompatible exige incremento mayor, migración y consumidores identificados; adiciones compatibles, menor; correcciones compatibles, parche. La versión 0.2.0 sigue siendo base en validación, no paquete institucional estable. C-050 añade un modo de resumen y nombre accesible a la paginación, conservando su resumen predeterminado; la revisión de consumidores y evidencia se registra junto al cambio.

Validar generación, compilación y comportamiento con un consumidor neutral separado antes de distribuir. Ese ejemplo verifica reutilización técnica; no equivale a un segundo producto validado con personas. Publicación en registro, soporte institucional y promoción de paquetes se deciden después de esa evidencia. Se autoriza la plantilla local y contrato versionado; no una publicación externa automática.

## 6. Criterios de aceptación obligatorios

| ID | Criterio y evidencia exigida |
| --- | --- |
| FE-01 | Arranque con almacenamiento manipulado no concede identidad; identidad válida proviene del contrato configurado. Probar respuesta inválida y consulta deduplicada. |
| FE-02 | API exacta y descendientes reciben tratamiento de sesión; `/apiculture`, destinos externos y prefijos parecidos quedan fuera. Probar CSRF en escritura real de HttpClient configurado y ausencia fuera del ámbito. |
| FE-03 | Fallo de logout ofrece reintento; confirmación previa conserva ediciones si se cancela; respuesta tardía no restaura sesión. Probar cierre pendiente, 401 concurrentes y 403 de recuperación. |
| FE-04 | Retornos rechazan URLs externas/outlets y conservan filtros/contexto válidos. Probar listado → ficha → editar → ficha → listado, y entrada directa. |
| FE-05 | Dependencias respetan §2, las rutas de funcionalidades son diferidas y el kit no conoce dominio. Comprobación estática y compilación. |
| FE-06 | Carga/error/vacío/guardado/descarte accesibles y distinguibles; no doble envío ni pérdida entre editores. Regresiones de consumidores y ejemplo reactivo tipado. |
| FE-07 | Tokens exactos, contraste efectivo y navegación/textos revisados por separado. Registrar DOM, contraste, teclado, revisión visual, 200 %, 320 px y asistencia como comprobaciones distintas, sin convertir no probado en aprobado. |
| FE-08 | Plantilla reproducible sin negocio ni secretos; generación sin sobrescritura; manifiesto/hashes válidos; compilación y prueba de consumidor neutral. |
| FE-09 | Verificación automatizada de tipos, políticas estáticas, comportamiento, aislamiento, presupuesto y dependencias. CI comprueba secretos y análisis de seguridad; no llamar auditoría completa a comprobaciones de patrones limitadas. |
| FE-10 | Todo cambio de la base identifica requisito/principio, contrato, clasificación SDD, consumidores, migración, pruebas y revisión en el mismo cambio de Git. Excepciones con alcance/justificación y estado. |

## 7. Aplicación en SDD

Antes de construir: identificar tarea y consumidores, clasificar defecto/diseño/producto, documentar comportamiento y revisar el diseño. Antes de integrar: ejecutar los criterios afectados, registrar resultado real y revisión; el generador no exime al consumidor de verificar contratos, autorización y UX.

Usar `docs/trazabilidad/correcciones.md` para hallazgo, decisión, matriz de evidencia y pendientes; no crear un registro de incidencias paralelo. Estados: aprobado en su alcance, fallido, no probado y no aplicable con razón. Las comprobaciones de producción y conformidad humana conservan sus procedimientos.

C-048: el proveedor único provideCookieSessionHttp encapsula la protección de credenciales/CSRF y se utiliza en la composición de ambos consumidores. Presupuesto inicial de referencia: aviso a 450 kB y error a 600 kB; cualquier ajuste requiere justificar contenido y medición. Las actualizaciones de seguridad de herramientas y sus overrides se registran junto al lockfile y se verifican en producto y plantilla.

Revisión previa adicional C-048: en el consumidor neutral, con viewport real de 320 píxeles CSS y barra vertical, `body.ui-page { min-width: 320px }` provoca desborde horizontal. Defecto de implementación frente a R-08.4: el restablecimiento compartido debe permitir reducir el documento al espacio disponible (`min-width: 0`), conservando mínimos locales solo cuando la tarea los necesite. Verificar nuevamente compilación, convivencia CSS y reajuste del consumidor; no sustituye la comprobación de tablas o pantallas del producto.

En la comprobación posterior del listado de procesos a 320 píxeles CSS, sus cinco columnas se comprimen hasta partir encabezados letra por letra. Corrección delimitada, revisada antes de implementarse: conservar un ancho legible local de la tabla dentro de su región horizontal ya existente, etiquetada y enfocable; el documento y los filtros siguen reajustándose. La relación entre encabezados y celdas requiere conservar la cuadrícula (R-08.4); no se aplica un ancho mínimo universal a las tablas de la base. Verificar desplazamiento por teclado y ausencia de desborde del documento.

## 8. Consolidación del consumo y medición (C-049)

Decisión del responsable del 2026-10-27: el trabajo derivado de la revisión del frontend se limita a los dos frentes siguientes. La decisión inicial definió alcance y plan; su implementación y resultados se registran en C-049. Se conservan requisitos y umbrales funcionales. Las comprobaciones no ejecutadas conservan ese estado como límite de evidencia; las condiciones de adopción y liberación mantienen sus procedimientos y no se incorporan como tareas adicionales de esta revisión.

### 8.1. Consumo uniforme del kit

Clasificación: defecto de implementación respecto del patrón de formularios §5 y de este documento §4. Los campos equivalentes deben consumir `--ui-control-height`, `--ui-radius-md`, bordes y estados del kit. Las diferencias de distribución solo se conservan cuando responden a una tarea identificada.

1. Inventariar campos, filtros, formularios completos e inline, acciones y contenedores en acceso, procesos, catálogos, usuarios y auditoría. Identificar la regla compartida y las redefiniciones locales/globales que intervienen; usar el mismo registro de Git para la matriz de consumidores.
2. Migrar los controles equivalentes a los estilos existentes. Retirar duplicaciones de altura, radio, relleno y estados; componer `.ui-form`, `.ui-form-grid`, `.field` y `.ui-form-actions` donde correspondan. Conservar distribuciones específicas justificadas, reglas del dominio, destinos, validación y protección de ediciones. La uniformidad no exige convertir todos los formularios al mismo paradigma ni agregar envoltorios de controles nativos.
3. Revisar por separado el contenido común y cada ruta afectada. Comprobar textos y recorrido limpio, inválido, guardando, fallo y descarte; inspeccionar estilos efectivos, contraste, foco, teclado y reajuste de los consumidores modificados según FE-07 y STD-UX-001. Ejecutar las regresiones significativas, aislamiento, políticas estáticas, compilación y verificación del consumidor neutral si cambian las fuentes exportadas.

**Cierre:** cada consumidor inventariado tiene migración comprobada o una diferencia local justificada y revisada; los controles equivalentes reciben el contrato visual compartido y no quedan redefiniciones contradictorias sin resolver. Registrar evidencia y estados por comprobación. Las fuentes del generador deben reflejar los cambios del kit sin sobrescribir consumidores existentes.

### 8.2. Eficiencia técnica del frontend

Clasificación: ampliación de evidencia técnica de FE-05; el tamaño del paquete y el tiempo de respuesta del navegador son medidas distintas. La reducción registrada de 532,40 a 407,27 kB solo demuestra menor tamaño inicial. Por precisión expresa del responsable del 2026-10-27, el objetivo es exclusivamente eficiencia técnica, comprobable mediante pruebas reproducibles sin sesiones con personas. No se añade un objetivo de velocidad ni se promete una mejora porcentual sin medición.

1. Establecer una línea base reproducible de la versión actual antes de optimizar: compilación de producción, equipo/navegador, red de intranet, API y conjunto de datos genéricos equivalentes, perfil, caché fría o caliente, número de repeticiones y versión identificada. Una comparación histórica requiere ejecutar también la versión anterior en condiciones equivalentes; sin esa evidencia no se atribuye retrospectivamente una mejora a C-048.
2. Medir por separado inicio hasta pantalla utilizable, búsqueda hasta resultados, apertura de ficha y entrada al formulario hasta quedar disponible. Definir para cada escenario un inicio y una condición final observable en el navegador; automatizar su repetición. Registrar tiempo total y, cuando sea observable, espera de API, carga y presentación; distinguir entrada inicial de navegación interna. Una API controlada con datos genéricos permite aislar el frontend, identificando la simulación y sus límites. Una medición adicional de extremo a extremo usa el ambiente de pruebas con Oracle y se informa separadamente; no es condición para concluir la evaluación aislada del frontend.
3. Registrar tamaño inicial y diferido, bytes transferidos, cantidad de solicitudes, tiempos de carga/presentación y errores técnicos por escenario, según los datos disponibles del navegador. Distinguir recursos de arranque, funcionalidades diferidas y peticiones de API para localizar trabajo redundante. Conservar resultados agregados y condiciones de prueba, sin credenciales, contenido de formularios ni telemetría permanente. La evaluación no mide tiempos humanos de ejecución, éxito de usuarios ni percepción de espera.
4. Comparar resultados por escenario, indicando cantidad de muestras, mediana y dispersión; evitar percentiles altos con muestras insuficientes. Optimizar únicamente el cuello de botella observado y repetir los mismos casos. Conservar presupuesto de compilación, permisos y regresiones. Si no hay una mejora demostrable o una diferencia concluyente, registrar ese resultado sin convertirlo en una promesa de rendimiento.

**Cierre:** existe un informe reproducible en el registro de Git con resultados técnicos de navegador y compilación, condiciones, muestras, comparación antes/después y conclusión limitada a lo medido. Las pruebas técnicas completan este frente sin participación de personas. Cualquier nuevo umbral de aceptación de producto requiere la decisión del responsable conforme a las reglas vigentes.

### 8.3. Ejecución y reproducción

C-049 registra ambos frentes completados en el alcance técnico comprobado. Los consumidores usan las clases existentes; permanecen locales el espacio del icono de búsqueda, la cuadrícula de participantes, las casillas de perfiles, los marcos de editores y los mínimos de tablas dentro de sus regiones desplazables. Las fuentes públicas del kit y sus siete colores no cambian. La plantilla neutral incorpora el icono vacío embebido para evitar una solicitud de favicon sin activo definido.

Herramientas del producto (no se exportan como funcionalidad del consumidor):

```text
npm run measure:frontend --workspace frontend -- --root <compilacion-browser> --output <resultado.json> --label <version> --samples 12 --rows 120 --api-delay-ms 20 --playwright <modulo-playwright-instalado> --executable <chrome>
npm run check:ui-browser --workspace frontend -- --root <compilacion-browser> --output <directorio-evidencia> --playwright <modulo-playwright-instalado> --executable <chrome>
```

Se utiliza un runtime de Playwright ya instalado; las herramientas no instalan dependencias ni agregan telemetría. Preservar las dos compilaciones antes de sustituir una por otra. Cada ejecución abre un servidor en loopback y lo cierra junto con el navegador. El informe incluye condiciones, muestras, recursos y hashes. Los avisos de aborto de Chrome con HTTP 200 y cuerpo recibido en ResourceTiming se conservan separados de los errores, únicamente cuando la condición final de pantalla se ha comprobado; los demás fallos de red/HTTP/script detienen la comprobación.

Resultados y comandos de regresión: [C-049](../trazabilidad/correcciones.md#c-049--alcance-de-la-revisión-del-kit-y-plan-de-consolidación). Una nueva medición no convierte automáticamente diferencias pequeñas o distribuciones solapadas en una mejora general de velocidad.
