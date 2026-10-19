# Especificación funcional del MVP v14

## Autoridad y alcance

La fuente de verdad es `docs/referencias/Requisitos_Sistema_Procesos_v14.xlsx`, aprobada por el responsable del producto. Este documento organiza los 26 requisitos con prioridad **Imprescindible**. No agrega alcance ni sustituye las validaciones de la planilla.

El MVP incluye 17 requisitos Imprescindibles activos: estructura fija inicial, administración de procesos por un único operador, unidades, riesgos como información de ficha, relaciones, búsqueda, coherencia, respaldo, HTTPS y protección de datos. Es un piloto sin inicio de sesión, perfiles ni controles de acceso.

Por decisión del responsable se postergan REQ-25, REQ-26, REQ-27, REQ-07, REQ-09, REQ-56, REQ-36, REQ-17 y REQ-52. Los seis primeros requieren identidad, perfiles, autorización o trazabilidad por usuario; los tres últimos dependen de REQ-07. Se conservan abajo solo para trazabilidad. Los requisitos **Importante** y **Deseable** también quedan fuera del MVP.

Los documentos de release e incrementos anteriores son antecedentes históricos y no autorizan comportamiento que contradiga esta especificación. Antes de implementar, se debe alinear el diseño técnico y registrar las verificaciones conforme a `AGENTS.md`.

## Requisitos Imprescindibles

### REQ-01 — Jerarquía del mapa

Los procesos se organizan jerárquicamente en Tipos de Macroprocesos → Macroprocesos → Tipos de Proceso → Procesos. Inicialmente existen tres Tipos de Macroprocesos: Estratégicos, Misionales y De apoyo.

- Al instalar el sistema existen los tres Tipos de Macroprocesos iniciales, en este orden: Estratégicos, Misionales y De apoyo.
- Cada Macroproceso pertenece a un Tipo de Macroproceso.
- Todo Tipo de Proceso pertenece a un Macroproceso.
- Todo proceso pertenece a un Tipo de Proceso.

**Depende de:** sin dependencias declaradas.

### REQ-02 — Estructura inicial fija

El sistema carga una estructura inicial de Tipos de Macroprocesos y Macroprocesos. Esta estructura se mantiene fija durante el MVP.

- Al instalar el sistema existen los tres Tipos de Macroprocesos iniciales, en este orden: Estratégicos, Misionales y De apoyo.
- Cada Macroproceso pertenece a un Tipo de Macroproceso.
- Todo Tipo de Proceso pertenece a un Macroproceso.
- Todo proceso pertenece a un Tipo de Proceso.
- Durante el MVP no hay creación, edición, desactivación ni reordenamiento de Tipos de Macroprocesos o Macroprocesos.

**Depende de:** REQ-01.

### REQ-04 — Protección de la estructura fija

El sistema no permite crear, editar ni desactivar Tipos de Macroprocesos o Macroprocesos durante el MVP.

- La estructura inicial se conserva como referencia estable durante el MVP.
- Error: el sistema no ofrece acciones ni pantallas para crear, editar, desactivar o reordenar Tipos de Macroprocesos o Macroprocesos.
- Las solicitudes de cambio se registran fuera del sistema para una versión posterior.

**Depende de:** REQ-01.

### REQ-51 — Tipos de proceso

El administrador crea, edita y desactiva tipos de proceso dentro de un macroproceso específico.

- Cada tipo de proceso pertenece a un solo macroproceso.
- Cada proceso pertenece a un solo tipo de proceso y este pertenece al mismo macroproceso.
- Los tipos se administran en el sistema, sin cambiar el código.
- Error: no se puede desactivar un tipo que tenga procesos activos; el sistema indica cuántos procesos hay que reclasificar.

**Depende de:** sin dependencias declaradas.

### REQ-54 — Unidades internas

El administrador gestiona unidades internas en una estructura jerárquica.

- La estructura permite jerarquías de unidades, por ejemplo: Vicerrectorías, Direcciones y otras unidades dependientes.
- Cada unidad puede tener una unidad superior, salvo las unidades de nivel superior.
- Una unidad no se borra; se desactiva. Los procesos asociados la siguen mostrando como inactiva hasta que se actualicen.
- Error: no se puede asociar un proceso a una unidad inactiva.

**Depende de:** sin dependencias declaradas.

### REQ-05 — Creación y edición de procesos

El Dueño de proceso crea y edita procesos dentro de un macroproceso. Quien crea el proceso no necesariamente es la persona o el cargo responsable de este.

