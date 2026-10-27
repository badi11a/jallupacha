# Sistema de diseño digital — Fundamentos visuales

**Estado:** aprobado como especificación de diseño para el piloto.

**Propósito:** definir una identidad visual propia, consistente y reutilizable para aplicaciones web. Jallupacha es el primer producto consumidor; el sistema de diseño no pertenece a una aplicación concreta.

**Alcance:** paleta, tipografía, identidad de producto, tokens, accesibilidad y reglas de aplicación. No modifica requisitos funcionales, arquitectura de backend ni permisos.

**Relación con la guía UX:** [STD-UX-001](marco_estandar_ux_institucional.md) define principios, reglas y verificaciones de experiencia. Este documento concreta los fundamentos visuales; [el catálogo](catalogo-componentes.md) describe componentes existentes y [la arquitectura v15](../producto/arquitectura_v15.md) las decisiones particulares de Jallupacha. La aprobación visual del piloto no implica adopción institucional de todos sus patrones ni conformidad comprobada de la aplicación.

## 1. Identidad y uso de marcas

- El sistema de diseño y sus aplicaciones **no deben utilizar nombres, siglas, escudos, logotipos, isologotipos ni otros signos distintivos de instituciones ajenas** sin autorización expresa.
- No se debe presentar la interfaz, sus componentes ni su documentación pública como producto oficial, afiliado o patrocinado por una institución ajena.
- Los productos pueden mostrar su **propio nombre y marca**, siempre que exista autorización para utilizarlos.
- **No hay ningún requisito de incorporar el logotipo de la institución utilizada como referencia cromática.** Se elimina cualquier instrucción previa de solicitarlo, integrarlo o comprobar sus proporciones.

## 2. Paleta de diseño

Estos siete colores son los valores de referencia aprobados para el kit. Sus códigos HEX deben mantenerse exactos como tokens de paleta; no son nombres ni marcas institucionales.

| Token | Color | HEX |
| --- | --- | --- |
| `--brand-ink` | Azul oscuro | `#22213F` |
| `--brand-blue` | Azul claro | `#678FCA` |
| `--brand-yellow` | Amarillo | `#DEB01F` |
| `--brand-orange` | Naranja | `#C9631F` |
| `--brand-ochre` | Ocre | `#CE9342` |
| `--brand-indigo` | Azul índigo | `#303880` |
| `--brand-steel-blue` | Azul medio | `#446BA9` |

```css
:root {
  --brand-ink: #22213F;
  --brand-blue: #678FCA;
  --brand-yellow: #DEB01F;
  --brand-orange: #C9631F;
  --brand-ochre: #CE9342;
  --brand-indigo: #303880;
  --brand-steel-blue: #446BA9;
}
```

- Los tokens funcionales existentes `--ui-*` deben apuntar a los valores adecuados de la paleta cuando corresponda.
- Se admiten neutros y colores funcionales adicionales para fondos, texto, bordes, errores, éxito y advertencias. **No se presentan como integrantes de la paleta de marca.**
- No se alteran los valores HEX de referencia para resolver problemas de contraste; se selecciona otra combinación o rol semántico.
- Los nombres `--uta-*` del código anterior deben migrar a estos nombres neutros y sus referencias deben actualizarse.

## 3. Tipografía

- Familia de interfaz preferida: **Century Gothic**, cuando esté disponible en el dispositivo.
- Usar una cadena de fuentes alternativas de sistema para mantener legibilidad y disponibilidad.
- No distribuir archivos de fuentes sin comprobar su licencia y autorización.
- No utilizar la tipografía decorativa de lemas de terceros como parte del sistema.

## 4. Aplicación al kit Angular

1. Mantener tokens y componentes reutilizables en `frontend/src/app/shared/ui/`.
2. Aplicar la paleta mediante variables semánticas, evitando códigos HEX repetidos en componentes.
3. Conservar el nombre propio de cada producto en su interfaz, separado de cualquier marca institucional ajena.
4. Mantener navegación, formularios, mensajes, estados y controles con accesibilidad objetivo **WCAG 2.2 AA**, incluidos teclado, foco visible y contraste.
5. Separar la presentación compartida de las reglas y flujos de negocio de Jallupacha.
6. Seguir la arquitectura existente y evitar nuevas dependencias sin necesidad comprobada. C-048 autoriza la base y plantilla local versionadas conforme a [STD-FE-001](base-frontend.md); la extracción/publicación de una biblioteca independiente requiere su decisión y verificación de consumidores, sin presumir adopción institucional.

### Activación y aislamiento de estilos (C-046)

El kit se activa con una clase `ui-root` en el contenedor consumidor. `tokens.css` define sus variables en ese contenedor; `base.css` limita todos sus selectores, incluidas reglas adaptables, foco y movimiento reducido, a ese ámbito. Los controles ajenos situados fuera no reciben tokens, restablecimientos ni estilos del kit. La aplicación anfitriona conserva la responsabilidad sobre su CSS; este aislamiento no es Shadow DOM ni bloquea reglas externas que entren al contenedor.

