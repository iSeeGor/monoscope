import { X } from 'lucide-react'
import type { Expense } from '../../shared/api/client'
import { formatDate, formatMoney } from '../../shared/format'
import { CardBadge } from '../../shared/ui/CardBadge'
import { StatusBadge } from '../../shared/ui/StatusBadge'

export function ExpenseDetails({ expense, close }: { expense: Expense; close: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="details card" role="dialog" aria-modal="true" aria-labelledby="details-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button close" onClick={close} aria-label="Закрити"><X /></button>
        <span className="expense-avatar large">{expense.description.slice(0, 1).toUpperCase()}</span>
        <h2 id="details-title">{expense.description}</h2>
        <p>{expense.comment || 'Без коментаря'}</p>
        <strong className="detail-total">{formatMoney(expense.amountUah, 'UAH')}</strong>
        <dl>
          <div><dt>Дата</dt><dd>{formatDate(expense.occurredAt, { year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
          <div><dt>Категорія</dt><dd>{expense.category}</dd></div>
          <div><dt>Картка</dt><dd><CardBadge cardType={expense.cardType} /></dd></div>
          <div><dt>Статус</dt><dd><StatusBadge hold={expense.hold} /></dd></div>
          <div><dt>Оригінальна сума</dt><dd>{formatMoney(expense.amountOriginal, expense.currencyOriginal)}</dd></div>
          <div><dt>Курс</dt><dd>{expense.rateUsed ?? '—'} {expense.rateSource ?? ''}</dd></div>
          <div><dt>MCC</dt><dd>{expense.mcc ?? '—'}</dd></div>
        </dl>
      </section>
    </div>
  )
}
