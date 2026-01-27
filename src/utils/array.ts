export function uniqueBy<T>(items: T[], getKey: (item: T) => string | number | null | undefined): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const keyValue = getKey(item);
    const key = keyValue === null || keyValue === undefined ? "__null__" : String(keyValue);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}
