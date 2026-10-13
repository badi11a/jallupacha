# Kit digital institucional — Fundamentos de identidad UTA

**Estado:** aprobada para implementación en este cambio por instrucción explícita del responsable del producto. No modifica requisitos funcionales.

**Fuente normativa:** *Manual de Normas Gráficas, Universidad de Tarapacá (2017)*, suministrado por el responsable del producto. Este documento traslada la identidad UTA al kit de interfaces reutilizable; no sustituye el manual.

**Alcance:** fundamentos visuales comunes a los productos digitales de la organización, comenzando por Jallupacha. Los componentes permanecen en `frontend/src/app/shared/ui/` durante el piloto. Se excluyen la lógica de negocio y los permisos de Jallupacha.

## 1. Colores corporativos — valores exactos

Los colores **oficiales** se copian sin modificación. No se reemplazan por tonos similares ni se presentan variantes como corporativas.

| Tipo | Color | HEX | Fuente |
| --- | --- | --- | --- |
| Principal | Azul oscuro | `#22213F` | Manual, pág. 14 |
| Principal | Azul claro | `#678FCA` | Manual, pág. 14 |
| Principal | Amarillo | `#DEB01F` | Manual, pág. 14 |
| Secundario | Naranja | `#C9631F` | Manual, pág. 15 |
| Secundario | Ocre | `#CE9342` | Manual, pág. 15 |
| Secundario | Azul | `#303880` | Manual, pág. 15 |
| Secundario | Azul | `#446BA9` | Manual, pág. 15 |

### Tokens de identidad propuestos

Implementar estos alias sobre los tokens existentes del kit; son una **decisión técnica digital**, no nombres definidos por el manual:

```css
:root {
  --uta-primary-dark: #22213F;
  --uta-primary-blue: #678FCA;
  --uta-primary-yellow: #DEB01F;
  --uta-secondary-orange: #C9631F;
  --uta-secondary-ochre: #CE9342;
  --uta-secondary-indigo: #303880;
  --uta-secondary-blue: #446BA9;
}
```

Los tokens de interfaz `--ui-*` podrán mapearse a esta paleta en una implementación posterior. El uso de blanco, negro y grises como neutros de interfaz no convierte esos tonos en colores corporativos. No conservar colores alternativos alegando que son «casi iguales» a los oficiales.

## 2. Tipografía institucional

- **Century Gothic:** familia institucional definida para regular, italic, bold y bold italic (manual, pág. 18).
- **Aero Regular:** tipografía del lema «Universidad del Estado» con inclinación del 6 % (manual, pág. 18). No aplicarla por defecto a la interfaz.
- El manual no define una fuente alternativa web ni concede derechos de redistribución de fuentes. **No incluir archivos tipográficos en el repositorio** sin comprobar licencia y autorización. La selección de un fallback para equipos que no dispongan de Century Gothic queda como decisión técnica explícita del kit, no como identidad oficial.

## 3. Marca institucional

- Usar el **isologotipo oficial** (escudo y texto) en su composición autorizada, sin reconstruirlo en CSS ni sustituirlo por texto estilizado o íconos (manual, págs. 5–7 y 21–22).
- La variante horizontal está permitida cuando las dimensiones lo requieran, respetando las normas de marca (pág. 7).
- Conservar el área de protección de **3x** alrededor del isologotipo (págs. 11–12).
- Respetar los tamaños mínimos establecidos en el manual: **2 cm vertical y 1,5 cm horizontal** (pág. 13). En pantallas, evaluar legibilidad real y no interpretar esos valores físicos como píxeles.
- Sobre fondos claros, oscuros, de color o fotografías aplicar únicamente las alternativas autorizadas por el manual (págs. 19–20).
- No distorsionar, recolorear ni separar arbitrariamente el escudo y el texto; no modificar su tipografía (págs. 21–22).
- Obtener el activo gráfico institucional original autorizado; no extraer una versión de baja resolución de capturas del PDF para la aplicación.

## 4. Aplicación digital del kit

