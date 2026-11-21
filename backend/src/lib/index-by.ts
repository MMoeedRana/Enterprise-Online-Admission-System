export function indexBy<T>(rows: readonly T[], key: (row: T) => unknown): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    const k = String(key(row));
    if (!map.has(k)) map.set(k, row);
  }
  return map;
}
