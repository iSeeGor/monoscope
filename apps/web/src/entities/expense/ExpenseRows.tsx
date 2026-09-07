import type { Expense } from '../../shared/api/client'
import { formatDate, formatMoney } from '../../shared/format'
import { StatusBadge } from '../../shared/ui/StatusBadge'

export function ExpenseRows({
  expenses,
  compact = false,
  select,
}: {
  expenses: Expense[]
  compact?: boolean
  select?: (expense: Expense) => void
}) {
  return (
    <div className={compact ? 'expense-rows compact' : 'expense-rows'}>
      {expenses.map((expense) => (
        <button type="button" className="expense-row" key={expense.id} onClick={() => select?.(expense)}>
          <span className="expense-avatar">{expense.description.slice(0, 1).toUpperCase()}</span>
          <span className="expense-main"><strong>{expense.description}</strong><small>{formatDate(expense.occurredAt)} · {expense.category}</small></span>
          <StatusBadge hold={expense.hold} />
          <span className="expense-money"><strong>{formatMoney(expense.amountUah, 'UAH')}</strong><small>{formatMoney(expense.amountEur, 'EUR')}</small></span>
        </button>
      ))}
    </div>
  )
}