- El usuario que crea el proceso queda registrado como su elaborador; la persona o cargo responsable del proceso se registra de forma independiente.
- Cada proceso pertenece a un solo macroproceso y a un solo tipo de proceso.
- El sistema asigna el código automáticamente; es único y no se modifica.
- Se puede guardar como Borrador incompleto y terminarlo después.
- Para enviarlo a revisión debe tener, como mínimo: nombre; macroproceso y tipo; descripción y objetivo; alcance con inicio y término; una unidad responsable activa; persona o cargo responsable; y al menos una entrada y una salida.
- Antes del envío, el sistema muestra posibles duplicados con nombre o alias similar dentro de la misma clasificación, para que el elaborador los revise.
- Error: si falta un campo mínimo, el sistema impide el envío a revisión e indica qué información falta.

**Depende de:** REQ-01; REQ-51.

### REQ-06 — Ficha de proceso

Cualquier usuario del sistema ve la ficha de cada proceso con: código (ID del proceso), nombre, alias, descripción, objetivo, alcance, macroproceso, tipo, proceso padre, tipo de subproceso, subprocesos (cuando corresponda), unidades internas, área de negocio, responsable, involucrados, entradas, salidas, proveedores, clientes, documentos, sistemas utilizados, indicadores, oportunidades de mejora, criticidad, grado de automatización, periodicidad, cuándo inicia, cuándo termina, plan de desarrollo, operación del proceso, diseño del proceso, validación del proceso, estado y modelo del proceso (BPMN).

- Al abrir la ficha se ven todos los campos y siempre el responsable vigente.
- El estado del proceso se muestra siempre en la ficha.

**Depende de:** REQ-05.

### REQ-55 — Unidades responsables y participantes

El dueño de proceso asocia su proceso con una unidad responsable obligatoria y con una o más unidades participantes.

- Un proceso tiene exactamente una unidad responsable y puede tener varias unidades participantes; una unidad puede participar en varios procesos.
- Cada asociación identifica si la unidad es responsable o participante y, para las participantes, especifica su función en el proceso.
- Las unidades y sus roles se ven en la ficha del proceso.
- Error: no se puede asociar dos veces la misma unidad a un proceso.
- Error: no se puede enviar un proceso a revisión sin una unidad responsable activa.

**Depende de:** REQ-05; REQ-54.

### REQ-07 — Revisión y validación

**Estado: postergado.** Requiere perfiles, una identidad verificable y asignación de Revisor/Validador. No forma parte del piloto de operador único.

El Revisor/Validador asignado aprueba o rechaza los procesos enviados a revisión.

- Estados del proceso: Borrador, En revisión, Vigente, Obsoleto.
- El Administrador asigna un Revisor/Validador activo a cada macroproceso. Todo proceso, su nueva versión o su retiro utiliza la asignación vigente de su macroproceso.
- El Dueño de proceso elabora el Borrador y lo envía a revisión.
- El Revisor/Validador asignado debe ser una persona distinta de quien elaboró el proceso; revisa el contenido y, al aprobarlo, realiza la validación final.
- Al aprobar, el proceso pasa a Vigente y se guarda quién revisó, validó y cuándo. Para el MVP basta un Revisor/Validador asignado.
- Al rechazar, vuelve a Borrador con un motivo visible para quien lo elaboró.
- Error: un rechazo sin motivo no se acepta.
- Error: nadie puede revisar, validar ni aprobar un proceso que haya elaborado.
- Error: un usuario sin perfil Revisor/Validador asignado no puede aprobar ni rechazar.

**Depende de:** REQ-05.

### REQ-56 — Versiones y retiro

**Estado: postergado.** Depende de REQ-07 y REQ-09, ambos fuera del piloto.

Los cambios a un proceso Vigente y su retiro siguen el mismo control de revisión y validación.

- Al editar un proceso Vigente se crea una nueva versión en Borrador; la versión Vigente sigue rigiendo hasta que el Revisor/Validador asignado apruebe la nueva.
- Al aprobarse, la nueva versión pasa a Vigente y la anterior queda en el historial de cambios.
- La solicitud para retirar un proceso y marcarlo como Obsoleto se revisa y valida con el mismo flujo; no depende solo del Administrador.
- El Dueño de proceso puede descartar un Borrador que nunca fue Vigente (queda desactivado, no se borra).
- Error: quien elaboró el cambio o la solicitud de retiro no puede validarla.

**Depende de:** REQ-07; REQ-09.

### REQ-09 — Historial de cambios

**Estado: postergado.** El piloto no registra historial por usuario ni roles de revisión/validación.

El dueño de proceso ve el historial de cambios de su proceso.

- Se ve cada versión del proceso con su número, fecha, quién realizó el cambio, qué cambió y quién lo revisó o validó.

