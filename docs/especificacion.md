# Especificación de la primera entrega

## Autoridad y alcance

La planilla Requisitos_Sistema_Procesos_v13.xlsx es la fuente de verdad. Este documento concreta la entrega aprobada sin modificarla. Sustituye el borrador anterior. No hay preguntas de requisitos pendientes para el responsable del producto.

Entrega: administración interna de procesos, desde ingreso y configuración hasta creación, revisión, aprobación, consulta, actualización y retiro. Aplican todos los PT de AGENTS.md.

## Requisitos y criterios de aceptación

Los siguientes textos y validaciones se transcriben íntegramente de v13. Una función posterior mencionada por un criterio no se considera implementada por mostrar un campo vacío. Su comprobación se realiza cuando se incorpora la función correspondiente; no impide implementar ahora el resto del requisito. No declarar cumplimiento total antes de verificar todos sus criterios aplicables.

### REQ-25

Los usuarios del sistema ingresan con su cuenta de Google Workspace institucional.

• El usuario entra con su cuenta Google y obtiene el perfil asignado.
• Google verifica quién es la persona; los perfiles se manejan dentro del sistema.
• Error: una cuenta fuera del dominio institucional no puede ingresar.

**Depende de:** sin dependencias declaradas.

### REQ-26

El administrador asigna perfiles a los usuarios: Administrador, Dueño de proceso, Gestor de riesgos y Consulta.

• Una persona puede tener más de un perfil.
• Un usuario que entra por primera vez queda con perfil Consulta (mínimo privilegio).
• El Administrador puede editar cualquier proceso (por ejemplo, para la carga inicial).
• Error: un dueño de proceso no puede editar procesos ajenos, ni desde la pantalla ni llamando directamente al sistema; los ve en modo lectura.
• Error: un usuario no puede cambiar su propio perfil.
• Error: no se puede quitar el perfil Administrador al último administrador.

**Depende de:** REQ-25.

### REQ-01

Los procesos se organizan en macroprocesos. Inicialmente son tres: Estratégicos, Misionales y de Apoyo.

• Al instalar el sistema existen los tres macroprocesos iniciales, en este orden: Estratégicos, Misionales y de Apoyo.
• Todo proceso pertenece a un macroproceso.

**Depende de:** sin dependencias declaradas.

### REQ-02

El administrador crea, edita y desactiva macroprocesos (nombre, descripción y orden).

• El cambio se ve de inmediato en la administración y se incluye en la siguiente exportación del mapa.
• El orden define cómo se muestran los macroprocesos en el mapa.
• El cambio queda en el registro de auditoría.
• El sistema asigna el código automáticamente; es único y no se modifica.

**Depende de:** REQ-01.

### REQ-04

El administrador no puede desactivar un macroproceso que tenga procesos activos.

• Ningún registro se borra físicamente; solo se desactiva.
• Error: al intentar desactivar un macroproceso con procesos activos, el sistema lo impide e indica cuántos procesos hay que mover primero.

**Depende de:** REQ-02.

### REQ-51

El administrador crea, edita y desactiva tipos de proceso.

• Cada proceso pertenece a un solo tipo.
• El tipo es un atributo del proceso y sirve para agruparlos: un tipo puede reunir procesos de cualquier macroproceso.
• Los tipos se administran en el sistema, sin cambiar el código.
• Error: no se puede desactivar un tipo que tenga procesos activos; el sistema indica cuántos procesos hay que reclasificar.

**Depende de:** sin dependencias declaradas.

### REQ-05

El dueño de proceso crea y edita procesos dentro de un macroproceso.

• Quien crea el proceso queda como su responsable (dueño). El administrador puede reasignarlo a otro usuario con perfil Dueño de proceso.
• Un proceso es «propio» de quien figura como su responsable.
• Cada proceso pertenece a un solo macroproceso y a un solo tipo de proceso.
• El sistema asigna el código automáticamente; es único y no se modifica.
• Se puede guardar como borrador incompleto y terminarlo después.
• Para enviarlo a revisión basta con que tenga nombre, macroproceso y tipo.

**Depende de:** REQ-01; REQ-51.

### REQ-06

Cualquier usuario del sistema ve la ficha de cada proceso con: código (ID del proceso), nombre, alias, descripción, objetivo, alcance, macroproceso, tipo, proceso padre, tipo de subproceso, unidades internas, área de negocio, responsable, involucrados, entradas, salidas, proveedores, clientes, criticidad, grado de automatización, periodicidad, cuándo inicia, cuándo termina, plan de desarrollo, operación del proceso, diseño del proceso, validación del proceso, estado y modelo del proceso (BPMN).

• Al abrir la ficha se ven todos los campos y siempre el responsable vigente.
• El estado del proceso se muestra siempre en la ficha.

**Depende de:** REQ-05.

### REQ-07

El administrador aprueba o rechaza los procesos enviados a revisión.

