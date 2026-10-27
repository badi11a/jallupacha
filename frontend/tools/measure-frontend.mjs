/** C-049: production-browser benchmark. Only generic loopback fixtures, no product telemetry. */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
function option(name, fallback) { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; }
const root = resolve(option('--root', 'frontend/dist/jallupacha/browser'));
const output = resolve(option('--output', '.tmp/frontend-measurement.json'));
const samples = Number(option('--samples', '12'));
const rows = Number(option('--rows', '120'));
const delay = Number(option('--api-delay-ms', '20'));
if (!Number.isSafeInteger(samples) || samples < 3 || samples > 100) throw new Error('Use 3–100 samples');
const playwrightPath = option('--playwright');
if (!playwrightPath) throw new Error('Specify --playwright <installed module directory> (no automatic installation)');
const { chromium } = createRequire(import.meta.url)(resolve(playwrightPath));
const fixture = resolve(dirname(fileURLToPath(import.meta.url)), '../test/fixtures/preview-server.mjs');
const server = spawn(process.execPath, [fixture, root, '0', `--api-delay-ms=${delay}`, `--rows=${rows}`], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const records = [];
const errors = [];
const transportEvents = [];
const completedResources = new Map();
let browser;
try {
  const url = await new Promise((accept, reject) => {
    let text = '';
    const timer = setTimeout(() => reject(new Error('Fixture startup timeout')), 10000);
    server.on('error', reject);
    server.on('exit', code => { clearTimeout(timer); reject(new Error(`Fixture exited ${code}`)); });
    server.stderr.on('data', data => { text += data; });
    server.stdout.on('data', data => {
      text += data;
      const match = text.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); accept(match[0]); }
    });
  });
  browser = await chromium.launch({ headless: true, ...(option('--executable') ? { executablePath: option('--executable') } : {}) });
  // One complete unrecorded cycle primes the browser process/JIT; contexts remain isolated.
  for (let iteration = -1; iteration < samples; iteration++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    try {
      await context.request.post(url + '/api/auth/login', { data: {} });
      const page = await context.newPage();
      const pending = new Set();
      const requestScenarios = new Map();
      const responseStatuses = new Map();
      let activeScenario = 'startup-cold';
      page.on('request', request => { pending.add(request); requestScenarios.set(request, activeScenario); });
      page.on('requestfinished', request => pending.delete(request));
      page.on('pageerror', error => errors.push({ iteration, kind: 'script', message: error.message }));
      page.on('requestfailed', request => { pending.delete(request); transportEvents.push({ iteration, scenario: activeScenario, requestedDuring: requestScenarios.get(request), kind: 'request', status: responseStatuses.get(request) ?? null, path: new URL(request.url()).pathname, message: request.failure()?.errorText }); });
      page.on('response', response => { responseStatuses.set(response.request(), response.status()); if (response.status() >= 400) errors.push({ iteration, kind: 'http', status: response.status(), path: new URL(response.url()).pathname }); });
      await page.addInitScript(() => {
        window.__measurementStart = 0;
        window.__measurementCase = 'startup-cold';
        window.__measurementLongTasks = [];
        if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
          new PerformanceObserver(list => window.__measurementLongTasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration })))).observe({ type: 'longtask', buffered: true });
        }
      });
      async function finish(name, selector, expectedText = '') {
        await page.waitForFunction(({ selector, expectedText }) => {
          const element = document.querySelector(selector);
          return element && element.getClientRects().length > 0 && (!expectedText || element.textContent.includes(expectedText));
        }, { selector, expectedText }, { polling: 'raf', timeout: 15000 });
        const result = await page.evaluate(async () => {
          // Include two rendering frames after the route-specific completion condition.
          await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
          const start = window.__measurementStart;
          const entries = performance.getEntriesByType('resource').filter(entry => entry.startTime >= start);
          const resources = entries.map(entry => ({ path: new URL(entry.name).pathname, api: new URL(entry.name).pathname.startsWith('/api/'), durationMs: entry.duration, bytes: entry.transferSize, bodyBytes: entry.encodedBodySize }));
          const navigation = start === 0 ? performance.getEntriesByType('navigation')[0] : null;
          return { durationMs: performance.now() - start, resources, documentBytes: navigation?.transferSize ?? 0,
            longTaskMs: window.__measurementLongTasks.filter(entry => entry.start >= start).reduce((sum, entry) => sum + entry.duration, 0) };
        });
        if (iteration >= 0) records.push({ iteration, scenario: name, ...result });
        completedResources.set(`${iteration}:${name}`, result.resources);
        // The next action must not cancel a request from this scenario. Draining is outside its measured interval.
        const deadline = Date.now() + 15000;
        while (pending.size && Date.now() < deadline) await new Promise(done => setTimeout(done, 5));
        if (pending.size) throw new Error(`Unfinished requests after ${name}`);
      }
      async function click(name, selector) {
        activeScenario = name;
        await page.evaluate(({ name, selector }) => {
          const element = document.querySelector(selector);
          if (!element) throw new Error(`Missing action: ${selector}`);
          window.__measurementStart = performance.now();
          window.__measurementCase = name;
          element.click();
        }, { name, selector });
      }
      async function journey(suffix) {
        await click(`list-${suffix}`, 'ui-module-nav a[href="/procesos"]');
        await page.waitForFunction(() => ['macro', 'unit'].every(name => document.querySelector(`select[name="${name}"]`)?.options.length > 1));
        await finish(`list-${suffix}`, 'table tbody tr:last-child', `PR${rows}`);
        await page.locator('input[name="q"]').fill('ejemplo');
        await click(`search-${suffix}`, 'form[role="search"] button[type="submit"]');
        await page.waitForURL('**/procesos?q=ejemplo');
        await page.waitForFunction(() => performance.getEntriesByType('resource').some(entry => entry.startTime >= window.__measurementStart && entry.name.includes('/processes?q=ejemplo')));
        await finish(`search-${suffix}`, 'table tbody tr:last-child', `PR${rows}`);
        await click(`detail-${suffix}`, 'table tbody tr:first-child a');
        await finish(`detail-${suffix}`, '#process-title', 'Proceso de ejemplo');
        await click(`form-${suffix}`, 'a[href*="/editar"]');
        await finish(`form-${suffix}`, '#field-name');
        if (await page.locator('#field-name').inputValue() !== 'Proceso de ejemplo') throw new Error('Form has not loaded the fixture');
      }
      await page.goto(url + '/mapa', { waitUntil: 'commit' });
      await finish('startup-cold', '.macro-link', 'Gestión de la entidad');
      await journey('first');
      await click('map-warm', 'ui-module-nav a[href="/mapa"]');
      await finish('map-warm', '.macro-link', 'Gestión de la entidad');
      await journey('warm');
      // Do not tear down a context with unfinished requests: report real network failures only.
      await page.waitForLoadState('networkidle');
      await page.close();
    } finally { await context.close(); }
    console.log(iteration < 0 ? 'Warm-up complete' : `Sample ${iteration + 1}/${samples}`);
  }
  const transportNotifications = [];
  for (const event of transportEvents) {
    const resource = completedResources.get(`${event.iteration}:${event.requestedDuring}`)?.find(resource => resource.path === event.path && resource.bodyBytes > 0);
    // Keep Chrome abort notifications visible when a 200 response, received body and route completion
    // are all independently present. An absent body, non-200 status or other network failure remains fatal.
    if (event.message === 'net::ERR_ABORTED' && event.status === 200 && resource) {
      transportNotifications.push({ ...event, classification: 'abort-after-received-response', receivedBodyBytes: resource.bodyBytes });
    } else errors.push(event);
  }
  const median = values => { const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; };
  const summary = Object.fromEntries([...new Set(records.map(record => record.scenario))].map(scenario => {
    const data = records.filter(record => record.scenario === scenario);
    const times = data.map(record => record.durationMs);
    return [scenario, { samples: data.length, medianMs: median(times), minMs: Math.min(...times), maxMs: Math.max(...times),
      medianRequests: median(data.map(record => record.resources.length)), medianApiRequests: median(data.map(record => record.resources.filter(resource => resource.api).length)),
      medianTransferBytes: median(data.map(record => record.documentBytes + record.resources.reduce((sum, resource) => sum + resource.bytes, 0))),
      medianApiDurationSumMs: median(data.map(record => record.resources.filter(resource => resource.api).reduce((sum, resource) => sum + resource.durationMs, 0))),
      medianLongTaskMs: median(data.map(record => record.longTaskMs)) }];
  }));
  const files = readdirSync(root).filter(name => /\.(js|css)$/.test(name)).map(name => {
    const data = readFileSync(join(root, name));
    return { name, bytes: data.length, gzipBytes: gzipSync(data).length, sha256: createHash('sha256').update(data).digest('hex') };
  });
  const report = { label: option('--label', 'measurement'), timestamp: new Date().toISOString(), node: process.version, browser: browser.version(), platform: process.platform,
    conditions: { viewport: '1440x900', samples, excludedWarmups: 1, fixtureRows: rows, apiDelayMs: delay, fixture: 'generic loopback, no Oracle', transfer: 'HTTP uncompressed; ResourceTiming includes headers', cold: 'new context without disk cache per sample', warm: 'same document, modules previously visited', completion: 'route-specific visible content plus two animation frames; in-browser clock', apiDuration: 'sum of durations; parallel API requests may overlap' },
    files, summary, errors, transportNotifications, records };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, summary, errors, transportNotifications }, null, 2));
  if (errors.length) process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
