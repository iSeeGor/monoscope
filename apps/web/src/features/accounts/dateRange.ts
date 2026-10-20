export const MAX_STATEMENT_DAYS = 31

export function defaultStatementRange(today = new Date()) {
  const dateTo = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(today)
  return {
    dateFrom: `${dateTo.slice(0, 8)}01`,
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