**Depende de:** REQ-05.

### REQ-10 — Riesgos por proceso

El Dueño de proceso registra uno o más riesgos como información de la ficha de su proceso, con descripción, causa, consecuencia, tipo y nivel.

- Cada riesgo queda vinculado al proceso y aparece en su ficha.
- En el MVP los riesgos solo se registran como parte de la información del proceso; no existe un módulo independiente de gestión de riesgos.
- El sistema no incluye controles, planes de tratamiento, responsables de acciones ni seguimiento de acciones de riesgo.

**Depende de:** REQ-05.

### REQ-11 — Nivel de riesgo manual

El Dueño de proceso ingresa manualmente el nivel de cada riesgo, eligiéndolo de una lista (Bajo, Medio, Alto, Crítico).

- En el MVP no hay matriz de riesgo ni cálculo automático: el nivel se ingresa por criterio del usuario.
- La lista se entrega predefinida: Bajo, Medio, Alto y Crítico; en el MVP no hay pantalla para modificarla.
- El nivel se muestra con etiqueta y color.
- Error: sin nivel, el riesgo no se guarda.

**Depende de:** REQ-10.

### REQ-14 — Relaciones entre procesos

El dueño de proceso relaciona su proceso con otros procesos, indicando el tipo y la dirección de la relación, y una descripción obligatoria de cómo se relacionan.

- Cada relación identifica el proceso de origen, el proceso de destino, el tipo de relación y una descripción que explique el intercambio, por ejemplo, información o resultados que utiliza el otro proceso.
- La dirección de la relación se muestra de forma explícita.
- Puede relacionar procesos de cualquier macroproceso o tipo.
- Error: no se permite relacionar procesos consigo mismo ni repetir una relación.

**Depende de:** REQ-05.

### REQ-15 — Consulta de relaciones

Cualquier usuario del sistema ve en la ficha los procesos relacionados, con el tipo, la dirección y la descripción de la relación, y navega a ellos con un clic.

- Para cada relación se muestran el proceso de origen, el proceso de destino, el tipo, la dirección y la descripción.
- Si existe una relación de A hacia B, la ficha de B muestra la relación indicando que proviene de A.

**Depende de:** REQ-14.

### REQ-19 — Búsqueda

Cualquier usuario del sistema puede buscar un proceso por su clasificación en el mapa, unidad responsable, código del proceso, nombre, descripción o responsable del proceso.

- Se muestran los procesos y, para quien puede verlos, los riesgos que coinciden.
- La búsqueda no distingue mayúsculas ni tildes.

**Depende de:** REQ-05.

### REQ-25 — Autenticación institucional

**Estado: postergado; candidato a eliminación del producto.** No se implementa ni se declara cumplido en este MVP.

Los usuarios del sistema ingresan con su cuenta de Google Workspace institucional.

- El usuario entra con su cuenta Google y obtiene el perfil asignado.
- Google verifica quién es la persona; los perfiles se manejan dentro del sistema.
- Error: una cuenta fuera del dominio institucional no puede ingresar.

**Depende de:** sin dependencias declaradas.

### REQ-26 — Perfiles y asignación de validador

**Estado: postergado.** El piloto tiene un único operador y no implementa perfiles ni autorización por identidad.

El administrador asigna perfiles a los usuarios: Administrador, Dueño de proceso, Revisor/Validador y Consulta. El permiso para editar un proceso se controla mediante estos perfiles y es independiente de la persona o cargo responsable del proceso.

- Una persona puede tener más de un perfil.
- Un usuario que entra por primera vez queda con perfil Consulta (mínimo privilegio).
- El Administrador gestiona usuarios y perfiles, y asigna un Revisor/Validador activo a cada macroproceso.
- El Administrador no puede aprobar un proceso salvo que tenga además el perfil Revisor/Validador y esté asignado al macroproceso correspondiente.
- El Dueño de proceso elabora y edita sus procesos; no puede revisarlos ni validarlos.
- El Revisor/Validador revisa y valida los procesos del macroproceso que tiene asignado, siempre que no los haya elaborado.
- El cargo o la persona responsable del proceso se registra de forma independiente del usuario que puede editarlo; no otorga por sí solo permisos de edición.
- Error: un usuario no puede cambiar su propio perfil.
- Error: no se puede quitar el perfil Administrador al último administrador.

**Depende de:** REQ-25.

### REQ-27 — Auditoría

**Estado: postergado.** El piloto no puede satisfacer la trazabilidad por usuario, revisor y validador exigida por este requisito.

El administrador consulta el registro de auditoría de los cambios.

