import { focusFirstInvalid } from './index';

describe('focusFirstInvalid — contrato del kit C-039', () => {
  let scope: HTMLFormElement;
  beforeEach(() => {
    scope = document.createElement('form');
    document.body.append(scope);
  });
  afterEach(() => scope.remove());
  const render = () => new Promise<void>(resolve => setTimeout(resolve, 0));

  it('omite errores no operables y enfoca el primero disponible dentro del formulario', async () => {
    scope.innerHTML = `
      <div aria-invalid="true">Resumen no operable</div>
      <input aria-invalid="true" disabled>
      <fieldset disabled><input aria-invalid="true"></fieldset>
      <div hidden><input aria-invalid="true"></div>
      <div inert><input aria-invalid="true"></div>
      <div aria-hidden="true"><input aria-invalid="true"></div>
      <div style="display: none"><input aria-invalid="true"></div>
      <input type="hidden" aria-invalid="true">
      <input id="available-field" aria-invalid="true"><input aria-invalid="true">`;
    focusFirstInvalid(scope);
    await render();
    expect(document.activeElement).toBe(scope.querySelector('#available-field'));
  });

  it('espera el render y conserva el foco cuando el ámbito se destruye o no tiene errores', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    try {
      outside.focus();
      focusFirstInvalid(scope);
      scope.innerHTML = '<fieldset id="invalid-group" tabindex="-1" aria-invalid="true"></fieldset>';
      await render();
      expect(document.activeElement).toBe(scope.querySelector('#invalid-group'));
      outside.focus();
      focusFirstInvalid(scope);
      scope.remove();
      await render();
      expect(document.activeElement).toBe(outside);
      document.body.append(scope);
      scope.innerHTML = '<input>';
      focusFirstInvalid(scope);
      await render();
      expect(document.activeElement).toBe(outside);
    } finally { outside.remove(); }
  });
});
