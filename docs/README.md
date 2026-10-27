# Documentación del Proyecto — Gestión de Procesos Institucionales (Jallupacha)

Este directorio organiza la documentación oficial, técnica y metodológica del sistema bajo una estructura por dominios de responsabilidad:

## 1. Producto y Negocio (`docs/producto/`)
Definición de requisitos institucionales, reglas funcionales, ciclo de vida de procesos y arquitectura técnica de la versión 15 (v15):
- [`especificacion_v15.md`](producto/especificacion_v15.md): Requisitos funcionales, modelo de perfiles, permisos y ciclo de vida de procesos institucionales.
- [`arquitectura_v15.md`](producto/arquitectura_v15.md): Arquitectura de software (NestJS, TypeORM, Oracle Database 19c, Angular 19+), seguridad, endpoints y consideraciones de infraestructura.

## 2. Sistema de Diseño e Interfaz (`docs/diseno/`)

- [`base-frontend.md`](diseno/base-frontend.md): STD-FE-001, núcleo configurable, arquitectura por funcionalidades, plantilla versionada y criterios de seguridad/eficiencia integrados en SDD.
Fundamentos visuales, kit compartido de interfaz, patrones de experiencia de usuario y contratos de componentes:
- [`marco_estandar_ux_institucional.md`](diseno/marco_estandar_ux_institucional.md): Guía STD-UX-001 de principios, reglas de experiencia, arquetipos de pantalla y criterios de verificación.
- [`design-system.md`](diseno/design-system.md): Identidad visual propia, tokens, paleta aprobada, tipografía y criterios de accesibilidad WCAG 2.2 AA; no acredita conformidad integral del frontend.
- [`catalogo-componentes.md`](diseno/catalogo-componentes.md): Contratos de la API pública y consumo de componentes del kit compartido (`shared/ui/`).
- [`patrones-formularios.md`](diseno/patrones-formularios.md): Patrón transversal para anatomía, validación in-situ, control de foco y preservación de cambios no guardados.

## 3. Trazabilidad y Calidad SDD (`docs/trazabilidad/`)
Registro formal de hallazgos, correcciones técnicas, verificación con pruebas y auditoría de cambios:
- [`correcciones.md`](trazabilidad/correcciones.md): Registro de correcciones y verificaciones; reorganización v15 en C-047, base frontend y consolidación en C-048 a C-050, y revisión previa al commit en C-051.
- Los registros históricos de correcciones se conservan en Git.

## 4. Referencias Inmutables (`docs/referencias/`)
Planillas y modelos de referencia originales:
- `Requisitos_Sistema_Procesos_v15.xlsx`: Matriz de requisitos aprobada versión 15 (fuente de verdad oficial).
- `Requisitos_Sistema_Procesos_v14.xlsx`: Matriz anterior conservada como fuente histórica; no define la versión vigente.
