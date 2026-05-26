// Dedup helper for the shopping list. Repeated chat extractions / report
// applies were inserting the same material multiple times into a project's
// shopping_list_items, inflating item count and estimated cost (diyer-04).

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Filter `incoming` down to items not already represented — neither by an
 * earlier item in the same batch nor by an existing list entry. Name matching
 * is case- and whitespace-insensitive. Order is preserved and the first
 * occurrence of any name wins.
 */
export function dedupeNewListItems<T>(
  incoming: T[],
  getName: (item: T) => string,
  existingNames: Iterable<string> = []
): T[] {
  const seen = new Set<string>();
  for (const existing of existingNames) seen.add(normalizeName(existing));

  const result: T[] = [];
  for (const item of incoming) {
    const key = normalizeName(getName(item));
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}
