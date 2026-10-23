# Formularios — patrón compartido del design-system

**Revisión:** C-039, 2026-10-22. **Estado:** piloto en evaluación. Aplica R-03, R-05, R-06, R-07 y R-08 de [STD-UX-001](marco_estandar_ux_institucional.md).

## 1. Elegir la composición

| Contexto | Composición | Evitar |
| --- | --- | --- |
| Captura extensa | Formulario nativo con secciones y acciones finales; `.ui-form`, `.ui-form-fields`, `.ui-form-grid`, `.ui-form-actions`. | Encerrar una ficha extensa en un modal o imponer barras fijas sin evaluar espacio y foco. |
| Edición inline | Formulario nombrado dentro del contexto del registro. Aplicar la misma validación, guardado y descarte. | Reemplazarlo por otro registro sin resolver ediciones pendientes. |
| Captura breve modal | `UiDialogService.form()` y un solo host raíz. | Apilar diálogos, añadir lógica HTTP al host o asumir que el modal conserva datos después de resolver su promesa. |

La presentación y los auxiliares pertenecen al kit. Obligatoriedad, longitudes, validaciones de negocio, permisos y persistencia vienen del contrato de cada producto. El kit no define nuevos campos obligatorios.

Aplicar los patrones dentro de `ui-root`. Contador y validación usan el criterio `lengthMode` del contrato consumidor, con UTF-16 como valor predeterminado. En modo `validator` no usar `maxlength` nativo como límite equivalente; validar el texto recortado con el auxiliar compartido. En UTF-16, el atributo nativo limita el texto bruto y puede ser más restrictivo si contiene espacios exteriores. Conservar los límites y criterios del servidor; no normalizar texto ni cambiar la cantidad permitida desde la presentación.

## 2. Anatomía del campo

Cada campo tiene etiqueta visible y asociación `for`/`id`, ayuda cuando aporta información y error junto al control. Usar IDs únicos, incluyendo instancia/registro si hay varios formularios. No usar placeholder como etiqueta ni color/asterisco como única indicación de obligatoriedad.

```html
<div class="field">
  <label for="entry-name">Nombre (obligatorio)</label>
  <small id="entry-name-hint">Utiliza una denominación que permita reconocer el registro.</small>
  <input id="entry-name" name="name" required
    aria-invalid="true"
    aria-describedby="entry-name-hint entry-name-error">
  <p id="entry-name-error" class="field-error">Ingresa el nombre del registro.</p>
</div>
```

Este ejemplo representa el **estado inválido**. En estado inicial o corregido, retirar el error y `aria-invalid`; conservar la asociación con la ayuda. No mostrar un error porque una persona aún no haya terminado de introducir un valor. El consumidor decide validar al salir del campo o al enviar según la tarea; tras un envío fallido, mantiene retroalimentación al corregir.

- Mensaje concreto: qué falta o cómo corregirlo, sin códigos internos ni culpar a la persona.
- Al editar un campo, retirar/recalcular **solo su error**. Otros campos inválidos conservan mensajes y asociaciones.
- Un error remoto general va en `UiMessageComponent`; si puede asociarse con seguridad a un campo, se muestra también allí sin repetir anuncios innecesarios.
- Al enviar con errores, renderizarlos y llamar `focusFirstInvalid(formElement)`. No pasar toda la pantalla cuando contiene otros formularios.
- Si la aplicación implementa validación propia, usar `novalidate` para no competir con mensajes nativos. Conservar `required`/`aria-required` y el comportamiento nativo de los controles.
- Un grupo de casillas se presenta con `fieldset`/`legend`. Un error del grupo puede asociarse al `fieldset` con `tabindex=-1`; no convertir cada casilla en un error independiente si la regla afecta al conjunto.

## 3. Estados y transiciones

