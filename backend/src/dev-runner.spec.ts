import { readFileSync } from 'fs';
import { join } from 'path';

describe('backend development runner', () => {
  it('uses the TypeScript compiler so decorator metadata keeps DTO validation active', () => {
    const scripts = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')).scripts;
    expect(scripts['start:dev']).toContain('tsc -p tsconfig.build.json');
    expect(scripts['start:dev']).not.toMatch(/\btsx\b/);
  });
});
