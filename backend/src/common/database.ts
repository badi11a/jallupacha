export function qualifiedTable(name: string): string {
  const schema = process.env.ORACLE_SCHEMA?.trim().toUpperCase();
  if (!schema || !/^[A-Z][A-Z0-9_$#]{0,29}$/.test(schema) || !/^[A-Z][A-Z0-9_$#]{0,29}$/.test(name)) {
    throw new Error('Invalid Oracle object configuration');
  }
  return `"${schema}"."${name}"`;
}
