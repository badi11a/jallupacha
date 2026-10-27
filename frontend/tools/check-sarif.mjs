import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2];
if (!dir) throw new Error('Specify the SARIF output directory');
const files = readdirSync(dir).filter(name => name.endsWith('.sarif'));
if (!files.length) throw new Error('No SARIF analysis was produced');
let blocked = 0;
for (const file of files) {
  const report = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  if (!Array.isArray(report.runs) || !report.runs.length) throw new Error('SARIF contains no analysis run');
  for (const run of report.runs ?? []) {
    if (run.invocations?.some(invocation => invocation.executionSuccessful === false)) throw new Error('Analysis did not complete successfully');
    const rules = run.tool?.driver?.rules ?? [];
    for (const result of run.results ?? []) {
      const rule = rules.find(rule => rule.id === result.ruleId);
      const severity = Number(rule?.properties?.['security-severity'] ?? result.properties?.['security-severity'] ?? 0);
      if (severity >= 7 || (result.level ?? rule?.defaultConfiguration?.level) === 'error') blocked++;
    }
  }
}
if (blocked) throw new Error('Security analysis contains high/critical or error findings: ' + blocked);
console.log('Security analysis gate passed for ' + files.length + ' SARIF report(s).');
