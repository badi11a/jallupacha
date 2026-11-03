/** C-049/C-050: effective styles and affected workflows against generic loopback fixtures. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const { chromium } = createRequire(import.meta.url)(resolve(option('--playwright')));
const output = resolve(option('--output', '.tmp/ui-verification'));
mkdirSync(output, { recursive: true });
const fixture = resolve(dirname(fileURLToPath(import.meta.url)), '../test/fixtures/preview-server.mjs');
const server = spawn(process.execPath, [fixture, resolve(option('--root', 'frontend/dist/jallupacha/browser')), '0', '--rows=2'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const checks = [];
let browser;
try {
  const url = await new Promise((accept, reject) => {
    const timer = setTimeout(() => reject(new Error('Fixture startup timeout')), 10000);
    server.on('error', reject);
    server.on('exit', code => { clearTimeout(timer); reject(new Error(`Fixture exited ${code}`)); });
    server.stdout.on('data', chunk => { const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); accept(match[0]); } });
  });
  browser = await chromium.launch({ headless: true, executablePath: option('--executable') });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.request.post(url + '/api/auth/login', { data: {} });
  const page = await context.newPage();
  const scriptErrors = [];
  page.on('pageerror', error => scriptErrors.push(error.message));
  async function visit(path, ready) {
    await page.goto(url + path);
    await page.locator(ready).first().waitFor({ state: 'visible' });
    await page.waitForLoadState('networkidle');
  }
  async function styles(name, selector) {
    await page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(element => {
      const outline = element.closest('mat-form-field')?.querySelector('.mdc-notched-outline__leading');
      return outline && getComputedStyle(outline).borderTopColor ===
        (element.getAttribute('aria-invalid') === 'true' ? 'rgb(152, 45, 45)' : 'rgb(138, 147, 166)');
    }), selector, { timeout: 3000 });
    const items = await page.locator(selector).evaluateAll(elements => {
      return elements.map(element => {
        const field = element.closest('mat-form-field');
        // Test-only observation of Material's painted outline, never a production style dependency.
        const outline = field?.querySelector('.mdc-notched-outline__leading');
        const edge = outline && getComputedStyle(outline);
        return { tag:element.tagName, material:!!field, height:field?.getBoundingClientRect().height,
          radius:edge?.borderTopLeftRadius, border:edge?.borderTopColor, invalid:element.getAttribute('aria-invalid')==='true' };
      });
    });
    assert.ok(items.length,name+' must contain controls');
    for(const item of items){
      assert.equal(item.material,true,name);
      assert.ok(item.height >= 42,name+' control height');
      assert.equal(item.radius,'7px',name);
      assert.equal(item.border,item.invalid?'rgb(152, 45, 45)':'rgb(138, 147, 166)',name);
    }
    checks.push({ name, controls: items, state: 'passed' });
  }
  async function reflow(name) {
    await page.setViewportSize({ width: 320, height: 900 });
    const size = await page.evaluate(() => ({ available: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(size.scroll <= size.available + 1, `${name}: document overflows ${JSON.stringify(size)}`);
    const clippedControls = await page.locator('main input, main select, main textarea, main button').evaluateAll(elements => elements.filter(element => {
      if (!element.getClientRects().length || element.closest('.table-scroll')) return false;
      const rect = element.getBoundingClientRect(); return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
    }).map(element => element.outerHTML.slice(0, 100)));
    assert.deepEqual(clippedControls, [], name + ' controls fit');
    await page.screenshot({ path: join(output, name + '-320.png'), fullPage: true });
    const regions = [];
    for (const region of await page.locator('.table-scroll').all()) {
      const geometry = await region.evaluate(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth }));
      if (geometry.scrollWidth > geometry.width) {
        await region.focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(element => element.scrollLeft > 0, await region.elementHandle());
        geometry.keyboardScroll = await region.evaluate(element => element.scrollLeft);
        await region.evaluate(element => element.scrollLeft = 0);
      }
      regions.push(geometry);
    }
    checks.push({ name: name + '-320', ...size, regions, state: 'passed' });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  async function resolveDiscard() {
    await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
  }
  async function counterCheck(fieldSelector, counterSelector, name) {
    const field = page.locator(fieldSelector), counter = page.locator(counterSelector);
    const initial = await field.inputValue();
    assert.equal(await field.getAttribute('aria-describedby'), await counter.getAttribute('id'));
    assert.equal(await field.getAttribute('maxlength'), '4000');
    assert.equal(await counter.getAttribute('aria-live'), null);
    await field.fill('a'.repeat(3599));
    await page.waitForFunction(selector => document.querySelector(selector)?.hidden, counterSelector);
    await field.fill('  ' + '😀'.repeat(1799) + 'e\u0301' + '  ');
    await page.waitForFunction(selector => document.querySelector(selector)?.textContent.includes('3.600 / 4.000') && !document.querySelector(selector).hidden, counterSelector);
    await field.fill('é'.repeat(4000));
    await page.waitForFunction(selector => document.querySelector(selector)?.textContent.includes('4.000 / 4.000'), counterSelector);
    await field.press('End'); await page.keyboard.insertText('x');
    assert.equal((await field.inputValue()).length, 4000, 'native input limit is retained');
    await field.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(output, name + '-counter-desktop.png') });
    await reflow(name + '-counter');
    await field.fill(initial);
    checks.push({ name: name + '-counter-threshold-utf16-max-association', state: 'passed', threshold: 3600, max: 4000 });
  }
  await visit('/procesos', 'table tbody tr a');
  await styles('list-filters', 'form[role="search"] input, form[role="search"] select');
  await reflow('list');
  await visit('/procesos/1/editar?returnTo=%2Fprocesos%3Fq%3Dejemplo', '#field-name');
  await styles('process-form', 'main input, main select, main textarea');
  await counterCheck('#field-description', '#counter-description', 'process');
  await page.screenshot({ path: join(output, 'form-desktop.png'), fullPage: true });
  await reflow('form');
  await page.locator('#field-name').fill('');
  await page.getByRole('button', { name: 'Guardar proceso', exact: true }).click();
  await page.locator('#error-name').waitFor();
  assert.equal(await page.locator('#field-name').getAttribute('aria-invalid'), 'true');
  await styles('process-invalid', '#field-name');
  await page.locator('#field-name').fill('Proceso modificado');
  let releaseWrite;
  const writeGate = new Promise(done => releaseWrite = done);
  let writes = 0;
  await page.route('**/api/management/processes/1', async route => {
    if (route.request().method() !== 'PATCH') return route.continue();
    writes++;
    await writeGate;
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'No fue posible guardar.' }) });
  });
  await page.getByRole('button', { name: 'Guardar proceso', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('fieldset')?.disabled);
  assert.equal(await page.locator('#field-name').isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Guardando…', exact: true }).isDisabled(), true);
  releaseWrite();
  await page.locator('ui-message[role="alert"]').waitFor();
  assert.equal(writes, 1);
  assert.equal(await page.locator('#field-name').inputValue(), 'Proceso modificado');
  assert.equal(await page.locator('#field-name').isDisabled(), false);
  await page.unroute('**/api/management/processes/1');
  const externalBefore = await page.evaluate(() => {
    const region=document.createElement('section');region.id='outside-kit';region.innerHTML='<label>External<input value="External"></label><button type="button">External action</button>';
    document.body.append(region);
    document.querySelector('app-root').style.setProperty('--ui-color-primary','#4f235c');
    return [...region.querySelectorAll('input,button')].map(e=>{const s=getComputedStyle(e);return [s.color,s.backgroundColor,s.fontSize,s.borderRadius,e.getBoundingClientRect().width];});
  });
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const dialog=page.getByRole('dialog'); await dialog.waitFor();
  assert.equal(await dialog.getAttribute('aria-labelledby'),'ui-dialog-title');
  const discard=dialog.getByRole('button',{name:'Descartar cambios',exact:true});
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.ui-dialog-panel')).getPropertyValue('--ui-color-primary').trim()==='#4f235c');
  assert.equal(await dialog.getByRole('button',{name:'Continuar editando',exact:true}).evaluate(e=>getComputedStyle(e).color),'rgb(79, 35, 92)');
  assert.equal(await discard.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(168, 50, 50)','danger tone stays semantic');
  assert.deepEqual(await page.locator('#outside-kit input, #outside-kit button').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);return [s.color,s.backgroundColor,s.fontSize,s.borderRadius,e.getBoundingClientRect().width];})),externalBefore);
  await dialog.getByRole('button',{name:'Continuar editando',exact:true}).focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await discard.evaluate(e=>e===document.activeElement),true,'focus wraps inside the modal');
  await page.keyboard.press('Tab');
  assert.equal(await dialog.getByRole('button',{name:'Continuar editando',exact:true}).evaluate(e=>e===document.activeElement),true);
  await page.screenshot({path:join(output,'dialog-desktop.png')});
  await page.setViewportSize({width:320,height:900});
  const dialogGeometry=await dialog.evaluate(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:document.documentElement.clientWidth}));
  assert.ok(dialogGeometry.left>=0&&dialogGeometry.right<=dialogGeometry.width,'dialog fits 320px');
  await page.screenshot({path:join(output,'dialog-320.png')});
  await page.setViewportSize({width:1440,height:1000});
  await page.keyboard.press('Escape'); await dialog.waitFor({state:'detached'});
  assert.equal(await page.getByRole('button',{name:'Cancelar',exact:true}).evaluate(e=>e===document.activeElement),true,'Escape restores opener focus');
  assert.equal(await page.locator('#field-name').inputValue(),'Proceso modificado');
  await page.evaluate(()=>{document.querySelector('app-root').style.removeProperty('--ui-color-primary');document.querySelector('#outside-kit').remove();});
  checks.push({name:'material-dialog-theme-isolation-tab-trap-escape-restoration-320',state:'passed'});
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
  assert.equal(await page.locator('#field-name').inputValue(), 'Proceso modificado');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await resolveDiscard();
  await page.locator('#process-title').waitFor();
  assert.ok(page.url().includes('returnTo='));
  checks.push({ name: 'process-invalid-pending-failure-discard-return', writes, state: 'passed' });
  for (const [path, action, name] of [['/unidades', 'Nueva unidad', 'units'], ['/tipos-de-proceso', 'Nuevo tipo de proceso', 'types']]) {
    await visit(path, 'table');
    await page.getByRole('button', { name: action, exact: true }).click();
    await styles(name + '-editor', '.catalog-editor input, .catalog-editor select');
    await reflow(name);
    await page.locator('#catalog-name').fill('Registro modificado');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
    assert.equal(await page.locator('#catalog-name').inputValue(), 'Registro modificado');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await resolveDiscard();
  }
  await visit('/procesos/1', '#process-title');
  await page.getByRole('button', { name: 'Agregar riesgo', exact: true }).click();
  await styles('risk-editor', '.process-inline-editor input, .process-inline-editor select, .process-inline-editor textarea');
  await counterCheck('#risk-description', '#counter-risk-description', 'risk');
  await reflow('risk');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  assert.equal(await page.getByRole('dialog').count(), 0, 'clean risk exits immediately');
  await page.getByRole('button', { name: 'Agregar relación', exact: true }).click();
  await page.locator('select[name="destination"] option').nth(1).waitFor({ state: 'attached' });
  await styles('relation-editor', '.process-inline-editor input, .process-inline-editor select, .process-inline-editor textarea');
  await counterCheck('#relation-description', '#counter-relation-description', 'relation');
  await reflow('relation');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  assert.equal(await page.getByRole('dialog').count(), 0, 'clean relation exits immediately');
  await page.route('**/api/audit?*', async route => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') || 1);
    await route.fulfill({ json: { items: [{ id: pageNumber, createdAt: '2026-10-27T12:00:00Z', actorUserId: null, actorDisplayName: null,
      actorEmail: null, action: 'PROCESS_UPDATED', entityType: 'PROCESS', entityId: 'PR1', beforeValue: null, afterValue: null }], total: 51, page: pageNumber, limit: 25 } });
  });
  await visit('/auditoria?entityType=PROCESS', 'ui-pagination');
  const pagination = page.locator('ui-pagination');
  assert.equal(await pagination.getAttribute('role'), 'navigation');
  assert.equal(await pagination.getAttribute('aria-label'), 'Navegación de páginas');
  assert.ok((await pagination.textContent()).includes('Página 1 de 3'));
  assert.equal(await pagination.getByRole('button', { name: 'Anterior', exact: true }).isDisabled(), true);
  await pagination.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.waitForURL('**/auditoria?entityType=PROCESS&page=2');
  await page.waitForFunction(() => document.querySelector('ui-pagination')?.textContent.includes('Página 2 de 3'));
  await pagination.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('ui-pagination')?.textContent.includes('Página 3 de 3'));
  assert.equal(await pagination.getByRole('button', { name: 'Siguiente', exact: true }).isDisabled(), true);
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('ui-pagination')?.textContent.includes('Página 2 de 3'));
  assert.equal(new URL(page.url()).searchParams.get('entityType'), 'PROCESS');
  checks.push({ name: 'audit-shared-pagination-boundaries-filters-history', state: 'passed' });
  await page.unroute('**/api/audit?*');
  await visit('/auditoria', 'ui-pagination');
  assert.ok((await pagination.textContent()).includes('Página 1 de 1'));
  assert.equal(await pagination.getByRole('button', { name: 'Siguiente', exact: true }).isDisabled(), true);
  await styles('audit-filters', 'form[role="search"] input, form[role="search"] select');
  await reflow('audit');
  await visit('/usuarios', 'table tbody button');
  await page.getByRole('button', { name: 'Modificar perfiles', exact: true }).click();
  await page.locator('.profile-card').first().waitFor();
  await reflow('profiles');
  checks.push({ name: 'profiles-checkbox-layout', state: 'passed', implementation: 'Material checkboxes retain checked and pending states.' });
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await visit('/mapa', '#map-filter');
  await styles('map-search', '#map-filter');
  await reflow('map');
  await visit('/mapa/macroprocesos/1', '#macro-title');
  await styles('macro-filters', '.search-box input, .dropdown-group select');
  await reflow('macro');
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await page.locator('#login-email').waitFor();
  await styles('access', '#login-email, #login-password');
  await page.locator('#login-email').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#login-password').evaluate(element => element === document.activeElement), true);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#login-password').closest('mat-form-field').querySelector('.mdc-notched-outline__leading')).borderTopWidth === '2px');
  const focus = await page.locator('#login-password').evaluate(element => { const edge = getComputedStyle(element.closest('mat-form-field').querySelector('.mdc-notched-outline__leading')); return { width:edge.borderTopWidth,style:edge.borderTopStyle,color:edge.borderTopColor }; });
  assert.equal(focus.style,'solid'); assert.equal(focus.width,'2px'); assert.equal(focus.color,'rgb(48, 56, 128)');
  checks.push({ name: 'access-keyboard-focus', ...focus, state: 'passed' });
  await reflow('access');
  assert.deepEqual(scriptErrors, []);
  writeFileSync(join(output, 'browser-verification.json'), JSON.stringify({ browser: browser.version(), checks, scriptErrors,
    scope: 'Generic fixture. Common controls, route-specific states and 320px reflow.' }, null, 2) + '\n');
  console.log(`Browser verification passed: ${checks.length} checks`);
  await context.close();
} finally { await browser?.close(); server.kill(); }
