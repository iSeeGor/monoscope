import type { Expense } from '../../shared/api/client'
import { formatMoney } from '../../shared/format'
import { sumMoney } from '../../shared/money'
import { MetricCard } from '../../shared/ui/MetricCard'

export function ExpenseTotals({ expenses, filtered }: { expenses: Expense[]; filtered: boolean }) {
  const scope = filtered ? 'За поточними фільтрами' : 'За весь звіт'
  const totalUah = sumMoney(expenses.map((expense) => expense.amountUah))
  const totalEur = sumMoney(expenses.map((expense) => expense.amountEur))
  return (
    <section className="metrics compact" aria-label="Підсумок показаних транзакцій">
      <MetricCard label="Сума у гривні" value={formatMoney(totalUah, 'UAH')} note={scope} />
      <MetricCard label="Сума у євро" value={formatMoney(totalEur, 'EUR')} note="За курсом у звіті" />
      <MetricCard label="Операції" value={String(expenses.length)} note={scope} />
    </section>
  )
}
