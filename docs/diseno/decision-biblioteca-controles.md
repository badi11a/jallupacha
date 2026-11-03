# DEC-FE-001 — Biblioteca de controles para la base de frontend

**Estado:** aprobada por el responsable el 2026-11-03 y registrada en C-060; no constituye adopción institucional para otros sistemas ni modifica requisitos. **Fecha:** 2026-11-03. **Relación:** fundamenta la decisión de diseño C-056 (Angular Material/CDK) y complementa [la comparación de bibliotecas](comparacion-bibliotecas-ui.md). **Fuentes:** [STD-FE-001](base-frontend.md), [STD-UX-001](marco_estandar_ux_institucional.md), [fundamentos visuales](design-system.md), [catálogo](catalogo-componentes.md) y [correcciones](../trazabilidad/correcciones.md) (C-056, C-059).

Evidencia: **[M]** medido en el repositorio, **[D]** documentado en una fuente primaria o en un registro del proyecto, **[S]** supuesto o juicio pendiente de comprobación.

## 1. Pregunta

¿Qué familia de controles debe usar la base de frontend para los sistemas web de la organización, de modo que la decisión sea defendible ante criterios de seguridad, accesibilidad, mantenimiento, identidad y costo?

## 2. Contexto

- **Uso principal:** intranet y escritorio. La base no debe impedir frentes web públicos o móviles, aunque no forman parte del alcance actual.
- **Seguridad desde el diseño:** número acotado de proveedores para reducir la exposición a ataques de cadena de suministro.
- **Organización pública**, con equipos de desarrollo distintos, con y sin asistencia de IA.
- **Capacidades habituales de los sistemas** **[S]**: formularios, flujos de estados con historial, tablas con filtros, orden y paginación del servidor, fechas y rangos, búsqueda o autocompletado remoto, formularios por pasos, subida de archivos (imágenes y escaneos, sin archivos de gran tamaño) y paneles con gráficos.

## 3. Criterios

**Excluyentes:** E1, no agregar proveedores de interfaz además del framework, salvo excepción aprobada; E2, licencia que permita distribuir la base a equipos internos y a proveedores sin claves ni puestos; E3, versión publicada compatible con la de Angular de la base.

**De evaluación** (prioridades aprobadas por el responsable el 2026-11-03):

| ID | Criterio | Prioridad |
| --- | --- | --- |
| C1 | Cobertura de las capacidades habituales sin código propio | Alta |
| C2 | Accesibilidad de los controles difíciles (fechas, autocompletado, diálogos) | Alta |
| C3 | Código propio que la organización debe mantener | Alta |
| C4 | Coherencia entre equipos distintos | Alta |
| C5 | Longevidad y soporte | Media |
| C6 | Identidad visual propia | Media |
| C7 | Tamaño del paquete | Baja |
| C8 | Reversibilidad | Baja |

## 4. Alternativas

**Descartadas:** PrimeNG por E2 (la línea vigente requiere clave y condiciones comerciales **[D]**); Taiga UI, Ionic y otras bibliotecas por E1.

**Evaluadas**, ambas del repositorio oficial `angular/components` y por tanto conformes con E1 a E3:

- **A. Angular Material + CDK**, la situación vigente.
- **B. CDK solo + kit propio**, con los controles construidos en `shared/ui`.

| Criterio | A. Material + CDK | B. CDK solo + kit |
| --- | --- | --- |
| C1 | **Favorable:** fechas con rango, autocompletado, tabla con orden y paginación, pasos, pestañas y menús **[D]**. No cubre archivos ni gráficos. | **Desfavorable:** esos controles habría que construirlos. |
| C2 | **Favorable con verificación:** el proveedor aporta teclado y semántica **[D]**; cada consumidor debe comprobarlos (FE-07). | **Desfavorable:** fechas y autocompletado accesibles son difíciles de construir y sostener **[S]**. |
| C3 | **Favorable:** solo los vacíos (archivos y gráficos). | **Desfavorable:** todos los controles complejos. |
| C4 | **Favorable con controles:** biblioteca ampliamente conocida por personas y asistentes de IA **[S]**; exige reglas que impidan salirse de los tokens. | **Neutral:** contrato propio que hay que documentar control por control. |
| C5 | **Favorable:** mismo ciclo que el framework **[D]**. | **Favorable** en el CDK; el resto depende de la organización. |
| C6 | **Neutral:** tema mediante APIs públicas **[D]**, con lenguaje de Material 3 y roles heredados por mapear **[M]**. | **Favorable:** la apariencia depende solo de los tokens. |
| C7 | **Desfavorable moderado:** de 406,94 a 565,66 kB iniciales; supera el aviso de 450 kB, no el error de 600 kB **[M]**. | Probablemente menor, sin medir **[S]**. |
| C8 | **Neutral:** salir afecta 17 archivos y la directiva puente **[M]**. | **Favorable** mientras la base sea pequeña. |

