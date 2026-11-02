# Comparación del frontend de Jallupacha y la plantilla Angular/Ionic

Fecha: 2026-10-27. Estado: análisis y propuesta de adopción, sin cambios de implementación ni aprobación institucional. Jallupacha examinado: HEAD `4f9e3d7`, árbol limpio al iniciar. La carpeta externa se identifica como **plantilla**; no es la planilla de requisitos.

## 1. Dictamen

**El kit de Jallupacha es aplicable a la plantilla mediante adaptación, pero no puede incorporarse completo sin cambios. La plantilla aporta prácticas aprovechables para Jallupacha, pero no conviene trasladarle su arranque, autenticación ni dependencia de Ionic.**

Para nuevos sistemas web de intranet, la mejor candidata entre las fuentes examinadas es la **base neutral generada desde Jallupacha**, separada del producto. Ya existen STD-FE-001, STD-UX-001, contratos públicos del kit y un generador local versionado: no hace falta crear otro estándar paralelo. Su uso institucional requiere la decisión de adopción correspondiente; el estado actual de la base es `validation`, versión 0.2.0.

Para un consumidor existente que necesite conservar Ionic, es razonable adoptar primero las reglas UX y después los componentes compatibles. Los controles Ionic necesitan su propia adaptación visual y pruebas. La incorporación de Capacitor se justificaría por una necesidad del producto; su presencia en la plantilla no lo convierte en requisito de una aplicación web.

La comparación tiene una asimetría importante: Jallupacha es un producto con recorridos de consulta y edición; la plantilla contiene principalmente acceso y una pantalla de administración de ejemplo. Se compara la capacidad de servir de base y la evidencia disponible, sin exigir a la plantilla funcionalidades del dominio.

## 2. Fuentes y alcance

Fuentes rectoras: [arquitectura v15, sección 5](../producto/arquitectura_v15.md), [STD-FE-001](base-frontend.md), [STD-UX-001, especialmente secciones 5 y 6](marco_estandar_ux_institucional.md), [fundamentos visuales](design-system.md), [catálogo](catalogo-componentes.md) y [formularios](patrones-formularios.md).

Fuentes de implementación: `frontend/src/app`, `frontend/base`, generador, verificaciones y configuración del frontend de Jallupacha; `src/app`, estilos, configuraciones, README, paquete y lockfile de `C:/Users/altir/Documents/UniversidadDeTarapaca/Proyecto-Base-Frontend-main`.

Este análisis actualiza el contraste previo a C-048 conservado en [correcciones](../trazabilidad/correcciones.md). Aquel describía un frontend más plano, con carga inmediata y retornos pendientes. Esos hallazgos no deben repetirse como descripción actual: hoy existen `core/platform`, `core/auth`, `features`, carga diferida y protección de retorno.

No se auditó íntegramente el workbook de requisitos. Las referencias REQ-05/06/19/25/26 se toman de los documentos vigentes para delimitar presentación, navegación, acceso y perfiles; no se modifican requisitos ni se presupone su cumplimiento integral. No se inspeccionaron secretos locales ni se reproducen valores de credenciales de ejemplo.

## 3. Comparación técnica

