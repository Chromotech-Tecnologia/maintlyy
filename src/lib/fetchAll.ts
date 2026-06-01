/**
 * Fetches all rows from a Supabase query in batches to bypass the default
 * 1000-row PostgREST limit. Pass a builder that returns a fresh query each call.
 */
export async function fetchAllInBatches<T>(
  buildQuery: () => any,
  batchSize = 1000
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  // Safety cap to avoid infinite loops
  for (let i = 0; i < 1000; i++) {
    const { data, error } = await buildQuery().range(from, from + batchSize - 1)
    if (error) throw error
    const rows = (data || []) as T[]
    all.push(...rows)
    if (rows.length < batchSize) break
    from += batchSize
  }
  return all
}
