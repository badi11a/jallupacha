# Sistema de diseño digital — Fundamentos visuales

**Estado:** aprobado como especificación de diseño para el piloto.

**Propósito:** definir una identidad visual propia, consistente y reutilizable para aplicaciones web. Jallupacha es el primer producto consumidor; el sistema de diseño no pertenece a una aplicación concreta.

**Alcance:** paleta, tipografía, identidad de producto, tokens, accesibilidad y reglas de aplicación. No modifica requisitos funcionales, arquitectura de backend ni permisos.

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
6. Seguir la arquitectura existente y evitar nuevas dependencias o extraer una librería independiente durante el piloto.

## 5. Criterios de aceptación SDD

- [ ] Los siete tokens `--brand-*` contienen exactamente los HEX indicados.
- [ ] No quedan tokens `--uta-*` ni referencias a una identidad institucional ajena en componentes, estilos o textos visibles.
- [ ] El kit no requiere ni solicita activos gráficos de esa institución.
- [ ] Cada aplicación utiliza únicamente sus propias denominaciones y marcas autorizadas.
- [ ] Los componentes reutilizables conservan su funcionamiento y separación de responsabilidades.
- [ ] Se mantienen los requisitos de accesibilidad, sin afirmar verificaciones no realizadas.
- [ ] No se alteran API, base de datos, autenticación ni requisitos funcionales.

**Verificación:** compilación, pruebas y revisión visual permanecen pendientes hasta contar con un entorno apto. No declarar resultados que no se hayan obtenido.

## 6. Referencias internas y trazabilidad

- `AGENTS.md`: reglas de trabajo y restricciones de propiedad intelectual.
- `docs/especificacion.md`: requisitos del producto.
- `docs/arquitectura.md`: decisiones técnicas.
- `frontend/src/app/shared/ui/styles/tokens.css`: implementación de tokens.
- `frontend/src/app/shared/ui/styles/base.css`: estilos compartidos.

**Procedencia de la paleta (registro interno, no identidad del producto):** valores cromáticos tomados como referencia del *Manual de Normas Gráficas de la Universidad de Tarapacá (2017)*, páginas 14 y 15. Esta referencia documental no implica afiliación ni autorización para usar marcas o símbolos de esa institución.

## 7. Registro de cambio

Esta especificación reemplaza la anterior adaptación de identidad institucional. Se conserva la paleta de referencia, se neutraliza la nomenclatura de tokens y se elimina la obligación de integrar marcas ajenas. Deben alinearse `AGENTS.md`, `docs/arquitectura.md` y las referencias del código al aplicar la migración. Ninguna prueba ni compilación se declara ejecutada por este documento.