El restablecimiento de página es opcional y separado: `page.css` solo aplica margen y ancho mínimo al `body.ui-page`. Jallupacha activa `ui-root` en `app-root` y `ui-page` en su `body`. Un consumidor embebido carga tokens y base, envuelve solo su interfaz en `ui-root` y omite el restablecimiento. No colocar `ui-root` en `html` o `body` si hay contenido ajeno que deba quedar fuera. Un host de diálogos también debe quedar dentro del ámbito.

Este cambio exige adaptar consumidores del CSS global anterior; las APIs y rutas de componentes se conservan. La compatibilidad se comprueba con la muestra de convivencia y pruebas descritas en el catálogo, sin presumir adopción institucional.

### Navegación local: indicador de ubicación

Este es el acabado de la navegación local utilizada por Jallupacha, compartido por sus componentes consumidores. Su distribución horizontal no fija se define en la arquitectura de la aplicación; no se impone esa distribución a todos los productos de la organización.

La sección activa utiliza texto en `--ui-color-primary` y un subrayado recto de 2 px bajo la etiqueta, sin fondo coloreado, borde de contenedor ni silueta de pestaña. El peso tipográfico se mantiene entre estados para evitar movimientos del menú. El foco de teclado conserva su contorno visible independiente del subrayado de ubicación.

Se utiliza `aria-current="page"` únicamente si el destino coincide con la página mostrada; en rutas subordinadas, la sección padre conserva el subrayado y utiliza `aria-current="location"`.

## 5. Criterios de aceptación SDD

- [ ] Los siete tokens `--brand-*` contienen exactamente los HEX indicados.
- [ ] No quedan tokens `--uta-*` ni referencias a una identidad institucional ajena en componentes, estilos o textos visibles.
- [ ] El kit no requiere ni solicita activos gráficos de esa institución.
- [ ] Cada aplicación utiliza únicamente sus propias denominaciones y marcas autorizadas.
- [ ] Los componentes reutilizables conservan su funcionamiento y separación de responsabilidades.
- [ ] Se mantienen los requisitos de accesibilidad, sin afirmar verificaciones no realizadas.
- [ ] No se alteran API, base de datos, autenticación ni requisitos funcionales.

**Verificación:** los resultados se registran por versión y cambio en [correcciones](../trazabilidad/correcciones.md), con alcance y pendientes. La revisión documental de la guía no acredita compilación, contraste efectivo, recorrido, revisión visual ni conformidad WCAG del frontend. Aplicar los estados y criterios de evidencia de la sección 6 de STD-UX-001; no declarar resultados que no se hayan obtenido.

## 6. Referencias internas y trazabilidad

- [AGENTS.md](../../AGENTS.md): reglas de trabajo y restricciones de propiedad intelectual.
- [Guía UX y SDD](marco_estandar_ux_institucional.md): principios, reglas, arquetipos y evidencia de revisión.
- [Especificación v15](../producto/especificacion_v15.md): requisitos vigentes del producto.
- [Arquitectura v15](../producto/arquitectura_v15.md): decisiones técnicas y de navegación de la aplicación.
- [Catálogo de componentes](catalogo-componentes.md): contratos del kit existente.
- [Patrón de formularios](patrones-formularios.md): anatomía, estados, errores, foco y verificación por consumidor.
- [Tokens](../../frontend/src/app/shared/ui/styles/tokens.css) y [estilos compartidos](../../frontend/src/app/shared/ui/styles/base.css).

**Procedencia de la paleta (registro interno, no identidad del producto):** valores cromáticos tomados como referencia del *Manual de Normas Gráficas de la Universidad de Tarapacá (2017)*, páginas 14 y 15. Esta referencia documental no implica afiliación ni autorización para usar marcas o símbolos de esa institución.

## 7. Registro de cambio

Esta especificación reemplaza la anterior adaptación de identidad institucional. Se conserva la paleta de referencia, se neutraliza la nomenclatura de tokens y se elimina la obligación de integrar marcas ajenas. La trazabilidad vigente utiliza AGENTS.md y la arquitectura v15. Ninguna prueba ni compilación se declara ejecutada por este documento.

2026-10-22, C-031: alineación documental con STD-UX-001 v1.6, separación de principios/reglas/patrones/decisiones de aplicación y precisión de los estados de verificación. Los siete HEX, la tipografía y el acabado aprobado del indicador se conservan; no se modifican estilos ni componentes.

2026-10-22, C-039: contratos completos del kit, patrón común de formularios, referencia de estados y procedimiento de consumo/extensión en el catálogo. Se conserva identidad, paleta y tipografía. Los resultados de comprobación y límites de evaluación se registran en C-039; la referencia visual no certifica las pantallas consumidoras ni adopta institucionalmente el patrón.

2026-10-22, C-040: retirada autorizada de la referencia HTML temporal y limpieza de enlaces. Se conservan fundamentos, contratos, ejemplos del patrón de formularios y pruebas del kit. La evidencia C-039 sigue siendo un registro histórico de comprobaciones, sin mantener sus artefactos temporales en el proyecto.
