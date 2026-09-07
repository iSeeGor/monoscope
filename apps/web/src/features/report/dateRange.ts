export function validateDateRange(dateFrom: string, dateTo: string) {
  if (!dateFrom || !dateTo) return 'Перевірте дати періоду.'
  const from = new Date(`${dateFrom}T00:00:00Z`).getTime()
  const to = new Date(`${dateTo}T00:00:00Z`).getTime()
  const days = Math.floor((to - from) / 86_400_000) + 1
  if (days < 1) return 'Перевірте дати періоду.'
  if (days > 31) return 'Період не може перевищувати 31 день.'
  return null
}