**Cadena de suministro** (`npm ls`, 2026-11-03) **[M]**: 15 paquetes en producción, de los cuales Material aporta `@angular/material` y `@angular/cdk` (este depende de `parse5`, y `parse5` de `entities`); 375 en desarrollo. La superficie principal está en las herramientas de desarrollo, no en la biblioteca de controles. `@standard-schema/spec` proviene de `@angular/forms`, y `zod`, de `@angular/cli` (desarrollo); ambos llegan como dependencias del mismo proveedor.

## 5. Decisión

> Se ratifica Angular Material/CDK como familia de controles de la base: mantiene un único proveedor de interfaz, el del framework; cubre los controles complejos habituales; evita construir y mantener en la organización controles cuya accesibilidad es difícil de asegurar, y tiene un costo de dependencias marginal. Las capacidades no cubiertas se resuelven con componentes propios del kit, salvo una excepción aprobada.

**Riesgos y mitigación:**

- Divergencia entre equipos: tema único exportado por la base, ejemplos en el catálogo y reglas en `check:source`.
- Crecimiento del paquete: carga diferida por funcionalidad y medición en cada versión de la base.
- Proveedores añadidos sin control: proceso de la sección 6.
- Accesibilidad no comprobada en un recorrido real: verificación por consumidor antes de producción.

## 6. Consecuencias

- **Gráficos:** SVG propios simples en el kit, cada uno con una tabla equivalente accesible que presenta los mismos datos. Un gráfico que no pueda resolverse así requiere una excepción a E1 aprobada y registrada.
- **Componentes propios:** subida de archivos (input nativo, teclado, arrastrar y soltar como alternativa, lista, errores asociados, progreso y protección de cambios no guardados) y línea de tiempo semántica. Cada uno con su contrato y verificación según el catálogo §7.
- **Gobierno de dependencias:** ninguna dependencia nueva sin una entrada aprobada en el registro, con bloqueo en la CI; `npm ci`, versiones exactas y lockfile; evaluar `ignore-scripts`, `npm audit signatures` y un espejo interno del registro de paquetes. Este control cubre también los paquetes inexistentes o suplantados que pueda sugerir un asistente de IA. Toda excepción a E1 registra la necesidad, el proveedor, la licencia y su seguimiento.
- **Ajustes del kit (C-060):** los roles del tema que heredaban la paleta azure se mapean a roles `--ui-color-*`; se retira el CSS de botones sin `matButton`, y las clases de rol se conservan como marcadores sobre `matButton`, exigidos por `check:source`.
- **Fuera de esta decisión:** almacenamiento, validación y descarga segura de archivos, autenticación de personas externas y obligaciones normativas. Se especifican con cada sistema.

## 7. Resolución (2026-11-03)

1. Prioridades de la sección 3: aprobadas sin cambios.
2. Gráficos: SVG propios simples con tabla equivalente accesible; sin excepción a E1.
3. CSS anterior de botones: retirado; las clases de rol se conservan sobre `matButton`.
4. Registrada en C-060 y enlazada desde STD-FE-001 §2 y design-system §4.

**Límites:** no se prototipó ni se midió la alternativa B; los controles de Material aún no utilizados no se probaron con zoom real ni con lector de pantalla. **Revisión:** redactado por IA, sin revisión técnica independiente; decisiones de la sección 7 tomadas por el responsable.
