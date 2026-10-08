# Release 01 — Navegación interna y mapa público

Estado: propuesta de alcance y diseño mínimo para revisión; no autoriza implementación. Cotejada con los requisitos fuente v13 transcritos en `docs/especificacion.md`. Esta propuesta no reemplaza los requisitos ni declara completos requisitos parcialmente implementados.

## Objetivo y orden de entrega

Preparar una primera versión navegable reutilizando la ficha, catálogos, perfiles, sesiones, auditoría, API y kit UI ya existentes. El release separa la navegación interna autenticada del mapa público y consta de:

1. Árbol interno Macroproceso → Proceso, agrupación por tipo y apertura de la ficha (REQ-18/REQ-06).
2. Registro y consulta de riesgos con los campos y permisos de REQ-10, los niveles iniciales de REQ-11 y las listas administrables de REQ-28.
3. Exportaciones HTML y JSON autónomas y mapa navegable público (REQ-36/REQ-17/REQ-52). Incluye solo macroprocesos, tipos y nombres de procesos Vigentes. Solo el Administrador genera los artefactos. Incluye envío, aprobación y rechazo de REQ-07; nunca inserta ni asigna el estado por carga.
4. Carga de procesos genéricos para una institución estatal chilena, sin datos reales ni etiquetas de prueba, compatible con el modelo y el flujo normal del producto.

Se mantienen fuera de alcance el versionado e historial completos (REQ-09/REQ-56), editar o alterar directamente los datos de procesos Vigentes, su retiro, el descarte de borradores, el tratamiento/gestión de riesgos más allá de registrar y consultar, y la publicación numerada. No añadirlos indirectamente mediante importación, exportación o estado precargado.

## Requisitos y dependencias

| Área | Requisitos | Dependencias relevantes |
| --- | --- | --- |
| Árbol y ficha | REQ-18, REQ-06 | REQ-05, REQ-51, REQ-01 |
| Riesgos y listas | REQ-10, REQ-11, REQ-28 | REQ-05; autorización por solicitud; niveles y reglas de catálogos conforme v13 |
| Mapa/exportación | REQ-36, REQ-17, REQ-52 | REQ-02; aprobación REQ-07 y datos Vigentes; generación autenticada para Administrador |
| Envío/revisión | REQ-07 | REQ-05, REQ-27; dueño envía, Administrador aprueba o rechaza con motivo |
| Carga genérica | Decisión técnica del Release 01 | Modelo de procesos existente; validación, autorización, auditoría e idempotencia; no escribir estados de aprobación directamente |

El texto fuente de REQ-10/11/17/28/36/52 se transcribe en `docs/especificacion.md`. Las decisiones de este documento —entre ellas el formato de carga y el modo de producir artefactos autónomos— son diseño del Release 01, no texto de v13.

## 1. Árbol interno Macroproceso → Proceso

- Disponible a cualquier usuario autenticado, conforme REQ-18. Es una superficie de navegación interna, no la publicación pública.
- Presenta macroprocesos en el orden configurado. Expandir muestra procesos asociados, agrupables por tipo. Indica por macroproceso la cantidad de procesos y de tipos representados.
- Un proceso abre la ficha existente y conserva todos los campos requeridos por REQ-06, responsable vigente y estado.
- Versiones históricas no se cuentan como procesos adicionales. Los elementos de navegación representan el proceso y su versión de trabajo/efectiva solo conforme a los estados reales persistidos; no fabricar datos.
- Reutilizar proceso, catálogos y UI kit existentes. Consulta es de solo lectura; las capacidades de edición no cambian por añadir árbol.

**Aceptación:** usuarios autenticados de cada perfil ven la estructura completa; perfiles autorizados abren una ficha; grupos y contadores coinciden con datos Oracle y respetan orden/tipo; una llamada directa sin sesión recibe 401; desactivar catálogo no oculta ni reescribe referencias históricas fuera de las reglas REQ-04/51; teclado y diseño adaptable funcionan sin desplazamiento horizontal desde 360 px.

## 2. Registro y consulta de riesgos

- El Gestor de riesgos registra uno o más riesgos asociados a procesos existentes, cada uno con descripción, causa, consecuencia, tipo y nivel.
- El dueño responsable puede consultar los riesgos de sus propios procesos.
- Consulta no puede consultar riesgos ni datos de riesgo mediante ficha, árbol, búsquedas, exportaciones, API directa u otra ruta lateral. La autorización se verifica en servidor por cada solicitud; ocultar acciones no basta.
- Los niveles iniciales son Bajo, Medio, Alto y Crítico. El nivel se define por criterio experto, sin matriz de riesgo; se muestra con etiqueta y color y es obligatorio para guardar.
- El Administrador gestiona listas configurables de tipos de riesgo, niveles de riesgo y tipos de documento. Los valores nuevos quedan disponibles de inmediato; los valores ya usados se desactivan, no se borran. Los estados de procesos y acciones son fijos y no configurables. El catálogo de tipos de documento forma parte de REQ-28; no se añaden asociación ni carga de documentos.
- Esta entrega excluye el tratamiento de riesgos y cualquier workflow adicional a registrar/consultar que no esté confirmado por el texto original.
- El Gestor registra; el dueño consulta únicamente riesgos de sus procesos; Consulta no ve riesgos. No se conceden permisos adicionales por inferencia. Datos y API de riesgo permanecen fuera de la proyección pública, exportaciones HTML/JSON y mapa.

