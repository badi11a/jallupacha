# Catálogo de componentes — Sistema de diseño digital

**Revisión:** C-046, 2026-10-23. **Estado:** contratos del kit del piloto; adopción institucional pendiente.

La API se coteja con [el punto de entrada público](../../frontend/src/app/shared/ui/index.ts). Disponible no significa validado con usuarios. [STD-UX-001](marco_estandar_ux_institucional.md) establece reglas y evaluación; [fundamentos](design-system.md), identidad y tokens. Rutas, permisos, contenido y reglas de negocio pertenecen a cada producto.

## 1. Consumo y compatibilidad

1. Importar componentes, tipos y auxiliares desde `shared/ui/index.ts`; no acceder a miembros protegidos ni a la estructura interna de componentes.
2. Cargar `styles/tokens.css` y después `styles/base.css`, una sola vez en la entrada visual; activar ambos con `class="ui-root"` en el contenedor consumidor. Para una aplicación de página completa, cargar opcionalmente `styles/page.css` y añadir `ui-page` a `body`. El kit no debe aplicar estilos fuera de `ui-root`; el CSS del anfitrión puede entrar y debe comprobarse. Mantener el host de diálogos dentro del ámbito. Migración C-046: los consumidores anteriores sin `ui-root` deben añadirlo; no activar toda la página en una integración embebida.
3. Usar tokens semánticos `--ui-*` y conservar los siete HEX `--brand-*`. No copiar CSS de componentes ni redefinir sus selectores internos desde el consumidor.
4. Componer mediante contenido proyectado, opciones públicas y clases compartidas antes de extender. El producto decide qué se muestra y qué acción ejecuta.
5. Extensiones aditivas: necesidad concreta, contrato, estados y verificación. Renombrar/retirar API: identificar consumidores, adaptación y registro en el mismo cambio de Git.
6. Una variante se justifica por tarea y contexto, documentando diferencias y accesibilidad; un selector más específico o copia del componente no es una variante mantenible.
7. No extraer paquetes, instalar dependencias ni crear envoltorios sin necesidad demostrada. Formularios y tablas se componen por ahora con HTML nativo y patrones compartidos.

Ejemplo desde un consumidor situado en `app/`:

~~~ts
import { UiPanelComponent, UiMessageComponent, focusFirstInvalid } from './shared/ui';
~~~

## 2. Componentes: entradas, estados y límites

**Obligatorio** indica entrada requerida por la API; no establece reglas de negocio.

| API / selector | Contrato público | Uso y responsabilidad del consumidor |
| --- | --- | --- |
| `UiBadgeComponent` / `ui-badge` | `tone: UiBadgeTone = 'neutral'`; contenido proyectado. Tonos: `neutral`, `info`, `success`, `warning`, `danger`, `critical`. | Estado/categoría con texto, nunca solo color. No es botón ni región viva. El producto asigna significado y tono. |
| `UiBreadcrumbsComponent` / `ui-breadcrumbs` | **`items: UiBreadcrumb[]`**; `label = 'Ubicación'`. Ítem: `label: string`, `link?: string \| (string \| number)[]`, `queryParams?: Params`. | Jerarquía real. Último ítem: texto con `aria-current=page` aunque tenga enlace. Los anteriores enlazan si tienen `link`. El consumidor valida destinos/parámetros; no sustituye retorno contextual. |
| `UiCharCounterComponent` / `ui-char-counter` | **`max: number`**; `value: string \| null = null`; `lengthMode: UiTextLengthMode = 'utf16'`. | Máximo positivo. Oculto lejos del límite; visible cuando queda 10 % o menos y al excederlo. No es región viva. El consumidor asocia ayuda/contador y anuncia umbrales si corresponde, sin anunciar cada pulsación. Formato actual: `es-CL`. |
| `UiMessageComponent` / `ui-message` | `kind: UiMessageKind = 'info'`: `info`, `success`, `error`; contenido proyectado. | `error` usa `role=alert`; los otros, `role=status`. Mensaje comprensible y recuperación a cargo del producto. Evitar anuncios duplicados. |
| `UiPanelComponent` / `ui-panel` | **`heading: string`**; `eyebrow = ''`; `headingId` generado por defecto. Proyecciones `[panelLead]`, `[panelActions]` y contenido. | Región nombrada por su `h2`. El consumidor garantiza jerarquía de títulos e ID único si lo proporciona. No admite cambiar el nivel del título. |
| `UiSectionComponent` / `ui-section` | **`heading: string`**; contenido proyectado. | Grupo nombrado por `h3` con ID generado. Usar bajo un título apropiado; no convierte un grupo en pantalla o destino. |
| `UiPaginationComponent` / `ui-pagination` | **`page`, `pageSize`, `total`: `number`**; `itemLabel = 'elementos'`, `disabled = false`; salida `pageChange: number`. | Página desde 1, tamaño positivo, total no negativo. Deshabilita extremos o ambos controles si `disabled`. No consulta datos ni corrige entradas inválidas. El consumidor gestiona petición/errores y total de la consulta. No usar sin paginación real. |
| `UiModuleNavComponent` / `ui-module-nav` | **`appName: string`, `items: UiModuleNavItem[]`**; `appLink = '/mapa'`, `navLabel = 'Navegación del módulo'`; proyección `[sessionControls]`. Ítem: `label`, `link`, `matchPrefix?`, todos `string`. | Barra horizontal no fija del piloto. Exacta: `aria-current=page`; sección padre: `location`; inactiva: ausente. Coincide por segmento ignorando consulta/fragmento. Enlaces/prefijos internos sin consulta y sin solapamientos. Otro producto proporciona su `appLink`. Permisos y sesión siguen en la aplicación. |
| `UiDialogHostComponent` / `ui-dialog-host` | Sin entradas; consume `UiDialogService`. | Un host por aplicación, fuera de contenido vuelto inerte. Modal nativo: Escape cancela y cierre devuelve foco al control de apertura si sigue conectado. Confirmación enfoca Cancelar; formulario, primer campo. El fallback sin `showModal` no acredita modalidad accesible de producción. |