• Estados del proceso (fijos): Borrador, En revisión, Vigente, Obsoleto.
• El dueño envía un Borrador a revisión.
• Al aprobar, el proceso pasa a Vigente y se guarda quién aprobó y cuándo. Basta una aprobación.
• Al rechazar, vuelve a Borrador con un motivo visible para el dueño.
• Error: un rechazo sin motivo no se acepta.
• El administrador puede aprobar procesos que él mismo editó; la aprobación queda en el registro de auditoría.
• Error: un usuario que no es administrador no puede aprobar ni rechazar.

**Depende de:** REQ-05.

### REQ-09

El dueño de proceso ve el historial de cambios de su proceso.

• Se ve cada versión con fecha, usuario y qué cambió.

**Depende de:** REQ-05.

### REQ-56

Los cambios a un proceso Vigente y su retiro siguen el mismo control de aprobación.

• Al editar un proceso Vigente se crea una nueva versión en Borrador; la versión Vigente sigue rigiendo hasta que se apruebe la nueva.
• Al aprobarse, la nueva versión pasa a Vigente y la anterior queda en el historial de cambios.
• El administrador marca un proceso Vigente como Obsoleto; eso equivale a desactivarlo.
• El dueño puede descartar un Borrador que nunca fue Vigente (queda desactivado, no se borra).
• Error: un usuario que no es administrador no puede marcar un proceso como Obsoleto.

**Depende de:** REQ-07; REQ-09.

### REQ-18

Cualquier usuario del sistema ve la estructura completa en forma de árbol desplegable: Macroproceso → Proceso.

• Al expandir un macroproceso se ven sus procesos, que se pueden agrupar por tipo.
• Cada macroproceso indica cuántos procesos tiene y de cuántos tipos (por ejemplo: 12 procesos, 3 tipos).
• Es la forma de navegar dentro de la administración; el mapa gráfico está en la exportación.

**Depende de:** REQ-05; REQ-51.

### REQ-19

Cualquier usuario del sistema busca por código, nombre, descripción o responsable.

• Se muestran los procesos y, para quien puede verlos, los riesgos que coinciden.
• La búsqueda no distingue mayúsculas ni tildes.

**Depende de:** REQ-05.

### REQ-27

El administrador consulta el registro de auditoría de los cambios.

• Se ve fecha, usuario, acción, elemento afectado y valores antes y después.
• Identifica a las personas por un identificador interno, no por nombre ni correo, para poder anonimizarlas sin modificar el registro.
• El registro no se puede modificar ni borrar, y se conserva mientras exista el sistema.

**Depende de:** REQ-25.

### REQ-30

Seguridad: toda la comunicación va cifrada (HTTPS).

• Error: un acceso por HTTP se redirige a HTTPS.

**Depende de:** sin dependencias declaradas.

### REQ-35

Cumplimiento: el tratamiento de datos personales cumple la normativa vigente (Ley 19.628 y Ley 21.719).

• Solo se guardan los datos personales necesarios: nombre y correo institucional de los usuarios, y la dirección IP en los eventos de seguridad.
• Los atributos de la ficha que nombran participantes (por ejemplo, involucrados) se registran por cargo o unidad, no por persona; la única persona en la ficha es el responsable.
• Revisión legal breve antes de salir a producción.

**Depende de:** sin dependencias declaradas.

### REQ-44

Se registran los eventos de seguridad: ingresos, ingresos rechazados, accesos denegados y cambios de perfil.

• Cada evento guarda fecha, usuario, IP y resultado.
• Los registros no contienen tokens, claves ni datos personales innecesarios.
• Error: 5 accesos denegados del mismo usuario en 10 minutos generan una alerta al administrador.

**Depende de:** REQ-27.

### REQ-45

El sistema de administración está protegido contra abuso.

• Error: un exceso de solicitudes desde un mismo origen recibe «demasiadas solicitudes» (429) sin afectar al resto de usuarios.

**Depende de:** REQ-25.

### REQ-49

Las personas pueden ejercer sus derechos sobre sus datos personales (acceso, rectificación, supresión) sin que se pierda el historial auditable.

• Los registros no se borran: el historial y la auditoría identifican a las personas por un identificador interno.
• El administrador puede entregar los datos de una persona.
• A solicitud de la persona, se anonimizan sus datos: se elimina la asociación entre su identificador interno y su nombre, correo e IP; el historial y la auditoría no se modifican.

**Depende de:** REQ-35; REQ-27.

### REQ-31

Velocidad: las pantallas y búsquedas responden en menos de 2 segundos con hasta 20 usuarios simultáneos.

• Se comprueba con una prueba de carga de 20 usuarios antes de salir a producción.

**Depende de:** sin dependencias declaradas.

### REQ-32

Accesibilidad: el sistema y la exportación del mapa cumplen WCAG 2.2 nivel AA (teclado, contraste, etiquetas).

• Revisión automática de accesibilidad sin errores graves, más una revisión manual con teclado.

**Depende de:** sin dependencias declaradas.

### REQ-33

Se usa bien en computador, tablet y celular.

