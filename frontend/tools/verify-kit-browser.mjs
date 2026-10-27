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
      const expected = element.getAttribute('aria-invalid') === 'true' ? 'rgb(152, 45, 45)' : 'rgb(138, 147, 166)';
      return getComputedStyle(element).borderTopColor === expected;
    }), selector, { polling: 'raf', timeout: 3000 });
    const items = await page.locator(selector).evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return { tag: element.tagName, type: element.type, minHeight: style.minHeight, radius: style.borderRadius, paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom, paddingLeft: style.paddingLeft, border: style.borderTopColor,
        invalid: element.getAttribute('aria-invalid') === 'true', foreground: style.color, background: style.backgroundColor };
    }));
    assert.ok(items.length, name + ' must contain controls');
    for (const item of items) {
      assert.equal(item.minHeight, '42px', name);
      assert.equal(item.radius, '7px', name);
      assert.equal(item.paddingTop, '8.8px', name);
      assert.equal(item.paddingBottom, '8.8px', name);
      assert.equal(item.border, item.invalid ? 'rgb(152, 45, 45)' : 'rgb(138, 147, 166)', name);
    }
    const contrast = await page.locator(selector).evaluateAll(elements => {
      const rgb = text => (text.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const lum = color => rgb(color).map(value => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
      return elements.map(element => { const style = getComputedStyle(element); return { text: ratio(style.color, style.backgroundColor), border: ratio(style.borderTopColor, style.backgroundColor) }; });
    });
    for (const pair of contrast) { assert.ok(pair.text >= 4.5, name + ' text contrast'); assert.ok(pair.border >= 3, name + ' border contrast'); }
    checks.push({ name, controls: items, contrast, state: 'passed' });
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
    await page.locator('dialog').waitFor({ state: 'detached' });
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
    const contrast = await counter.evaluate(element => {
      const lum = color => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(value => {
        const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      const foreground = getComputedStyle(element).color;
      let background = 'rgb(255, 255, 255)';
      for (let parent = element; parent; parent = parent.parentElement) {
        const color = getComputedStyle(parent).backgroundColor;
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') { background = color; break; }
      }
      return { foreground, background, ratio: (Math.max(lum(foreground), lum(background)) + .05) / (Math.min(lum(foreground), lum(background)) + .05) };
    });
    assert.ok(contrast.ratio >= 4.5, name + ' counter contrast');
    await field.press('End'); await page.keyboard.insertText('x');
    assert.equal((await field.inputValue()).length, 4000, 'native input limit is retained');
    await field.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(output, name + '-counter-desktop.png') });
    await reflow(name + '-counter');
    await field.fill(initial);
    checks.push({ name: name + '-counter-threshold-utf16-max-association', state: 'passed', threshold: 3600, max: 4000, contrast });
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
  assert.equal(await page.locator('dialog').count(), 0, 'clean risk exits immediately');
  await page.getByRole('button', { name: 'Agregar relación', exact: true }).click();
  await page.locator('select[name="destination"] option').nth(1).waitFor({ state: 'attached' });
  await styles('relation-editor', '.process-inline-editor input, .process-inline-editor select, .process-inline-editor textarea');
  await counterCheck('#relation-description', '#counter-relation-description', 'relation');
  await reflow('relation');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  assert.equal(await page.locator('dialog').count(), 0, 'clean relation exits immediately');
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
  checks.push({ name: 'profiles-checkbox-layout', state: 'passed', exception: 'Native checkboxes retain their own dimensions; not text fields.' });
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
  const focus = await page.locator('#login-password').evaluate(element => ({ width: getComputedStyle(element).outlineWidth, style: getComputedStyle(element).outlineStyle }));
  assert.equal(focus.style, 'solid'); assert.equal(focus.width, '3px');
  checks.push({ name: 'access-keyboard-focus', ...focus, state: 'passed' });
  await reflow('access');
  assert.deepEqual(scriptErrors, []);
  writeFileSync(join(output, 'browser-verification.json'), JSON.stringify({ browser: browser.version(), checks, scriptErrors,
    scope: 'Generic fixture. Effective text/border contrast, common controls, route-specific states and 320px reflow; no full WCAG claim.' }, null, 2) + '\n');
  console.log(`Browser verification passed: ${checks.length} checks`);
  await context.close();
} finally { await browser?.close(); server.kill(); }
