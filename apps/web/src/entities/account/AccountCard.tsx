import { Building2, Check } from 'lucide-react'
import type { Account } from '../../shared/api/client'
import { formatMoney } from '../../shared/format'
import { Card, CardContent, CardHeader } from '../../shared/ui/Card'

export function AccountCard({ account, selected, onSelect, balance = account.balance }: { account: Account; selected: boolean; onSelect: () => void; balance?: string }) {
  return (
    <Card className={selected ? 'border-[var(--primary)] ring-2 ring-[color-mix(in_srgb,var(--primary)_15%,transparent)]' : undefined}>
      <button className="w-full text-left" type="button" onClick={onSelect} aria-pressed={selected}>
        <CardHeader className="flex-row items-start justify-between">
          <span className="grid size-10 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"><Building2 size={20} /></span>
          {selected && <Check className="text-[var(--primary)]" size={18} aria-label="Вибраний рахунок" />}
        </CardHeader>
        <CardContent>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{account.name || 'Рахунок ФОП'}</p>
          <strong className="text-xl tabular-nums">{formatMoney(balance, account.currency)}</strong>
          <p className="mt-3 mb-0 truncate font-mono text-xs text-[var(--muted-foreground)]">{account.iban || 'IBAN не вказано'}</p>
        </CardContent>
      </button>
    </Card>
  )
}