• No aparece desplazamiento horizontal en pantallas desde 360 px.

**Depende de:** sin dependencias declaradas.

### REQ-34

Disponibilidad y respaldo: copia de seguridad diaria que se puede restaurar.

• Se prueba una restauración al menos una vez antes de producción.

**Depende de:** sin dependencias declaradas.

## Aplicación del alcance

- Acceso: Google Workspace verifica identidad; el sistema asigna perfiles. La demo usa exclusivamente identidades ficticias locales. Esa sustitución permite probar permisos, pero no satisface REQ-25.
- Lectura: cualquier usuario autenticado consulta fichas, árbol y búsqueda. No introducir restricciones por estado que REQ-06 no establece.
- Escritura: dueño sobre procesos propios; administrador sobre cualquiera. La responsabilidad se consulta desde el proceso en cada operación.
- Estados: Borrador → En revisión → Vigente; rechazo → Borrador con motivo. Vigente → Obsoleto por Administrador. Editar Vigente crea Borrador conservando la versión vigente hasta aprobar el reemplazo. Descartar el Borrador contemplado por REQ-56 lo desactiva, sin borrarlo.
- No agregar acciones de retirar de revisión ni nuevas prohibiciones de asignación de perfiles. El administrador conserva edición y reasignación.
- Historial: acceso exigido para el dueño; auditoría para Administrador. No deducir acceso al historial a partir del permiso para leer la ficha.
- Estructura: macroprocesos iniciales y tipos administrables. Procesos activos se distinguen de Obsoletos y borradores descartados; las versiones históricas no se cuentan como procesos distintos.
- Ficha: conservar todos los campos de REQ-06. Unidades, documentos/BPMN y relaciones no tienen acciones de carga o asociación en esta entrega. No inventar esas funciones dentro de edición de ficha.
- Búsqueda: código, nombre, descripción y responsable, sin diferencias por mayúsculas/tildes. Los riesgos se incorporan al integrar su módulo y sus permisos.
- Protección de datos: los participantes se expresan por cargo/unidad. El responsable es la única persona de la ficha. Auditoría e historial referencian IDs internos, sin copias de nombre, correo o IP en los valores antes/después.
- Derechos: administrador entrega datos asociados al usuario y anonimiza las asociaciones identificativas, incluidas IP de eventos. Mantiene historial y auditoría.
- Eventos: registrar ingresos, rechazos, denegaciones y perfiles sin secretos. Cinco denegaciones de un usuario en diez minutos producen una alerta persistida visible al Administrador dentro del sistema.

## Controles de diseño verificables

Permisos globales por defecto denegados; políticas explícitas en cada endpoint. Perfiles actuales consultados en cada petición. Cambio y auditoría en una transacción. La protección del último Administrador serializa todas las asignaciones sobre un bloqueo común. Crear/reclasificar procesos y desactivar catálogos comparten protocolo de bloqueo para impedir carreras.

Restricciones UNIQUE para códigos y asignaciones de perfil. Generación de códigos mediante secuencia y prefijo MP o PR; representación decimal de la secuencia, sin reutilización. Los códigos son identificadores opacos, no categorías ni números de versión.

Ediciones y aprobaciones usan revisión técnica optimista: si el cliente envía una revisión anterior, se rechaza con conflicto sin sobrescribir. Aprobar siempre identifica versión y revisión exactas. Cada proceso tiene como máximo una versión de trabajo abierta. El servidor controla transiciones y no acepta estados enviados libremente por el cliente.

Una edición de contenido En revisión, si se realiza por un actor autorizado según REQ-05/REQ-26, actualiza su revisión técnica; una aprobación con revisión antigua falla. No introducir un bloqueo de edición como requisito de producto.

Normalizar búsqueda en aplicación y parametrizar consultas; tratar % y _ como caracteres literales. Rechazar entradas inesperadas y no exponer SQL o trazas. Auditoría INSERT/SELECT para cuenta de ejecución; migraciones con otra cuenta.

## Implementación progresiva

1. Infraestructura local, perfiles simulados, macroprocesos/tipos y auditoría.
2. Ficha, propietarios, versiones, revisión, historial y retiro.
3. Árbol, búsqueda, derechos de datos y eventos/alertas.
4. Integración Google y verificaciones de calidad y seguridad de toda la entrega.

Son incrementos de implementación de un único alcance aprobado. Los respaldos y controles de seguridad se incorporan conforme se crea cada componente; no se dejan para un endurecimiento posterior.

## Evidencia necesaria

Pruebas de permisos invocando API directamente, transacciones y concurrencia en PostgreSQL, transiciones, permanencia de versión vigente, búsquedas, anonimización sin cambios en auditoría, sesiones y límites de solicitudes. Pruebas funcionales Angular del recorrido completo. Ejecutar validaciones y verificaciones originales, incluidas carga de 20 usuarios, accesibilidad y restauración. No presentar la demo como cumplimiento de integración Google o verificación de producción.