## 3. Diálogos, formularios y texto

| API | Contrato |
| --- | --- |
| `confirm(options: UiConfirmOptions): Promise<boolean>` | `title` y `message` obligatorios; `confirmLabel = 'Confirmar'`, `cancelLabel = 'Cancelar'`, `tone: 'default' \| 'danger' = 'default'`. Confirmar devuelve `true`; cancelar/Escape/reemplazar, `false`. El producto elige verbos y tono según la consecuencia. |
| `form(options: UiFormDialogOptions): Promise<UiDialogValues \| null>` | `title` y `fields` obligatorios; `description?`, `submitLabel = 'Guardar'`, `cancelLabel = 'Cancelar'`. Valores tras validar; cancelar/Escape/reemplazar devuelve `null`. No ejecuta escrituras remotas. |
| `UiDialogField` | `key` y `label` obligatorios; `type?: 'text' \| 'number'` (texto por defecto), `value?: string \| number \| null`, `required?`, `maxLength?`, `lengthMode?: UiTextLengthMode` (UTF-16 por defecto), `min?`, `max?`, `hint?`. Claves únicas y estables, compatibles con ID HTML y sin caracteres especiales de selector. Límites numéricos para enteros. |
| `UiDialogValues` | `Record<string, string \| number \| null>`: textos recortados y vacíos convertidos a `null`. No asumir cadena vacía. |
| `UiDialogService.active` y `settle(...)` | Expuestos para el host. Consumidores ordinarios usan `confirm`/`form`. Abrir otro diálogo cancela el anterior; no apilarlos ni resolver el diálogo de otro consumidor. |
| `focusFirstInvalid(root: HTMLElement): void` | Tras renderizar, enfoca el primer control inválido disponible dentro del ámbito. Omite deshabilitados, ocultos, inertes y nodos sin capacidad de foco; no actúa sobre ámbitos desconectados. No valida ni crea errores. Pasar el formulario concreto si hay varios en pantalla. |
| `validateDialogFields(fields, raw)` | Devuelve `{ values, errors }` por clave: obligatoriedad, longitud y entero/rango de `UiDialogField`. No sustituye reglas de negocio ni validación del servidor. |
| `UiTextLengthMode` | `'utf16' \| 'validator'`; seleccionar según el contrato del servidor. No son cuentas de grafemas. |
| `countCharacters(value, lengthMode = 'utf16')` | Recorta extremos y aplica el criterio seleccionado, sin normalizar Unicode. `null`/`undefined` cuentan cero. |
| `nativeMaxLength(field)` | Devuelve `maxLength` para texto en modo UTF-16, o `null` para números y modo validator. El atributo HTML limita el valor bruto. |
| `charCountState(length, max)` | `ok`, `near` u `over`; `near` cuando queda como máximo `ceil(max * .1)`; `over` si excede `max`. |