**Diseño mínimo:** entidad de riesgo relacionada por FK al proceso y referencias a catálogos configurables de tipo y nivel; API autenticada de registro/consulta y políticas explícitas en el backend existente. No se agrega historial ni ciclo de tratamiento de riesgos.

**Aceptación:** Gestor registra riesgo con los cinco campos y referencias válidas; falta de nivel se rechaza; se ofrecen los cuatro niveles iniciales y el Administrador puede mantener listas sin eliminar valores usados; responsable consulta únicamente riesgos ligados a sus procesos propios; dueño ajeno y Consulta reciben 403 por llamadas directas; entradas inválidas se rechazan; riesgos no aparecen en HTML/JSON ni mapa; auditoría no incorpora PII innecesaria.

## 3. Exportaciones independientes y mapa navegable público

- Solo un Administrador autenticado puede solicitar la generación de los artefactos. La autorización se verifica también en el servidor.
- El HTML es un sitio estático navegable y el JSON es un archivo autónomo. Cada uno funciona sin API ni conexión a base de datos; pueden consultarse sin iniciar sesión una vez generados y distribuidos como archivos estáticos.
- La proyección incluye únicamente macroprocesos, tipos y nombres de procesos con estado efectivo persistido `Vigente`; macroprocesos siguen el orden definido por el Administrador. Se agrupan procesos por tipo y se presenta siempre la ruta de navegación. El significado de la estructura se expresa con texto/etiquetas y no depende solo del color.
- La allowlist de salida contiene exclusivamente los nombres de macroproceso, tipo y proceso Vigente, y la ruta que resulta de esa jerarquía. No incluye riesgos, responsables, unidades internas, correos, documentos, relaciones, detalles de ficha, identificadores internos ni estados o campos adicionales.
- No incluir Borrador, En revisión, Obsoleto, procesos descartados ni versiones no efectivas. No publicar un estado ni un dato Vigente por importación o escritura directa.
- HTML/JSON tienen el mismo contenido de estructura. Escapar texto HTML y serializar JSON como datos; no insertar texto aportado por usuarios como código. Los archivos no hacen peticiones posteriores a la API ni a la base.
- Esta propuesta no establece publicación numerada, snapshots históricos, URL permanente/versionada, workflow de publicación ni retención de ediciones. La generación produce los artefactos con los datos Vigentes consultados al momento.
- Cambios de nombre/orden de macroproceso se reflejan en la exportación siguiente conforme REQ-02.

**Aceptación:** solo Administrador puede generar; usuario no administrador recibe 403 y no autenticado 401; proceso Vigente aprobado aparece; Borrador/En revisión/Obsoleto no aparece; HTML/JSON contienen exclusivamente la allowlist y la misma jerarquía; ambos artefactos se abren sin sesión, API ni base de datos; ruta de navegación siempre visible en HTML; texto mantiene significado sin color; no hay riesgos, fichas, datos personales ni campos no autorizados; pruebas confirman escape; teclado y WCAG 2.2 AA conforme REQ-32.

## Flujo REQ-07 para poblar Vigentes

El dueño responsable envía un Borrador a revisión si tiene nombre, macroproceso y tipo conforme REQ-05. El Administrador puede aprobarlo —una aprobación basta, incluso si editó el proceso— y pasa a Vigente; guardar quién aprobó y cuándo, y registrar la decisión en AUDIT. El Administrador también puede rechazarlo; el rechazo exige motivo, vuelve a Borrador y el motivo queda visible para el dueño.

Verificar estado y revisión vigentes del servidor dentro de la transacción. Guardar el estado, metadatos de aprobación/rechazo y auditoría atómicamente. Rechazar un motivo vacío, y rechazar por 403 toda aprobación o rechazo por actor que no sea Administrador. No se permiten cargas, seeds ni endpoints que asignen `Vigente` directamente.

## 4. Carga de contenido genérico