| Dimensión | Jallupacha actual | Plantilla externa | Implicación para el estándar |
| --- | --- | --- | --- |
| Plataforma declarada | Angular 22.2.1, TypeScript 6.0.2, RxJS 7.8.2; CSS y HTML nativos | Angular 17.3.x, Ionic 8.1.x, Capacitor 6, TypeScript 5.2.x; el lockfile resuelve 17.3.8/8.1.1/6.0.0/5.2.2 | Alinear y comprobar versiones antes de compartir código; no asumir compatibilidad por usar Angular. |
| Composición | `bootstrapApplication`, componentes independientes y proveedores raíz | `AppModule`, módulos funcionales, `IonicModule`, `IonicRouteStrategy` | Para código nuevo, preferir la composición actual de Jallupacha. Los módulos existentes pueden coexistir con componentes independientes compatibles. |
| Responsabilidades | `core/platform` genérico, `core/auth` adaptador, `features` de dominio, `shared/ui` de presentación | `core` con servicios, guardas, validadores y contratos específicos; `shared` con utilidades; `modules` con páginas | Ambos tienen separación física. Jallupacha añade límites documentados y comprobación estática; no trasladar todo servicio a `core`. |
| Carga | Funcionalidades con `loadComponent`; acceso inmediato | Módulos con `loadChildren` y `PreloadAllModules` | Ambos declaran límites de carga. La precarga cambia cuándo se descargan los módulos; no demuestra por sí sola mayor o menor rapidez. |
| Estado | Signals para estado visible; RxJS para HTTP y composición de consultas | BehaviorSubject/AsyncSubject y RxJS | Estandarizar responsabilidades, cancelación y vigencia de resultados; no imponer una sola herramienta para todos los estados. |
| Formularios | Acceso y muestra neutral reactivos; formularios existentes con mecanismos diversos; contrato común de salida | FormGroup/FormControl, validadores, pipe de errores y Maskito | Adoptar controles reactivos tipados para nuevas capturas; conservar contratos y regresiones al migrar las existentes. |
| Presentación | Nueve componentes públicos, auxiliares, patrones CSS y catálogo de estados/límites | Biblioteca Ionic, utilidades compartidas y personalizaciones globales; sin catálogo propio equivalente encontrado | El kit ofrece una base propia más explícita, mientras Ionic aporta un inventario mayor de controles. Son niveles distintos de reutilización. |
| Calidad | Vitest, aislamiento CSS, contraste, políticas de fuente, generador y CI declarada | Jasmine/Karma, TypeScript estricto, ESLint y cinco archivos de pruebas encontrados | Aprovechar lint de la plantilla como práctica. No confundir archivos de pruebas o CI con ejecuciones aprobadas. |
| Distribución | Manifiesto 0.2.0, fuentes explícitas, hashes, generación y rechazo de sobrescritura | Copia del proyecto y configuración local indicada por README; lockfile presente | La base de Jallupacha dispone de un mecanismo más definido de procedencia y mantenimiento. |
| Evidencia de entrega | Compilación y comprobaciones ejecutadas en esta revisión | Sin dependencias instaladas ni `credenciales.ts` local en la carpeta examinada | No existe una comparación ejecutada de tamaño, velocidad o comportamiento entre ambos. |