El formulario modal conserva errores de otros campos al corregir uno, asocia ayuda/error y enfoca el primero inválido. Resuelve antes de la petición remota: retención y reintento ante un fallo HTTP corresponden al consumidor.

**Longitud de texto (C-046):** contador y validación comparten `countCharacters(value, lengthMode = 'utf16')`; `UiCharCounterComponent.lengthMode` y `UiDialogField.lengthMode` usan ese mismo valor predeterminado. Ambos recortan extremos para medir el valor enviado. `utf16` cuenta unidades UTF-16; `validator` conserva el cálculo de la versión instalada de validator/class-validator (pares sustitutos y secuencias de presentación descontados), sin contar grafemas ni normalizar tildes. `nativeMaxLength(field)` aplica `maxlength` solo al modo UTF-16; para `validator` se valida al enviar y se conservan errores y foco. El atributo nativo mide el texto bruto, incluidos espacios exteriores: es una restricción de entrada conservadora, no una medida del valor recortado. No cambiar límites ni criterios del servidor desde el kit.

**Migración del contador:** su valor predeterminado anterior usaba el cálculo `validator`; los consumidores que necesiten conservarlo deben indicar `lengthMode="validator"` o pasar ese segundo argumento a la función. La aplicación vigente no consume el contador ni formularios de `UiDialogService.form`; los formularios de procesos/riesgos/catálogos del flujo vigente usan UTF-16 en `mvp-v14.validation.ts`. Los DTO de `process`/`structure` que usan `MaxLength` requieren el modo `validator` si se consumen en otro formulario. No se modifican esos contratos ni la persistencia.

## 4. Títulos, foco y retorno

| API | Contrato |
| --- | --- |
| `provideUiNavigation(options)` | Requiere `provideRouter`. `appName` obligatorio; `headingSelectors?: string[]`. Por defecto: `router-outlet + * h1`, `router-outlet + * h2`, `main h1`, `main h2`. Arranca foco y título una vez. |
| `UiTitleStrategy` | `title` de ruta produce «Página · Aplicación»; sin título usa el nombre de aplicación. El producto define títulos. |
| `UiNavigationFocus.focusContent()` | En el siguiente render enfoca el primer encabezado disponible; puede añadir `tabindex=-1`. |
| `UiNavigationFocus.restoreOnNextNavigation(url)` | Solicita restaurar posición recordada en memoria para la siguiente navegación a esa URL exacta. Sin posición, inicia arriba. El consumidor valida el destino; el servicio no autoriza rutas. |
| `UiNavigationFocus.start()` | Arranque idempotente llamado por el proveedor; no repetir por pantalla. |

Cambio de ruta: foco al título y posición superior. Atrás/Adelante: posición de la entrada. Carga inicial/cambios solo de consulta: no mueve foco. Reintentos de encabezado/posición: aproximadamente un segundo; una carga más lenta puede requerir `focusContent` al finalizar. Posiciones no sobreviven recargar la aplicación. Filtros, página y validación del origen pertenecen al producto.

## 5. Patrones CSS compartidos

| Patrón | Composición y límites |
| --- | --- |
| Acciones | `.primary-button` principal contextual; `.quiet-button` / `.text-button` alternativas; `.danger-button` consecuencias destructivas. `button` para acciones, `a` para destinos. Deshabilitar con `disabled` nativo; una clase sobre un enlace no bloquea navegación. |
| Campos | `.field`, `.field-error`, `.check-label` y controles nativos. Bordes de control: `--ui-color-border-strong`; inválido: `--ui-color-error-text`; separadores decorativos: `--ui-color-border`. Ver [formularios](patrones-formularios.md). |
| Formularios | `.ui-form`, `.ui-form-fields`, `.ui-form-grid`, `.ui-form-actions`: espaciado por tokens, columnas elásticas y acciones que se envuelven. Sin estado, HTTP ni reglas de negocio. |
| Tablas | `.table-scroll` y tabla nativa con `caption`/`scope`. Contenedor desplazable con nombre, `role=region` y `tabindex=0`. `.table-cards` requiere `data-label` y revisar lectura lineal; no aplicar automáticamente a todas las tablas. |
| Agrupación | `.ui-card-grid`, `.ui-info-card` y `.ui-summary` con contenido genérico; no trasladar datos ni estructura de dominio al kit. |
| Foco y movimiento | Contorno independiente del estado activo; respetar `prefers-reduced-motion`. No eliminar el foco de controles desde estilos particulares. |