Estas son **reglas propuestas para software**, no prescripciones textuales del manual corporativo:

1. Mantener los componentes Angular reutilizables y los tokens semánticos existentes del kit como base técnica.
2. Aplicar los colores corporativos exactos en marca y elementos visuales institucionales. Definir usos funcionales de botones, enlaces, foco, alertas, superficies y estados mediante tokens semánticos; no asumir que cada color corporativo sirve para cualquier texto o fondo.
3. Cumplir **WCAG 2.2 AA** en interfaces, incluyendo contraste, teclado y estados perceptibles. Cuando una combinación corporativa no alcance contraste suficiente, cambiar la combinación de superficie/texto o la función asignada al color, **no falsificar el valor oficial de marca**.
4. Mantener en `shared/ui` solo fundamentos y componentes compartidos; la navegación, flujos y reglas de negocio propios de Jallupacha permanecen fuera del kit.
5. Evitar nuevas dependencias y no extraer una biblioteca independiente durante el piloto.

## 5. Implementación SDD y criterios de aceptación

**Secuencia:** aprobar este documento → ajustar los tokens y el uso de marca en el kit → actualizar pruebas afectadas → revisar visualmente Jallupacha.

- [ ] Los siete colores corporativos coinciden exactamente con los valores HEX del manual.
- [ ] No quedan tonos alternativos etiquetados como colores corporativos UTA.
- [ ] El uso del logo respeta composición, área libre y versiones aprobadas, con activo original autorizado.
- [ ] La tipografía institucional se configura sin incorporar fuentes de terceros sin licencia verificada.
- [ ] La interfaz mantiene contraste y navegación accesible; excepciones documentadas si las hubiera.
- [ ] Los componentes compartidos no incorporan reglas de negocio específicas de Jallupacha.
- [ ] El cambio no altera API, Oracle, autenticación ni requisitos funcionales.
- [ ] Los resultados de compilación, pruebas y revisión visual se registran sin declarar verificaciones no ejecutadas.

## 6. Referencias del repositorio

- `AGENTS.md`: instrucciones y principios SDD.
- `docs/especificacion.md`: especificación del producto y requisitos aprobados.
- `docs/arquitectura.md`: decisiones de arquitectura.
- `frontend/src/app/shared/ui/styles/tokens.css`: tokens UTA y semánticos implementados.
- `frontend/src/app/shared/ui/styles/base.css`: estilos compartidos.

**Precedencia:** en identidad institucional prevalece el Manual de Normas Gráficas UTA 2017; para comportamiento del producto prevalece la planilla de requisitos vigente. Este documento define exclusivamente la adaptación digital de identidad al kit.

## 7. Registro SDD de implementación

- **Clasificación:** adopción/corrección de diseño técnico del kit; no se amplía ni altera el alcance funcional del producto.
- **Comportamiento esperado:** los siete alias `--uta-*` conservan los HEX oficiales; los roles visuales compartidos emplean esos valores exactos solo cuando cumplen su función y contraste; Century Gothic se usa sin redistribuir fuentes; la marca real se muestra únicamente con un activo institucional autorizado; `shared/ui` sigue separado de la lógica de negocio.
- **Corrección aplicada:** mapeo de roles institucionales accesibles en `tokens.css`, selección tipográfica con fallback de sistema, eliminación del monograma no autorizado y soporte opcional para el activo original.
- **Límite pendiente:** no hay un activo gráfico oficial autorizado en el repositorio. Por tanto, no se muestra un logo; la composición, el área libre 3x, el tamaño mínimo físico y la legibilidad del activo en pantalla quedan pendientes de su entrega y revisión.
- **Verificación:** la ejecución del contraste, pruebas de componentes, revisión visual y revisión registrada quedan **pendientes**. No se ejecutaron builds ni pruebas en este cambio. No se modifica API, Oracle, autenticación ni comportamiento funcional.
- **Evidencia revisada:** requisitos vigentes en `docs/especificacion.md`, decisiones de interfaz en `docs/arquitectura.md` y esta especificación de identidad.