- Se ve fecha, usuario que realizó el cambio, acción, elemento afectado, valores antes y después, usuario que revisó el cambio y usuario que aprobó la modificación.
- Para cada cambio de un proceso, el historial incluye además la versión del proceso y quién lo elaboró, revisó o validó.
- Identifica a las personas por un identificador interno, no por nombre ni correo, para poder anonimizarlas sin modificar el registro.
- El registro no se puede modificar ni borrar, y se conserva mientras exista el sistema.

**Depende de:** REQ-25.

### REQ-29 — Coherencia de datos

El sistema mantiene siempre la coherencia entre macroprocesos, tipos, procesos, unidades participantes, riesgos y relaciones.

- Error: no es posible dejar procesos sin macroproceso, procesos vigentes sin tipo, riesgos sin proceso, ni relaciones hacia procesos o unidades internas inexistentes.

**Depende de:** REQ-05; REQ-10; REQ-14; REQ-51; REQ-55.

### REQ-34 — Respaldo y restauración

Disponibilidad y respaldo: copia de seguridad diaria que se puede restaurar.

- Se prueba una restauración al menos una vez antes de producción.

**Depende de:** sin dependencias declaradas.

### REQ-30 — HTTPS

Seguridad: toda la comunicación va cifrada (HTTPS).

- Error: un acceso por HTTP se redirige a HTTPS.

**Depende de:** sin dependencias declaradas.

### REQ-35 — Datos personales

Cumplimiento: el tratamiento de datos personales cumple la normativa vigente (Ley 19.628 y Ley 21.719).

- Solo se guardan los datos personales necesarios: nombre y correo institucional de los usuarios, y la dirección IP en los eventos de seguridad.
- Los atributos de la ficha que nombran participantes (por ejemplo, involucrados) se registran por cargo o unidad. Las personas se registran solo cuando corresponda al responsable, elaborador, Revisor/Validador o modificador del proceso.
- Revisión legal breve antes de salir a producción.

**Depende de:** sin dependencias declaradas.

### REQ-36 — Generación de exportación pública

**Estado: postergado.** Depende de REQ-07; el piloto no implementa su control de generación por Administrador.

El administrador genera la exportación del mapa de procesos (sitio HTML estático y archivo JSON), separada del sistema de administración.

- La exportación funciona sola, sin conectarse al sistema de administración ni a su base de datos.
- Contiene solo el mapa; es la única información que se expone fuera del sistema.
- Solo incluye procesos Vigentes.
- Error: un usuario que no es administrador no puede generar la exportación.

**Depende de:** REQ-07.

### REQ-17 — Navegación de la exportación

**Estado: postergado.** Depende de REQ-36, que queda fuera del piloto.

La exportación muestra el mapa de procesos y permite navegar Tipo de Macroproceso → Macroproceso → Tipo de Proceso → Proceso.

- Los macroprocesos se muestran en el orden de la configuración inicial del MVP.
- Siempre se ve la ruta de navegación (dónde estoy).
- El significado no depende solo del color.

**Depende de:** REQ-02; REQ-36.

### REQ-52 — Publicación mínima

**Estado: postergado.** Depende de REQ-36, que queda fuera del piloto.

La exportación del mapa muestra solo la estructura, sin detalle.

- Se puede ver sin iniciar sesión.
- Muestra únicamente macroprocesos, tipos y nombres de procesos Vigentes.
- Se genera desde una lista explícita de campos permitidos: un campo nuevo no se publica salvo que se agregue a esa lista.
- Error: no incluye riesgos, responsables, unidades internas, correos, documentos ni relaciones.

**Depende de:** REQ-36.

## Reglas de alcance del MVP

- Los cambios a Tipos de Macroprocesos y Macroprocesos se solicitan y gestionan fuera del sistema durante el MVP.
- Los riesgos son datos de la ficha del proceso; no existe módulo independiente, matriz, controles, acciones, responsables de acciones ni seguimiento de tratamiento.
- La lista de nivel de riesgo es fija: Bajo, Medio, Alto y Crítico. No existe una pantalla para modificarla.
- El piloto tiene un único operador y no incorpora inicio de sesión, perfiles, autorización ni auditoría por usuario. Esta excepción no declara cumplidos REQ-25, REQ-26, REQ-27, REQ-07, REQ-09 ni REQ-56.
- La exportación pública queda postergada porque sus requisitos REQ-36, REQ-17 y REQ-52 dependen de REQ-07.

## Estado de implementación

Esta especificación define el producto objetivo del MVP, no una declaración de funcionalidad ya entregada. La implementación, pruebas y evidencia de cada requisito se registran en los cambios correspondientes. No se declara cumplido ningún requisito antes de verificar todos sus criterios aplicables.