Los ejemplos vigentes están en el [patrón de formularios](patrones-formularios.md). La referencia HTML temporal de controles se retiró mediante C-040; su inspección C-039 conserva el alcance histórico registrado y no certifica a los consumidores.

## 6. Evaluación de patrones

Estado común: **piloto en evaluación**, conforme a STD-UX-001 `5.3. Ninguno queda adoptado institucionalmente por este registro.

| Patrón y contexto | Evidencia identificada | Límites y promoción |
| --- | --- | --- |
| Fundamentos y acciones CSS | Combinaciones de tokens en `check:contrast`; inspección C-039, con referencia temporal retirada en C-040. | Revisar colores efectivos en cada consumidor y uso con personas representativas antes de promover. |
| Formulario modal corto | `shared/ui/ui.spec.ts`: cancelación, foco, validación y valores; C-039 añade persistencia de errores no corregidos. | No cubre escrituras remotas; evaluación asistiva y de uso pendientes. Evitar captura extensa dentro del modal. |
| Formularios completos/inline | [Contrato de formularios](patrones-formularios.md), ejemplos y pruebas del auxiliar. | Cada consumidor demuestra carga, validación, petición, fallo y descarte; el kit no acredita esos recorridos por existir. |
| Mensajes e insignias | Regresiones de roles y contenido del kit. | Semántica de tono/texto y frecuencia de anuncios se revisan en la tarea real. |
| Navegación y migas | Regresiones de títulos/historial y consultas de las migas. | Distribución horizontal del piloto no se universaliza. Retorno explícito requiere comprobación del consumidor. |
| Tablas y paginación | Regresiones de extremos/eventos y estructura CSS documentada. | Lectura asistiva, tablas complejas y totales del consumidor pendientes. |

Los resultados ejecutados y su alcance exacto están en [C-039](../trazabilidad/historico/correcciones_legacy.md#c-039--contratos-y-patrones-del-design-system). Los antecedentes conservan sus límites; no se trasladan como aprobación de nuevos estados.

## 7. Extensión y adopción

Registrar en el mismo cambio de Git, antes de agregar una variante o componente:

1. Tarea, usuarios, regla UX y motivo por el que no basta la composición existente.
2. Consumidores, contrato, estados, contenido largo/ausente y teclado.
3. Tokens y efectos sobre contraste, foco y reajuste; evitar valores visuales aislados.
4. Comprobación significativa más pequeña, evidencia y límites: cotejo de API/enlaces para documentos; regresión apropiada para comportamiento.
5. Revisión y estado del patrón, responsable de mantenimiento y adaptación de consumidores si cambia el contrato.

Una variante útil en una pantalla sigue siendo local hasta demostrar necesidad compartida. «Validado en un contexto» requiere uso con personas representativas y comprobaciones de accesibilidad además de pruebas técnicas. «Adoptado institucionalmente» requiere decisión de la instancia competente, alcance y soporte; una revisión IA no la concede.

**Pendientes transversales:** evaluación asistiva, política institucional de soporte/compatibilidad entre productos y validación con un segundo producto real. C-046 añade un consumidor de prueba y regresiones de aislamiento, sin acreditar un segundo producto. Decisiones y excepciones permanecen en el registro del cambio; no se crea seguimiento paralelo.

### Comprobación de compatibilidad C-046

La muestra `frontend/test/fixtures/ui-compatibility.html` convive con controles del anfitrión fuera de `ui-root`, una interfaz genérica dentro y otra instancia con roles visuales propios. Usa los estilos reales, sin API, sesión ni rutas del producto. `npm run check:ui-compatibility --workspace frontend` comprueba aislamiento y activación sobre esa muestra. Es un consumidor de prueba, no una segunda aplicación validada con personas.

Antes de adaptar otro producto: comprobar controles externos antes/después de cargar el kit, variables locales, foco y teclado, textos largos, errores, tablas, ancho de 320 píxeles y ampliación real al 200 %. Los resultados de DOM automatizado no acreditan esas comprobaciones de navegador. Identificar consumidores y adaptar `ui-root`, restablecimiento y criterio de longitud en el mismo cambio cuando cambie este contrato. Se mantiene el estado de piloto; soporte institucional y tecnologías de asistencia siguen pendientes.
