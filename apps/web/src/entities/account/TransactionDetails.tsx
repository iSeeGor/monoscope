import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { AccountTransaction } from '../../shared/api/client'
import { formatDate, formatMoney } from '../../shared/format'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'

function Detail({ label, value }: { label: string; value: string | null }) {
  return <div className="flex justify-between gap-6 border-t border-[var(--border)] py-3 text-sm"><dt className="text-[var(--muted-foreground)]">{label}</dt><dd className="m-0 break-all text-right">{value || '—'}</dd></div>
}

export function TransactionDetails({ transaction, close }: { transaction: AccountTransaction; close: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLElement>(null)
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  }, [close])
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButton.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
      if (event.key === 'Tab') {
        const focusable = dialog.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5 backdrop-blur-sm" onMouseDown={close}>
      <Card ref={dialog} className="relative max-h-[calc(100vh-40px)] w-full max-w-lg overflow-auto p-7" role="dialog" aria-modal="true" aria-labelledby="account-transaction-title" onMouseDown={(event) => event.stopPropagation()}>
        <Button ref={closeButton} variant="ghost" className="absolute top-3 right-3 size-9 p-0" onClick={close} aria-label="Закрити"><X /></Button>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{transaction.direction === 'incoming' ? 'Надходження' : 'Списання'}</p>
        <h2 id="account-transaction-title" className="pr-8">{transaction.counterName || transaction.description}</h2>
        <p className="text-sm text-[var(--muted-foreground)]">{transaction.comment || transaction.description}</p>
        <strong className={`my-6 block text-3xl tabular-nums ${transaction.direction === 'incoming' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
          {transaction.direction === 'incoming' ? '+' : '−'}{formatMoney(transaction.amount.replace(/^-/, ''), transaction.currency)}
        </strong>
        <dl className="m-0">
          <Detail label="Дата" value={formatDate(transaction.occurredAt, { year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
          <Detail label="Платник / отримувач" value={transaction.counterName} />
          <Detail label="ЄДРПОУ" value={transaction.counterEdrpou} />
          <Detail label="IBAN контрагента" value={transaction.counterIban} />
          <Detail label="Призначення" value={transaction.comment || transaction.description} />
          <Detail label="Сума операції" value={formatMoney(transaction.operationAmount, transaction.operationCurrency)} />
          <Detail label="Баланс після операції" value={formatMoney(transaction.balanceAfter, transaction.currency)} />
          <Detail label="Статус" value={transaction.hold ? 'В обробці' : 'Проведено'} />
          <Detail label="ID інвойсу / платежу" value={transaction.invoiceId} />
          <Detail label="ID квитанції" value={transaction.receiptId} />
        </dl>
      </Card>
    </div>
  )
}
