/**
 * Parse a date string (YYYY-MM-DD or full ISO) as a LOCAL date,
 * avoiding the UTC shift bug where "2026-06-17" becomes 16/06 in BR timezone.
 */
export function parseLocalDate(value: string | Date | null | undefined): Date {
  if (!value) return new Date(NaN)
  if (value instanceof Date) return value
  const s = String(value)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const [, y, mo, d] = m
    return new Date(Number(y), Number(mo) - 1, Number(d))
  }
  return new Date(s)
}

export function formatLocalDateBR(value: string | Date | null | undefined): string {
  const d = parseLocalDate(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}
