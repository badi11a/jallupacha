# Catálogo de componentes — Sistema de diseño digital

**Estado:** inventario documental del kit existente; no autoriza nuevas funcionalidades ni cambios de comportamiento.

**Fuentes:** código actual de `frontend/src/app/shared/ui/` y fundamentos aprobados en `docs/design-system.md`.

## 1. Alcance y reglas

- Este catálogo describe la API pública disponible en `frontend/src/app/shared/ui/index.ts`.
- Consumir los componentes a través de ese punto de entrada y mantenerlos independientes de la lógica de negocio.
- Aplicar estilos mediante `styles/tokens.css` y `styles/base.css`, respetando los siete valores `--brand-*` aprobados y los roles semánticos `--ui-*`.
- No introducir marcas institucionales ajenas ni asumir que el kit representa a una institución externa.
- El objetivo de accesibilidad es WCAG 2.2 AA; la conformidad no está verificada por este inventario.

## 2. Componentes existentes

| API pública | Selector o uso | Propósito y contrato principal |
| --- | --- | --- |
| `UiAppShellComponent` | `<ui-app-shell>` | Estructura con encabezado, contenido, cuenta, aviso de entorno, pie y alojamiento de diálogos. Requiere `appName`; acepta `homeHref`, `brandLogoSrc` opcional para marca propia autorizada, datos de cuenta y evento `logout`. |
| `UiBadgeComponent` | `<ui-badge>` | Etiqueta de estado con texto visible; `tone`: `neutral`, `info`, `success`, `warning`, `danger`, `critical`. |
| `UiBreadcrumbsComponent` | `<ui-breadcrumbs>` | Ruta de navegación; requiere `items` con `label` y `link` opcional; el último ítem se marca como página actual. |
| `UiCharCounterComponent` | `<ui-char-counter>` | Contador cercano al límite; requiere `max`, admite `value`. El conteo elimina espacios de extremos y usa un criterio alineado con la validación actual del backend. |
| `UiDialogHostComponent` | `<ui-dialog-host>` | Presenta el diálogo activo. Ya está incluido en `UiAppShellComponent`; evitar duplicarlo. |
| `UiDialogService` | `confirm()`, `form()` | Confirmaciones y formularios modales con campos `text` o `number`; devuelve promesas. Un diálogo activo a la vez. |
| `UiMessageComponent` | `<ui-message>` | Mensajes `info`, `success` o `error`; los errores usan `role=alert`. |
| `UiPaginationComponent` | `<ui-pagination>` | Paginación anterior/siguiente; requiere `page`, `pageSize`, `total`; emite `pageChange`. |
| `UiPanelComponent` | `<ui-panel>` | Panel con encabezado `h2`; requiere `heading`; admite `eyebrow`, `headingId` y proyecciones `panelLead` / `panelActions`. |
| `UiSectionComponent` | `<ui-section>` | Subdivisión titulada `h3`; requiere `heading`. |

## 3. Servicios y funciones públicas

| API | Función |
| --- | --- |
| `provideUiNavigation(options)` | Configura el título de página, foco y desplazamiento al navegar; requiere `appName`. |
| `UiNavigationFocus` | Servicio de gestión del foco y restauración de desplazamiento. |
| `UiTitleStrategy` | Estrategia de título por ruta. |
| `countCharacters(value)` y `charCountState(length, max)` | Reglas del contador de caracteres. |
| `validateDialogFields(...)` | Validación utilizada por los formularios del servicio de diálogos. |

## 4. Patrones CSS compartidos (no son componentes Angular)

`styles/base.css` contiene patrones globales para botones, campos, tablas, mensajes y otros controles. No se deben documentar como componentes Angular independientes ni crear wrappers sin una necesidad aprobada.

## 5. Decisiones pendientes antes de ampliar el kit

1. **Formularios y tablas:** decidir si basta con documentar sus patrones CSS o si se necesita una API Angular reusable específica.
2. **Localización:** `UiCharCounterComponent` utiliza `es-CL` de forma fija; evaluar parametrización únicamente cuando exista otro producto que la requiera.
3. **Diálogos y paginación:** conservar la funcionalidad actual mientras no se aprueben requisitos adicionales.
4. **Estilos globales:** evaluar colisiones de clases al integrar otros productos; no refactorizar preventivamente sin evidencia.

## 6. Verificación

Inventario realizado mediante lectura estática del repositorio. No se ejecutaron compilación, pruebas, revisión visual ni validación de accesibilidad porque el entorno local no está disponible. Registrar esas verificaciones cuando exista un entorno apto.
