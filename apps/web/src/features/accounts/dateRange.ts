export const MAX_STATEMENT_DAYS = 31
export const DEFAULT_STATEMENT_DAYS = 30

export function defaultStatementRange(today = new Date()) {
  const dateTo = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(today)
  const from = new Date(`${dateTo}T00:00:00Z`)
  from.setUTCDate(from.getUTCDate() - (DEFAULT_STATEMENT_DAYS - 1))
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo,
  }
}

export function validateStatementRange(dateFrom: string, dateTo: string) {
  if (!dateFrom || !dateTo) return 'Оберіть обидві дати.'
  const from = new Date(`${dateFrom}T00:00:00Z`)
  const to = new Date(`${dateTo}T00:00:00Z`)
  if (from > to) return 'Дата початку має бути не пізніше дати завершення.'
  const inclusiveDays = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
  if (inclusiveDays > MAX_STATEMENT_DAYS) return 'Період виписки не може перевищувати 31 день.'
  return null
}