| Estado | Campos y acciones | Mensaje y continuidad |
| --- | --- | --- |
| Carga inicial | No presentar un formulario vacío editable como registro ya cargado. | Estado de carga; al fallar, error y reintento. No crear snapshot de edición hasta cargar. |
| Listo, limpio | Controles habilitados; Cancelar sale inmediatamente. | Sin confirmación innecesaria. |
| Editado | Valores conservados y acciones reconocibles. | El consumidor detecta cambios de ese formulario; no depende solo de un botón deshabilitado. |
| Inválido | Campos editables y errores asociados. | No enviar; foco al primero disponible. Corregir uno no borra los demás errores. |
| Guardando | Impedir cambios que invaliden la petición y envíos repetidos; normalmente `fieldset disabled`. | Estado `role=status` fuera del grupo deshabilitado/inert; `aria-busy` en el formulario. La lógica también evita doble envío. |
| Fallo de guardado | Restablecer edición/acciones conservando valores y contexto. | Error comprensible y reintento. Los campos sensibles siguen su política específica; no prometer conservar contraseñas. |
| Guardado | Actualizar el estado inicial del formulario confirmado. | Mensaje o destino identificable. No cerrar otros editores ni llamar «guardado» a datos aún pendientes. |
| Descarte | Confirmar una sola vez solo si hay modificaciones. | «Continuar editando» conserva valores; «Descartar cambios» afecta al ámbito indicado. |

Las guardas y la coordinación entre formularios son responsabilidad del consumidor. Una petición pendiente no se considera formulario limpio; cualquier recuperación de sesión debe resolver explícitamente la continuidad de la tarea. El kit no revoca sesiones ni autoriza salidas.

## 4. Composición de referencia

```html
<form class="ui-form" aria-label="Editar registro" aria-busy="true" novalidate>
  <p role="status">Guardando cambios…</p>
  <fieldset class="ui-form-fields" disabled>
    <legend class="visually-hidden">Datos del registro</legend>
    <div class="ui-form-grid">
      <div class="field">
        <label for="record-title">Nombre (obligatorio)</label>
        <input id="record-title" name="title" required value="Registro de ejemplo">
      </div>
    </div>
    <div class="ui-form-actions">
      <button type="submit" class="primary-button">Guardando…</button>
      <button type="button" class="quiet-button">Cancelar</button>
    </div>
  </fieldset>
</form>
```

Este ejemplo muestra **guardado pendiente**, no un formulario listo para copiar sin estado. Al terminar, retirar `disabled`, `aria-busy` y el mensaje según el resultado. El consumidor implementa transiciones; las clases solo proporcionan presentación. `aria-disabled` por sí solo no bloquea eventos. Un enlace no se deshabilita con `disabled`: si la acción debe bloquearse, elegir el control y lógica apropiados.

## 5. Consistencia visual

- Fuente, pesos, tamaños y separación: tokens del kit. No simular títulos aumentando el peso de una etiqueta.
- Campos: altura mínima `--ui-control-height`, borde `--ui-color-border-strong`, radio `--ui-radius-md`; errores con `--ui-color-error-text`. Un borde decorativo tenue no sustituye el borde de un control.
- Acción principal: `.primary-button`; alternativa: `.quiet-button` o `.text-button`; destrucción: `.danger-button` según la consecuencia. No hay un máximo universal de botones por pantalla: justificar prioridad y tarea.
- Acciones se envuelven en espacio reducido. Columnas de campos con mínimo elástico; no forzar desplazamiento horizontal de la página.
- Foco visible independiente de hover, error y selección; controles deshabilitados no reciben el tratamiento hover de una acción disponible.
- Una redefinición semántica de tokens requiere volver a comprobar contraste. No cambiar los siete colores de marca para corregir una combinación.

Los ejemplos de este documento describen estados inicial, inválido, deshabilitado y guardando con el CSS compartido. No afirman que todos los formularios actuales de Jallupacha estén migrados a estas clases. La referencia HTML temporal se retiró mediante C-040.

## 6. Verificación mínima para un consumidor

1. Entrada limpia → Cancelar; modificación → cancelar descarte → conservar valores.
2. Envío inválido → foco y errores por campo; corregir uno → conservar errores de los restantes.
3. Petición pendiente → un envío, mensaje y bloqueo coherentes; fallo → valores conservados y reintento.
4. Recorrido de teclado y textos visibles; contraste efectivo de campo, error, foco y acción.
5. Ampliación al 200 % y reajuste a 320 píxeles CSS, registrándolos como comprobaciones distintas; comprobar que las acciones y el foco siguen disponibles.

Reutilizar regresiones existentes; añadir solo las que falten para el comportamiento afectado. Registrar exactamente qué se ejecutó en el mismo cambio de Git. Pruebas DOM no acreditan por sí solas colores efectivos, modalidad del navegador, lectura asistiva ni utilidad con personas. La promoción del patrón sigue la [evaluación del catálogo](catalogo-componentes.md#6-evaluación-de-patrones).
