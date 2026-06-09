/**
 * Supabase's inferred join type can be an array when the runtime payload is a
 * single related row. Normalize both representations at the query boundary.
 */
export function firstRelatedRecord<T>(
  relation: T | T[] | null | undefined
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}
