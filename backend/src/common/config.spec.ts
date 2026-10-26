import { assertSchemaInstallAllowed, configuredRateLimit, loadRuntimeConfig, validateDemoRuntime } from './config';

describe('local demo runtime controls', () => {
  it('allows demo authentication only on loopback in development', () => {
    expect(() => validateDemoRuntime('127.0.0.1', 'demo', 'development')).not.toThrow();
    expect(() => validateDemoRuntime('localhost', 'demo', 'development')).not.toThrow();
    expect(() => validateDemoRuntime('0.0.0.0', 'demo', 'development')).toThrow();
    expect(() => validateDemoRuntime('127.0.0.1', 'demo', 'production')).toThrow();
  });

  it('leaves non-demo authentication modes unaffected', () => {
    expect(() => validateDemoRuntime('0.0.0.0', 'google', 'production')).not.toThrow();
  });

  it('uses configured positive integer limits', () => {
    const ttl = process.env.API_RATE_LIMIT_TTL_MS;
    const limit = process.env.API_RATE_LIMIT_MAX;
    process.env.API_RATE_LIMIT_TTL_MS = '1500';
    process.env.API_RATE_LIMIT_MAX = '20';
    expect(configuredRateLimit()).toEqual({ ttl: 1500, limit: 20 });
    process.env.API_RATE_LIMIT_TTL_MS = '0';
    expect(() => configuredRateLimit()).toThrow();
    if (ttl === undefined) delete process.env.API_RATE_LIMIT_TTL_MS;
    else process.env.API_RATE_LIMIT_TTL_MS = ttl;
    if (limit === undefined) delete process.env.API_RATE_LIMIT_MAX;
    else process.env.API_RATE_LIMIT_MAX = limit;
  });
});

describe('explicit historical schema installation controls', () => {
  const values = {
    ORACLE_SCHEMA: 'TEST_OWNER', ORACLE_SERVICE: 'TEST_SERVICE', MIGRATION_USER: 'TEST_OWNER', DATABASE_USER: 'TEST_RUNTIME',
    SCHEMA_INSTALL_ALLOWED: 'true', SCHEMA_INSTALL_CONFIRM: 'INSTALL SCHEMA TEST_OWNER@TEST_SERVICE',
    SCHEMA_ALLOW_OWNER_RUNTIME_FOR_QA: 'false'
  };
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const key of Object.keys(values)) saved[key] = process.env[key];
    Object.assign(process.env, values);
  });
  afterEach(() => {
    for (const key of Object.keys(values)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });
  it('requires the exact target confirmation before any connection can be opened', () => {
    expect(assertSchemaInstallAllowed()).toBe('TEST_OWNER');
    process.env.SCHEMA_INSTALL_CONFIRM = 'INSTALL SCHEMA OTHER_OWNER@TEST_SERVICE';
    expect(() => assertSchemaInstallAllowed()).toThrow('installation refused');
  });
  it('refuses disabled or missing opt-in', () => {
    delete process.env.SCHEMA_INSTALL_ALLOWED;
    expect(() => assertSchemaInstallAllowed()).toThrow('installation refused');
  });
  it('requires the migration account to own the target schema', () => {
    process.env.MIGRATION_USER = 'OTHER_OWNER';
    expect(() => assertSchemaInstallAllowed()).toThrow('installation refused');
  });
  it('preserves separate runtime accounts unless the explicit QA exception is set', () => {
    process.env.DATABASE_USER = 'TEST_OWNER';
    expect(() => assertSchemaInstallAllowed()).toThrow('separate');
    process.env.SCHEMA_ALLOW_OWNER_RUNTIME_FOR_QA = 'true';
    expect(assertSchemaInstallAllowed()).toBe('TEST_OWNER');
  });
});

describe('loadRuntimeConfig', () => {
  const base: Record<string, string> = {
    APP_ENV: 'local', NODE_ENV: 'development', HOST: '127.0.0.1', PORT: '3000', AUTH_MODE: 'demo',
    ORACLE_HOST: 'h', ORACLE_SERVICE: 's', ORACLE_SCHEMA: 'SCH', DATABASE_USER: 'u', DATABASE_PASSWORD: 'p'
  };
  const keys = [...Object.keys(base), 'DEMO_DATA_ENABLED'];
  const saved: Record<string, string | undefined> = {};
  const apply = (values: Record<string, string>): void => {
    for (const key of keys) delete process.env[key];
    Object.assign(process.env, values);
  };
  beforeEach(() => keys.forEach((key) => (saved[key] = process.env[key])));
  afterEach(() => keys.forEach((key) => {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }));

  it('accepts a valid local configuration', () => {
    apply(base);
    expect(loadRuntimeConfig()).toMatchObject({ appEnv: 'local', port: 3000 });
  });

  it('accepts a server configuration without demo mode', () => {
    apply({ ...base, APP_ENV: 'production', NODE_ENV: 'production', HOST: '0.0.0.0', AUTH_MODE: 'google' });
    expect(loadRuntimeConfig().appEnv).toBe('production');
  });

  it('rejects missing, inconsistent or demo-in-server settings', () => {
    apply({ ...base, APP_ENV: '' });
    expect(() => loadRuntimeConfig()).toThrow('APP_ENV');
    apply({ ...base, APP_ENV: 'development' });
    expect(() => loadRuntimeConfig()).toThrow('NODE_ENV');
    apply({ ...base, APP_ENV: 'development', NODE_ENV: 'production' });
    expect(() => loadRuntimeConfig()).toThrow('demo');
    apply({ ...base, APP_ENV: 'production', NODE_ENV: 'production', AUTH_MODE: 'google', DEMO_DATA_ENABLED: 'true' });
    expect(() => loadRuntimeConfig()).toThrow('demo');
    apply({ ...base, DATABASE_PASSWORD: '' });
    expect(() => loadRuntimeConfig()).toThrow('DATABASE_PASSWORD');
    apply({ ...base, PORT: '0' });
    expect(() => loadRuntimeConfig()).toThrow('PORT');
  });
});
