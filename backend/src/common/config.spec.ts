import { configuredRateLimit, validateDemoRuntime } from './config';

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