La diferencia entre componentes independientes y NgModules no es una prohibición de integración. Angular permite importar componentes independientes en `imports` de un NgModule y recomienda componentes independientes para nuevo código: [documentación oficial](https://angular.dev/guide/ngmodules/overview). El bloqueo inmediato es la combinación de versiones y APIs utilizadas, además del modelo de presentación.

## 4. Aplicabilidad por dirección

| Transferencia | Dictamen | Condiciones |
| --- | --- | --- |
| Reglas UX de Jallupacha → plantilla | Aplicables como guía propuesta | Adoptarlas expresamente en el consumidor; evaluar sus tareas. No copiar el mapa, menú, perfiles ni jerarquías del producto. |
| Tokens y patrones CSS → plantilla | Parcialmente aplicables | Cargar tokens/base una vez y usar `ui-root` sobre el ámbito elegido. Mantener exactos los siete tokens `--brand-*`; resolver la identidad del consumidor mediante una política explícita y roles semánticos. Revisar CSS efectivo. |
| Componentes Angular del kit → plantilla | Aplicables tras compatibilizar | El host de diálogos importa `linkedSignal`; varios componentes omiten `standalone: true` al utilizar el comportamiento predeterminado de Angular más reciente. No son fuentes listas para Angular 17. |
| Estilos del kit → controles Ionic | Requieren adaptación | Una clase `.field` no convierte `ion-input` en un input nativo ni alcanza automáticamente su interior. Usar variables y partes públicas de Ionic o elegir controles nativos en una pantalla completa. |
| Foco, desplazamiento y diálogos → aplicación Ionic | Compatibilidad no probada | `UiNavigationFocus` registra `window.scrollY` y usa `window.scrollTo`; Ionic ofrece un área de desplazamiento propia en `ion-content`. Comprobar foco de página activa, retorno, scroll y convivencia de overlays. |
| Núcleo de sesión → plantilla | Requiere diseño del contrato de servidor | Cookies y CSRF del mismo origen, identidad y payload de acceso esperados. Configurar URLs no adapta un servidor Bearer con otro esquema de respuesta. |
| Organización y herramientas de la plantilla → Jallupacha | Aprovechables selectivamente | Separación TS/HTML/SCSS, utilidades y lint. La estructura por funcionalidades y la carga diferida ya están presentes; no son trabajo pendiente por este análisis. |
| Autenticación y arranque de la plantilla → Jallupacha | No recomendados | Contradicen el contrato vigente de sesión y sustituyen decisiones ya documentadas sin un beneficio demostrado. |
| Ionic/Capacitor → Jallupacha | Sin necesidad demostrada | Cambiaría la base visual y de navegación del producto. No se justifica para obtener consistencia UX. |

El uso de `linkedSignal` está documentado por Angular como API estable desde v20; confirma que no puede presuponerse su disponibilidad en Angular 17: [API oficial](https://angular.dev/api/core/linkedSignal). Esto identifica incompatibilidad de fuentes; no sustituye una compilación de integración.

Ionic documenta la personalización de componentes con Shadow DOM mediante variables y `::part`: [guía oficial](https://ionicframework.com/docs/theming/css-shadow-parts). Su área de scroll tiene API propia: [ion-content](https://ionicframework.com/docs/api/content). La necesidad concreta de adaptar scroll se infiere de ese contrato y del uso de `window` en el kit; no se reprodujo un fallo en la plantilla.

## 5. UX: tareas, accesos y evidencia

Tareas consideradas: acceder, identificar ubicación, consultar una colección, abrir un registro, editar, cancelar, regresar al origen y cerrar sesión. Perfiles de Jallupacha: los definidos por v15; la plantilla solo demuestra su ejemplo de administración. La disposición común y el contenido por ruta se revisaron por separado en código.

### Inventario de accesos

| Contexto | Accesos observados | Evaluación |
| --- | --- | --- |
| Jallupacha: contenido común | Título del módulo y Mapa → `/mapa`; Procesos → `/procesos`; destinos administrativos según perfil | Título y Mapa comparten destino con función de orientación y acceso explícito. No se propone eliminar uno sin estudiar su utilidad. Acciones operativas y sesión se componen separadas de la lista de destinos. |
| Jallupacha: contenido de ruta | Exploración mapa → macroproceso → ficha; búsqueda → ficha; jerarquía mediante migas; retorno mediante origen validado | Exploración y búsqueda atienden tareas distintas. Migas y retorno representan jerarquía y recorrido, respectivamente; no son duplicaciones automáticamente. |
| Plantilla: acceso | Raíz → formulario; éxito → `/administracion` | Camino corto, pero no conserva un destino originalmente solicitado en el código examinado. |
| Plantilla: administración | Pantalla de ejemplo con cierre de sesión | No demuestra tareas de catálogo, detalle o edición de negocio. Su ausencia no es un defecto funcional de la plantilla. |
| Plantilla: contratos de ruta | Guardas remiten a `/iniciar-sesion` y `/admin`; rutas declaradas de acceso/administración: raíz y `/administracion`; comodín → raíz | Inconsistencia estática. El comodín puede ocultar el destino incorrecto. `RutasService` menciona otros destinos, pero no se encontró consumidor; no se contabiliza como menú visible. |

### Matriz de revisión conforme a STD-UX-001 §6

Una observación de código se distingue de una prueba de recorrido. «No probado» conserva su significado aunque exista una implementación plausible o evidencia histórica.

| Reglas y subreglas pertinentes | Jallupacha actual | Plantilla externa | Verificación de adopción esperada |
| --- | --- | --- | --- |
| R-01.1–6; R-02.1–3: navegación, acciones y jerarquía | Composición común, ubicación activa y migas presentes. Subconjunto de pruebas de navegación aprobado; recorrido visual actual no probado | Dos pantallas; sin patrón general de navegación demostrado. Destinos de guardas inconsistentes en revisión estática | Por perfil: enlaces anunciados llegan al destino; sección activa correcta; contenido común único; migas solo con jerarquía real. |
| R-03; R-09; R-10: significado y alternativas | Acciones contextuales y accesos equivalentes inventariados; no se exige copiar su disposición a otros productos | Acceso y cierre visibles; título de entrada expone versiones técnicas del proyecto | Revisar textos de producto y efecto de cada control; justificar alternativas que comparten destino. |
| R-04.1–3; R-05.1–6; R-06.1–5: estados y recuperación | Mensajes, errores asociados, foco y protección durante guardado cubiertos parcialmente por las regresiones ejecutadas | Error remoto del acceso se envía solo a consola; existe spinner y bloqueo del botón, pero no una recuperación visible equivalente | Error de acceso visible; formulario de negocio conserva datos al fallar; carga fallida no habilita guardar; anuncio accesible y un solo envío. |
| R-07.1–4: descarte y operación pendiente | Contratos y guardas; pruebas de formularios/editores aprobadas en el subconjunto ejecutado | No se encontraron `canDeactivate`, `confirmLeave` o contrato equivalente en `src` | Limpio → salir sin diálogo; modificado → confirmar; cancelar descarte → preservar; guardar otro editor no borra cambios; probar salida mientras guarda. |
| R-08: contraste, teclado, semántica, 200 % y reajuste | 44 pares de tokens y tres pruebas de aislamiento aprobados. Contraste efectivo, teclado real, revisión visual, 200 %, 320 px y asistencia no probados en esta revisión | Imagen con mínimo de 400 px, tarjeta de 350 px y centrado absoluto en acceso; riesgo de reajuste identificado. Contraste efectivo y demás pruebas de navegador no probados | Comprobar colores efectivos, orden/foco, zoom real y ancho de 320 px por separado. No atribuir a Ionic por sí mismo cumplimiento o incumplimiento. |
| R-11: continuidad y retorno | Valida origen interno y conserva parámetros; existe servicio específico. No se ejecutó aquí todo el recorrido listado → ficha → edición → listado | Acceso exitoso remite siempre al ejemplo de administración; no se encontró retorno contextual | Probar origen filtrado, entrada directa, retorno tras guardar/cancelar y ausencia de contexto entre sesiones. |
| R-12: fidelidad y ejemplos | Separación del dominio y base neutral documentada; sin auditoría integral de todos los indicadores | Interfaz de ejemplo y formulario de acceso con valores predefinidos, incluida una contraseña de demostración | La base distribuida debe iniciar sin credenciales, contenido ficticio presentado como registro ni supuestos del dominio. |

Los anchos fijos constituyen evidencia de una decisión rígida, no una medición ejecutada de desbordamiento. Del mismo modo, la ausencia de asociación ARIA explícita en un template Ionic no demuestra por sí sola que el DOM generado sea inaccesible; hay que inspeccionarlo.

## 6. Hallazgos relevantes para decidir la adopción

### Plantilla externa

1. **Sesión no intercambiable.** Guarda un Bearer token en `localStorage`; el cierre examinado limpia almacenamiento y recarga, sin petición de revocación. No se puede concluir si el token sigue válido sin examinar el servidor, pero ese código no acredita invalidación remota. `localStorage.clear()` también elimina claves ajenas al servicio en el mismo origen.
2. **Ámbito HTTP no restringido.** El interceptor de token agrega Authorization a cualquier solicitud si existe token. El interceptor de URL concatena el prefijo y permite cambiarlo mediante contexto. Se necesita limitar destinos autorizados antes de promoverlo como infraestructura compartida. No se afirma una filtración observada.
3. **Acoplamiento del contrato de identidad.** El servicio incorpora atributos y roles del sistema de referencia; el núcleo no es neutral por estar dentro de `core`. El consumidor necesita un adaptador explícito.
4. **Errores y destinos de acceso.** Error remoto solo en consola; guardas con destinos no declarados. Son diferencias observables en fuente y requieren regresiones de recorrido al corregirse.
5. **Acceso como demostración.** Contiene valores de acceso iniciales y textos de versión en la interfaz. Deben retirarse de una base destinada a producto. No se reproducen los valores ni se presupone que correspondan a cuentas reales.
6. **Estilos ligados a implementación interna.** `estilos-ionic.scss` combina una parte pública de `ion-select` con selectores de estructura/clases generadas de `ion-input`. Esa segunda técnica puede romperse al actualizar y necesita sustitución por API pública cuando exista.
7. **Pruebas de alcance limitado.** Varios tests comprueban creación de componentes; hay tests de una utilidad de formato. No se encontró cobertura equivalente de límites HTTP, logout remoto, cambios pendientes y errores de acceso. No se ejecutaron los tests externos y no se califican como fallidos.

Clasificación SDD para una eventual intervención: adaptación del diseño de sesión/versiones y de la base compartida; defectos de implementación candidatos en rutas y retroalimentación. Las reglas de Jallupacha no se convierten automáticamente en obligaciones de la plantilla externa. La adopción o modificación de un contrato de autenticación requiere decisión en su fuente antes de implementar.

### Límites del kit de Jallupacha como estándar general

1. **Es un piloto 0.2.0 en validación.** La existencia de generador y tests no lo convierte en biblioteca estable ni acredita soporte institucional.
2. **Sus contratos tienen alcance.** La sesión espera cookies/CSRF del mismo origen, identificador entero positivo, correo y perfiles; el acceso usa correo/contraseña. No cubre automáticamente servidores Bearer, otros esquemas de identidad o integración entre orígenes.
3. **La navegación disponible es plana y horizontal.** No ofrece por contrato un árbol de navegación o shell universal. El sistema consumidor decide su arquitectura de información.
4. **Los componentes tienen restricciones útiles pero concretas.** Panel con `h2`, sección con `h3`, paginación que requiere totales válidos, un diálogo activo y contador con formato `es-CL`. `PendingChanges` compara valores serializables; no es almacenamiento de borradores ni solución automática para archivos u otros estados complejos.
5. **Hay oportunidades de neutralidad adicional.** Algunos roles visuales compartidos conservan nombres del mapa (`--ui-color-map-*`). Revisar su ubicación si aparece otro consumidor con necesidades distintas, sin renombrar APIs preventivamente ni romper consumidores.
6. **Las comprobaciones estáticas no equivalen a lint completo.** Jallupacha tiene políticas de fuente concretas, pero no un script frontend de lint general equivalente al externo. La conveniencia de añadirlo es una propuesta de herramientas, no un fallo probado del producto.

## 7. Estándar recomendado y forma de adopción

Se propone mantener cuatro niveles coordinados:

| Nivel | Fuente propuesta | Qué se comparte | Qué decide el producto |
| --- | --- | --- | --- |
| Desarrollo | STD-FE-001 | Límites de dependencias, contratos de plataforma, carga por funcionalidades, verificación, versiones y migración | Dominio, API, capacidades y adaptación de sesión. |
| Experiencia | STD-UX-001 | Orientación, claridad, estados, errores, cancelación, retorno y accesibilidad verificables | Tareas, jerarquía, disposición y caminos útiles. |
| Presentación | Fundamentos, catálogo y formularios | Tokens, componentes y patrones con estados/límites | Marca autorizada y composición contextual, conservando contratos y contraste. |
| Arranque y entrega | Generador neutral 0.2.0 | Fuentes explícitas, procedencia y ejemplo mínimo; verificación reproducible | Configuración y funciones propias; ningún menú o modelo de procesos copiado por defecto. |

**Nuevos sistemas web de intranet:** comenzar desde la base neutral; adaptar contrato de servidor y navegación; añadir funcionalidades propias. No copiar todo Jallupacha ni instalar Ionic/Capacitor solo para reproducir el aspecto de una plantilla.

**Sistemas Ionic existentes:** adoptar primero criterios de tarea y estados. Elegir un recorrido representativo existente y compatibilizar versiones. Probar componentes del kit en una pantalla delimitada o mapear roles semánticos a controles Ionic mediante APIs públicas. Evitar dos familias visuales equivalentes sin una regla de uso. Si se mantiene otra sesión, consumir solo presentación hasta resolver el contrato; no registrar ambos interceptores de autenticación simultáneamente.

**Transferencia inversa hacia Jallupacha:** considerar lint, máscaras y utilidades solo ante una necesidad real y con pruebas. La separación por funcionalidades, archivos de pantalla y cargas diferidas ya existe. No migrar todos los formularios por uniformidad cosmética ni incorporar validaciones de un dominio ajeno.

Secuencia propuesta para una futura adopción, sin ejecutarla en esta revisión:

1. Elegir consumidor y tarea; registrar versión de Angular/Ionic, API, sesión, identidad, alcance visual y responsable de mantenimiento. Si cambia el diseño, revisarlo antes de código; si cambia producto, obtener aprobación de alcance.
2. Para nueva aplicación, generar en directorio nuevo. Para existente, revisar diferencias y copiar únicamente fuentes declaradas compatibles, sin sobrescritura automática.
3. Resolver acceso, límites HTTP, URLs y cierre antes de integrar todo el núcleo. Los permisos siguen verificándose en el servidor; el kit no implementa Argon2id ni sustituye el backend.
4. Evaluar el recorrido existente elegido: acceso → tarea → edición si corresponde → fallo → reintento → cancelación/retorno → cierre. No añadir funciones solo para llenar un catálogo de ejemplos.
5. Ejecutar criterios FE afectados y matriz UX: tipos/compilación, regresiones, contraste efectivo, aislamiento con CSS anfitrión, teclado/foco, zoom 200 %, 320 px y evaluación asistiva según alcance. Registrar cada comprobación con su estado real.
6. Decidir promoción y soporte con evidencia del consumidor real. Un ejemplo neutral demuestra reutilización técnica; no sustituye uso con personas ni autorización de producción.

## 8. Verificación ejecutada y límites

Entorno: Windows, Node 24.15.0, npm 12.2.0. El repositorio declara npm 11.12.x; la ejecución local no acredita reproducibilidad bajo esa versión exacta.

| Comprobación | Resultado de esta revisión |
| --- | --- |
| Compilación de producción Jallupacha: `npm run build --workspace frontend` | Aprobada; 406,94 kB iniciales, transferencia estimada 106,29 kB; por debajo de presupuestos de aviso 450/error 600 kB. No es una medición de latencia ni de tráfico del despliegue. |
| Kit, navegación, sesión y editores: `npm exec --workspace frontend -- ng test --watch=false --include src/app/shared/ui/**/*.spec.ts --include src/app/core/platform/session.spec.ts --include src/app/edit-protection.spec.ts` | Cinco archivos, 57 pruebas aprobadas. Primer intento impedido por EPERM en temporales del entorno, antes de ejecutar tests; repetición con TEMP/TMP dentro de `.tmp/comparativo-frontend-tests` aprobada. |
| `npm run check:ui-compatibility --workspace frontend` | Tres pruebas aprobadas de ámbito CSS/variables y convivencia con un anfitrión genérico. No es integración real con Ionic. |
| `npm run check:contrast --workspace frontend` | 44 combinaciones de tokens aprobadas. No cubre colores efectivos de todas las pantallas ni del consumidor Ionic. |
| `npm run check:source --workspace frontend` | Aprobada la política acotada de capas, carga diferida, tokens y patrones inseguros. No es SAST completo. |
| `npm run test:base --workspace frontend` | Dos pruebas aprobadas: generación/procedencia/no sobrescritura y filtro SARIF. No se realizó una nueva instalación/compilación de consumidor neutral; los antecedentes C-048 a C-050 conservan su propio alcance. |
| Recorrido y textos visibles | Revisados estáticamente los templates y destinos; pruebas DOM del subconjunto anterior aprobadas. Recorrido manual actual en navegador de ambos proyectos: no probado. |
| Contraste efectivo, revisión visual y teclado real | No probados en esta revisión. Las capturas y pruebas de navegador de C-049/C-050 son antecedentes identificados, no nuevas ejecuciones. |
| Zoom real al 200 %, ancho de 320 px y tecnologías de asistencia | No probados en esta revisión. No se concede conformidad WCAG integral. |
| Compilación, lint, tests y ejecución externa | No probados: sin dependencias instaladas ni configuración local requerida. No se instalaron paquetes ni se modificó la plantilla. |
| Compatibilidad kit + Angular/Ionic en un consumidor real | No probada mediante compilación/recorrido. Incompatibilidades de fuentes y contratos identificadas por inspección. |
| Rendimiento comparado | No probado. El tamaño medido de Jallupacha no permite concluir que sea más rápido o ligero que la plantilla. |
| CI, SAST, secretos, auditoría de dependencias y producción | No ejecutados en esta revisión. Configuración existente no equivale a un resultado aprobado. |
| Oracle y persistencia | No aplica al cambio documental: no se alteran ni se prueban backend, datos, SQL, grants, migraciones o transacciones. |

Revisión registrada: misma IA autora, no independiente. Se cotejaron fuentes actuales, contratos exportados, límites de adopción y resultados ejecutados. La propuesta conserva requisitos, siete colores aprobados, identidad propia, permisos y controles técnicos; no autoriza integración, publicación ni migración de consumidores.

## 9. Revisión de la comparación aportada por Gemini y madurez de primera entrega

### 9.1. Alcance y criterio del responsable

El responsable precisa que la primera entrega a otros desarrolladores debe ser consistente y suficientemente madura para replicarse. Esta sección evalúa la comparación de análisis aportada en texto adjunto; el análisis original completo de Gemini no fue suministrado. No se puede verificar su ejecución de herramientas ni atribuirle pruebas no incluidas en el adjunto. El acuerdo entre dos análisis de IA no constituye revisión humana, comprobación independiente de funcionamiento ni aceptación institucional.

La precisión del responsable evita interpretar «mínimo» como una entrega incompleta cuya instalación y contratos deban descubrir los primeros consumidores. El criterio propuesto es una entrega de alcance acotado con condiciones de salida comprobadas. La prueba con desarrolladores valida transferencia y mantenibilidad; no sustituye la preparación técnica previa. No se implementan cambios de producto o de contratos mediante este análisis.

### 9.2. Aciertos y afirmaciones que requieren precisión

| Afirmación del texto externo | Evaluación |
| --- | --- |
| Preferir la base neutral para nuevas aplicaciones web del ámbito definido | Recomendación coherente con el código y arquitectura examinados. No concede madurez de distribución ni convierte la base en estándar institucional aprobado. |
| Diferencias de Angular, sesión, Ionic y fuentes del kit | Confirmadas por inspección; justifican una adaptación explícita. Compartir Angular no acredita compatibilidad de fuentes ni de contratos. |
| Rutas inconsistentes, error solo en consola, valores de acceso predefinidos, triple borrado local y uso de `execCommand` | Confirmados en fuente. Los valores predefinidos no acreditan cuentas reales; la redundancia de borrado es un defecto de calidad y su alcance sobre todo el almacenamiento merece revisión. No todos esos hallazgos son vulnerabilidades explotables demostradas. |
| «Falla inmediata del build por credenciales.ts» | La carpeta carece del módulo local importado por environment y de dependencias instaladas; el README prescribe crearlo. Hay un paso manual de instalación y una dependencia sin resolver en el estado entregado. En esta revisión no se ejecutó el build externo, por lo que no se registra como fallo ejecutado. |
| Riesgo XSS por localStorage | Guardar el token allí aumenta su exposición si se ejecuta JavaScript malicioso; no demuestra la existencia de una inyección XSS. Evitar confundir una condición que agrava el impacto con una vulnerabilidad XSS reproducida. |
| Bearer «sin CSRF» frente a cookies «seguras» | La evaluación CSRF depende de qué credenciales envía automáticamente el navegador. La ausencia del mismo token CSRF no prueba por sí sola un defecto en una API que utiliza exclusivamente Authorization explícito. Las cookies HttpOnly tampoco acreditan por sí solas toda la seguridad de sesión. Mantener el contrato cookie/CSRF previsto para Jallupacha sin generalizar una certificación. |
| «Colisión» de desplazamiento con Ionic | Hay una diferencia concreta entre scroll de window y el de ion-content. Se necesita adaptación y prueba; no se reprodujo una colisión en la plantilla. |
| Sustituir execCommand por Clipboard API | Dirección técnica razonable. Deben comprobarse contexto seguro, permisos, activación y manejo de rechazo en los navegadores de destino; reemplazar la llamada no basta para garantizar funcionamiento. |
| Prescindir de Ionic cuando no se requieren capacidades móviles nativas | Ionic también funciona en navegador. La decisión se fundamenta en necesidades del producto, controles, experiencia del equipo, compatibilidad y mantenimiento. En Jallupacha no se demostró una necesidad que justifique introducirlo. |
| Incorporar ESLint y utilidades como transferencia a Jallupacha | Posibilidades condicionadas a problemas concretos. Ya existe una comprobación estática propia con función de lint (`check:source`), exportada al consumidor y declarada en CI. La ausencia de ESLint no equivale a ausencia de controles. |
| Corregir inmediatamente toda la plantilla externa | Es un trabajo distinto de preparar la primera distribución del kit. Sus problemas orientan qué evitar y qué adaptar; repararla no es condición de entrega de la base Angular/CSS examinada ni está implementado por este análisis. |

Referencias técnicas contrastadas: [prevención CSRF, OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [almacenamiento del navegador, OWASP](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage), [Clipboard API, MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API), [writeText y contexto seguro, MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText), [alcance web de Ionic](https://ionicframework.com/docs). Estas precisiones no declaran una auditoría completa de seguridad ni compatibilidad de navegador.

Hay además un límite omitido por la comparación: el backend de Jallupacha aún usa scrypt en `backend/src/common/security.ts`, mientras REQ-25/arquitectura v15 requieren Argon2id. No se recomienda ese backend como implementación conforme de referencia. El generador distribuye frontend; esa diferencia no convierte el kit visual en incorrecto ni obliga a añadir un backend a su entrega. Si se entrega también autenticación de servidor como solución completa, cerrar esa diferencia y sus verificaciones sí forma parte del alcance correspondiente.

### 9.3. Comprobación nueva de la distribución actual

Se ejecutó el generador dos veces en directorios nuevos e independientes bajo `.tmp/revision-entrega-2RBnYD/consumer-a` y `consumer-b`, sin instalar dependencias ni modificar consumidores existentes. Se compararon inventarios y SHA-256 de todos los archivos, incluida procedencia: **50 archivos idénticos**, con ambas comprobaciones `--check` aprobadas. Esto demuestra generación determinista de fuentes en esta versión y equipo; no instalación desde cero, compilación del consumidor en esta ejecución ni reproducibilidad de binarios entre equipos.

El inventario confirma:

- Se exportan `docs/arquitectura.md` y `docs/cambios.md`; los contratos completos de componentes, fundamentos y formularios no se incluyen en el consumidor.
- Se entrega un archivo de pruebas del consumidor con cuatro casos; los `.spec.ts` del núcleo y kit se excluyen por diseño. No se exige copiar pruebas de negocio; falta decidir qué regresiones genéricas acompañan una distribución de fuentes que el consumidor puede mantener.
- No se exporta `LICENSE` ni `NOTICE`; el repositorio fuente contiene una licencia MIT. Antes de distribuir, incluir la licencia y los avisos que correspondan al material entregado.
- La configuración de CI incluye instalación, políticas de fuente, contraste, tests, build, dependencias y análisis de seguridad. Su presencia no prueba que cada paso haya aprobado en el repositorio de destino.

Se conservan como antecedentes los builds y pruebas del consumidor neutral de C-048 a C-050 y los resultados de la sección 8. No se repiten ni se convierten en una nueva aceptación de distribución. La prueba de dos generaciones no incorpora nuevas dependencias ni sistemas de publicación.

### 9.4. Condiciones propuestas para entregar a desarrolladores

Los criterios siguientes concretan FE-01 a FE-10 y la revisión UX aplicable como propuesta de salida para esta entrega. No sustituyen el procedimiento de producción de los productos que nazcan del kit ni declaran aprobadas comprobaciones pendientes.

| Condición de entrega | Evidencia observable necesaria | Situación actual y ajuste delimitado |
| --- | --- | --- |
| Alcance y versión identificables | Fuente de una revisión Git concreta, versión coherente, plataformas soportadas, contratos y límites incluidos | Manifiesto 0.2.0 en validation presente. Preparar una entrega identificada; no subir a 1.0 para aparentar madurez ni prometer compatibilidad Ionic/Angular 17 sin pruebas. |
| Instalación reproducible | En el entorno declarado, generar fuera de workspaces del producto, instalar con lockfile y ejecutar pruebas/build sin dependencias heredadas ni configuración privada no documentada | Existen antecedentes de consumidor independiente. Repetir sobre la entrega candidata con Node/npm declarados; la ejecución local previa con npm 12.2.0 no acredita por sí sola npm 11.12.x. Documentar requisitos de registro/caché si el destino opera sin Internet. |
| Contratos y guía utilizables sin conversaciones | Documentación versionada de API, configuración, estilos, sesión, errores y creación de una funcionalidad; distinguir archivos de aplicación de fuentes compartidas | Reutilizar y entregar los documentos existentes pertinentes, neutralizando referencias propias del producto. Añadir un único recorrido de incorporación práctico, con enlaces que funcionen en el material distribuido. |
| Ejemplo ejecutable y visual comprobado | Muestra neutral con componentes reales y estados esenciales: limpio, inválido, pendiente, fallo/reintento y descarte; recorrido, textos, contraste efectivo, foco/teclado, 200 %, 320 px y comprobación asistiva pertinente registrados por separado | El formulario actual demuestra interacción sin persistencia y la ruta requiere sesión. Definir cómo ejecutar/verificar la muestra sin servidor de producto no entregado, mediante entorno de documentación/prueba explícito o API de integración documentada. La simulación queda aislada del mecanismo de autenticación de producto. No exige Storybook ni plataforma de catálogo nueva. |
| Regresiones útiles para quien mantiene el código entregado | Pruebas genéricas de los contratos críticos distribuidos y controles existentes ejecutables desde el consumidor; fallos informativos | Conservar check:source y contraste. Entregar o preparar un subconjunto neutral de regresiones de UI, descarte y sesión si se incluye ese núcleo; sin copiar fixtures del dominio ni duplicar todas las pruebas del producto. Añadir ESLint únicamente si aporta reglas concretas acordadas. |
| Sesión integrable y alcance de seguridad inequívoco | Contrato de API, identidad y errores con ejemplos neutrales; configuración de cookies/CSRF y responsabilidades del servidor; prueba de límites, expiración, cierre fallido y respuestas tardías | Mantener el contrato actual como única integración soportada inicialmente y la UI independiente como ya está. El consumidor puede usar solo presentación. No fabricar adaptadores universales para servidores hipotéticos; la expiración real y permisos se verifican en servidor, no con CSS o guardas. |
| Mantenimiento y condiciones de distribución | Licencia/avisos incluidos, responsable de mantenimiento designado, cambios de versión y procedimiento manual de actualización con comparación, adaptación y verificación | Hay versión, hashes y criterios de migración; faltan materiales y responsabilidades de la entrega. Basta un procedimiento escrito y revisión de diferencias; no requiere registro de paquetes ni actualizador automático. |
| Revisión de entrega y transferencia | Registro de revisión distinto de una autodeclaración del autor; otra persona instala y modifica un ejemplo usando el material recibido y ejecuta sus verificaciones | No demostrado en esta revisión. Preparar técnicamente la candidata primero; usar la prueba con desarrolladores como aceptación de transferencia, registrando dificultades y correcciones antes de distribución más amplia. La aceptación institucional conserva su autoridad. |

### 9.5. Límite de ingeniería y conclusión de entrega

Documentación completa y coherente, una muestra ejecutable, pruebas genéricas pertinentes, instalación independiente, licencia y un procedimiento de mantenimiento resuelven necesidades reales de la entrega autorizada. No constituyen por sí mismos sobreingeniería. El alcance se mantiene finito: los contratos y estados que se anuncien como soportados.

Se posponen publicación como paquete, infraestructura de catálogo, actualizaciones automáticas, compatibilidad retroactiva, nuevos gestores de estado, variantes universales de navegación y múltiples autenticaciones hasta demostrar una necesidad. Tampoco se repara la plantilla externa como paso implícito para distribuir este kit.

Dictamen: **existe una base técnicamente avanzada y evidencia de generación reproducible, pero todavía no se acredita una primera entrega completa y autónoma para otros desarrolladores**. La mejora necesaria está principalmente en cerrar la distribución y verificar sus contratos/uso en el consumidor, aprovechando lo que ya existe. Esta conclusión no invalida las pruebas aprobadas ni presenta pendientes de producción del producto como defectos del kit visual.
