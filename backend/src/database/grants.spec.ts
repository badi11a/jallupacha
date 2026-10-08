import { runtimeGrantStatements } from './grants';

describe('runtime grants', () => {
  const statements = runtimeGrantStatements('APP_RUNTIME', 'OWNER_SCHEMA');

  it('covers every base table the API uses, including sessions and security events', () => {
    for (const table of ['APP_SESSION', 'SECURITY_EVENT', 'SECURITY_EVENT_IP', 'USER_IDENTITY', 'USER_PROFILE', 'ADMIN_CONTROL', 'MACROPROCESS_CODE_SEQ']) {
      expect(statements.some((item) => item.includes(`"OWNER_SCHEMA"."${table}"`))).toBe(true);
    }
  });

  it('grants only table privileges to the runtime user and never system or migration objects', () => {
    for (const item of statements) {
      expect(item).toMatch(/^GRANT (SELECT|INSERT|UPDATE|DELETE)(, (SELECT|INSERT|UPDATE|DELETE))* ON "OWNER_SCHEMA"\."[A-Z_]+" TO "APP_RUNTIME"$/);
      expect(item).not.toContain('migrations');
    }
  });
});
