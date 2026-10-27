/** C-048 browser fixture only. No product server, database, real identities or persistence. */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, extname, relative, isAbsolute } from 'node:path';
const root = resolve(process.argv[2]);
const port = Number(process.argv[3] ?? 4300);
const consumer = process.argv.includes('--consumer');
const apiDelayMs = Number(process.argv.find(arg => arg.startsWith('--api-delay-ms='))?.split('=')[1] ?? 0);
const rowCount = Number(process.argv.find(arg => arg.startsWith('--rows='))?.split('=')[1] ?? 1);
if (!Number.isSafeInteger(apiDelayMs) || apiDelayMs < 0 || apiDelayMs > 1000
  || !Number.isSafeInteger(rowCount) || rowCount < 1 || rowCount > 300) throw new Error('Invalid fixture delay or row count');
if (!existsSync(join(root, 'index.html')) || !Number.isSafeInteger(port)) throw new Error('Specify a compiled browser directory and local port');
let loggedIn = false;
const user = { userId: 1, displayName: 'Persona de prueba', email: 'persona@example.test', profiles: consumer ? ['READER'] : ['ADMIN', 'RISK_MANAGER'] };
const unit = { id: 1, code: 'U1', name: 'Unidad de gestión', parentUnitId: null, isActive: true, processCount: 1 };
const type = { id: 1, name: 'Gestión', isActive: true, macroprocessId: 1, macroprocessCode: 'MP1', macroprocessName: 'Gestión de la entidad', macroprocessTypeName: 'Estratégicos', processCount: 1 };
const row = { id: 1, code: 'PR1', name: 'Proceso de ejemplo', alias: null, status: 'Borrador', responsible: 'Persona responsable', macroprocessType: 'Estratégicos', macroprocess: type.macroprocessName, processType: type.name, responsibleUnit: unit.name };
const detail = { ...row, macroprocessId: 1, processTypeId: 1, parentProcessId: null, parent: null, subprocesses: [],
  units: [{ unitId: 1, name: unit.name, isActive: true, role: 'RESPONSABLE', function: 'Coordinar la actividad registrada.' }],
  risks: [], relations: { outgoing: [], incoming: [] }, completeness: { complete: false, missing: ['Entradas'] }, possibleDuplicates: [],
  description: 'Organiza una actividad genérica de la entidad.', objective: 'Mantener información de la organización.', versionNumber: 1, revision: 1 };
const rows = Array.from({ length: rowCount }, (_, index) => index === 0 ? row : { ...row, id: index + 1, code: `PR${index + 1}`, name: `Proceso de ejemplo ${index + 1}` });
const map = { macroprocessTypes: [{ id: 1, name: 'Estratégicos', macroprocesses: [{ id: 1, code: 'MP1', name: type.macroprocessName,
  description: 'Agrupa las actividades de gestión de la entidad.', processTypes: [{ id: 1, name: type.name, processes: rows }] }] }] };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname.startsWith('/api/') && apiDelayMs) await new Promise(done => setTimeout(done, apiDelayMs));
  const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  if (url.pathname === '/api/auth/me') return json(loggedIn ? 200 : 401, loggedIn ? user : {});
  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    loggedIn = true;
    res.setHeader('Set-Cookie', `${consumer ? 'app_csrf' : 'jallupacha_csrf'}=generic-preview-csrf; Path=/; SameSite=Strict`);
    return json(200, { authenticated: true, ...user });
  }
  if (url.pathname === '/api/auth/logout') { loggedIn = false; res.writeHead(204); return res.end(); }
  if (url.pathname.startsWith('/api/')) {
    if (!loggedIn) return json(401, {});
    if (req.method === 'PATCH' && /\/processes\/1$/.test(url.pathname)) {
      let body = ''; for await (const chunk of req) body += chunk;
      Object.assign(detail, JSON.parse(body)); return json(200, { id: 1 });
    }
    const routes = { '/api/management/map': map, '/api/management/processes': rows.filter(item => !url.searchParams.get('q') || `${item.code} ${item.name}`.toLowerCase().includes(url.searchParams.get('q').toLowerCase())), '/api/management/processes/1': detail,
      '/api/management/units': [unit], '/api/management/process-types': [type],
      '/api/users': [{ id: 2, displayName: 'Persona de consulta', email: 'consulta@example.test', isActive: 1, profiles: 'CONSULTATION' }],
      '/api/audit': { items: [], total: 0, page: 1, limit: 50 } };
    return json(Object.hasOwn(routes, url.pathname) ? 200 : 404, routes[url.pathname] ?? {});
  }
  const requested = resolve(root, '.' + url.pathname);
  const rel = relative(root, requested);
  if (isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) { res.writeHead(403); return res.end(); }
  const file = existsSync(requested) && statSync(requested).isFile() ? requested : join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' }); res.end(readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`Browser fixture at http://127.0.0.1:${server.address().port}`));