- El paquete contiene procesos genéricos propios del contexto de una institución estatal chilena, sin datos reales de una institución, personas o unidades, y sin etiquetas visibles de prueba. Los nombres se redactan como contenido funcional normal conforme C-001.
- **Decisión técnica del release:** paquete JSON UTF-8 versionado, identificado por `schemaVersion`, validado contra un esquema versionado en el repositorio. Cada proceso incluye una clave de origen estable para idempotencia, nombre y referencias a macroproceso y tipo existentes; puede incluir campos de contenido de REQ-06. El paquete no incluye IDs de base de datos, personas, responsable, auditoría ni estado del proceso.
- La carga crea procesos en Borrador por medio de los servicios y validaciones normales; genera códigos y asigna responsable conforme a REQ-05 en el servidor. No importa estado Vigente ni evita envío, aprobación o rechazo.
- No se crean perfiles, permisos, macroprocesos, tipos o listas distintos de los definidos por requisitos. El contenido solo hace referencia a catálogos requeridos que ya estén cargados; no infiere sus valores.
- La carga es explícita, idempotente y auditada; no sobrescribe contenido editado por usuarios ni borra historial/auditoría. Una clave repetida con el mismo contenido no duplica registros; si la clave existe con contenido distinto, se informa conflicto sin sobrescribir. La ejecuta un actor autorizado y no se incorpora al arranque automático.

**Aceptación:** validar versión/esquema, campos obligatorios y referencias antes de escribir; segunda carga idéntica no duplica; colisión con datos distintos se informa sin sobrescritura; los procesos nuevos quedan Borrador y solo pueden llegar a Vigente mediante REQ-07; no aparecen datos reales ni etiquetas de prueba; auditoría conservada.

## Diseño mínimo reutilizando lo implementado

- Una aplicación Angular/NestJS y Oracle existente; no añadir servicios, librerías de interfaz ni una aplicación separada para publicar.
- Árbol interno consume lectura autorizada de procesos/catálogos y navega a la ficha existente. Mantener la interfaz existente y el kit en `frontend/src/app/shared/ui/`; importarlo por su API pública y no reemplazar sus estilos, componentes ni diálogo.
- Separar explícitamente endpoints internos autenticados y proyección pública de lectura. API interna de riesgos siempre autenticada y autorizada. La superficie pública no acepta escrituras ni comparte endpoints privilegiados.
- Persistencia propuesta: reutilizar `PROCESS`, `PROCESS_VERSION`, catálogos y perfiles; añadir con migraciones versionadas la entidad relacionada de riesgo y referencias a tipos/niveles configurables si el esquema actual no las cubre. Extender el flujo existente para envío, aprobación y rechazo, guardando actor, fecha y motivo necesario. No se altera migración aplicada ni se introduce edición/versionado de Vigentes.
- Registrar aprobación, rechazo, cambios de riesgo y carga en AUDIT conforme a permisos actuales. Toda escritura de estado, motivo, auditoría y datos relacionados debe ser atómica; validar estado/revisión del servidor y bloqueo apropiado al decidir. La salida pública usa allowlist explícita y una proyección común para HTML/JSON.
- El Administrador genera los dos artefactos mediante una operación autenticada. Tras la generación se distribuyen como archivos estáticos autónomos; ni HTML ni JSON dependen de endpoints públicos ni consultan Oracle.
- Importación propuesta mediante operación del backend autenticada y autorizada para Administrador; valida el paquete y ejecuta la creación normal sin modificar registros existentes. `synchronize: false`, cuenta de ejecución con privilegios mínimos y grants limitados a objetos requeridos.
- Mantener `synchronize: false`, SQL parametrizado, restricciones FK/UNIQUE apropiadas, escape de salida y los controles existentes de sesión/CSRF/autorización. El mapa público no amplía permisos de lectura de ficha ni riesgo.

## Verificaciones diferidas antes de producción

El alcance aprobado no equivale a liberación ni a conformidad total. Antes de producción registrar: transcripción/revisión de los requisitos fuente y conformidad del responsable (PT-03/04); recreación desde cero en pruebas (PT-05); pruebas directas de permisos y regresión de cada perfil (PT-07); entradas maliciosas y SAST (PT-08); sesiones, CSRF y expiración (PT-09); DAST, CSP/HSTS y mensajes seguros (PT-10); detección de secretos (PT-11); dependencias (PT-12); cifrado, control de acceso y restauración de backups (PT-13); grants mínimos (PT-14); compatibilidad con Oracle institucional; HTTPS (REQ-30); revisión legal de datos personales (REQ-35); carga a 20 usuarios y umbral REQ-31; WCAG 2.2 AA (REQ-32); adaptación a 360 px (REQ-33); restauración de backup (REQ-34). No declarar ejecutada ninguna de estas verificaciones por este documento.

## Revisión pendiente

La transcripción de v13 y las decisiones de alcance solicitadas están incorporadas; no quedan preguntas abiertas sobre niveles, permisos básicos, campos públicos, rechazo o formato de carga. El documento sigue siendo una propuesta pendiente de revisión y no autoriza implementación. No se declara completo ningún requisito parcialmente implementado; las verificaciones de producción enumeradas arriba siguen pendientes hasta que se ejecuten y registren.
