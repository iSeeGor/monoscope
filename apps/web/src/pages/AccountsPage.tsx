import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock3, Landmark, RefreshCw } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { AccountCard } from '../entities/account/AccountCard'
import { TransactionDetails } from '../entities/account/TransactionDetails'
import { defaultStatementRange, validateStatementRange } from '../features/accounts/dateRange'
import { ApiError, getAccounts, getAccountStatement, type AccountTransaction, type StatementRequest } from '../shared/api/client'
import { formatDate, formatMoney } from '../shared/format'
import { Button } from '../shared/ui/Button'
import { Card, CardContent } from '../shared/ui/Card'
import { Input } from '../shared/ui/Input'
import { Select } from '../shared/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../shared/ui/Table'

type DirectionFilter = 'all' | AccountTransaction['direction']
type AppliedStatement = { accountId: string; range: StatementRequest }
const ACCOUNT_LIST_STALE_MS = 24 * 60 * 60 * 1_000
const STATEMENT_STALE_MS = 61_000

function StateCard({ title, message, retry }: { title: string; message: string; retry?: () => void }) {
  return <Card className="mx-auto my-12 max-w-xl p-10 text-center"><AlertTriangle className="mx-auto mb-4 text-[var(--muted-foreground)]" /><h2>{title}</h2><p className="text-sm text-[var(--muted-foreground)]">{message}</p>{retry && <Button variant="outline" onClick={retry}><RefreshCw size={16} />Спробувати ще</Button>}</Card>
}

function StatementLoadingState() {
  return <div aria-live="polite" aria-label="Виписка завантажується">
    <Card className="mb-4 flex items-start gap-3 p-4" role="status"><Clock3 className="mt-0.5 shrink-0 text-[var(--primary)]" size={20} /><div><h2 className="mb-1">Завантажуємо виписку</h2><p className="mb-0 text-sm text-[var(--muted-foreground)]">Після іншого запиту виписки Monobank очікування може тривати близько хвилини.</p></div></Card>
    <div className="skeleton min-h-72" />
  </div>
}

export default function AccountsPage() {
  const initialRange = useMemo(() => defaultStatementRange(), [])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [draftRange, setDraftRange] = useState<StatementRequest>(initialRange)
  const [appliedStatement, setAppliedStatement] = useState<AppliedStatement | null>(null)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [direction, setDirection] = useState<DirectionFilter>('all')
  const [selectedTransaction, setSelectedTransaction] = useState<AccountTransaction | null>(null)
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    retry: false,
    staleTime: ACCOUNT_LIST_STALE_MS,
    refetchOnWindowFocus: false,
  })
  const defaultAccountId = accountsQuery.data?.find((account) => account.currency === 'UAH')?.id ?? accountsQuery.data?.[0]?.id ?? null
  const activeAccountId = selectedAccountId ?? defaultAccountId

  const statementQuery = useQuery({
    queryKey: ['account-statement', appliedStatement?.accountId, appliedStatement?.range.dateFrom, appliedStatement?.range.dateTo],
    queryFn: () => getAccountStatement(appliedStatement!.accountId, appliedStatement!.range),
    enabled: Boolean(appliedStatement),
    retry: false,
    staleTime: STATEMENT_STALE_MS,
    refetchOnWindowFocus: false,
  })
  const visibleTransactions = useMemo(
    () => statementQuery.data?.transactions.filter((transaction) => direction === 'all' || transaction.direction === direction) ?? [],
    [direction, statementQuery.data],
  )

  function applyRange(event: FormEvent) {
    event.preventDefault()
    const error = validateStatementRange(draftRange.dateFrom, draftRange.dateTo)
    setRangeError(error)
    if (!error && activeAccountId) {
      setSelectedTransaction(null)
      const sameRequest = appliedStatement?.accountId === activeAccountId
        && appliedStatement.range.dateFrom === draftRange.dateFrom
        && appliedStatement.range.dateTo === draftRange.dateTo
      if (sameRequest) {
        void statementQuery.refetch()
      } else {
        setAppliedStatement({ accountId: activeAccountId, range: { ...draftRange } })
      }
    }
  }

  if (accountsQuery.isPending) return <div className="page"><div className="skeleton-grid" aria-label="Рахунки завантажуються"><div className="skeleton" /><div className="skeleton" /></div></div>
  if (accountsQuery.isError) return <div className="page"><StateCard title="Не вдалося завантажити рахунки" message={accountsQuery.error.message} retry={() => void accountsQuery.refetch()} /></div>
  if (!accountsQuery.data.length) return <div className="page"><StateCard title="Рахунків ФОП не знайдено" message="Перевірте, чи рахунок доступний для токена Monobank." /></div>

  return (
    <div className="page">
      <div className="page-heading"><div><p className="eyebrow">Бізнес-фінанси</p><h1>Рахунки ФОП</h1><p>Баланс зі списку рахунків та рух коштів за вибраний період. Після завантаження виписки баланс активного рахунку уточнюється.</p></div></div>
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accountsQuery.data.map((account) => {
          const latestBalance = statementQuery.data?.accountId === account.id ? statementQuery.data.transactions[0]?.balanceAfter : undefined
          return <AccountCard key={account.id} account={account} balance={latestBalance} selected={account.id === activeAccountId} onSelect={() => { setSelectedAccountId(account.id); setAppliedStatement(null); setSelectedTransaction(null); setRangeError(null) }} />
        })}
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <form className="grid items-end gap-3 md:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={applyRange}>
            <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">Дата від<Input type="date" aria-label="Дата виписки від" value={draftRange.dateFrom} max={draftRange.dateTo} onChange={(event) => setDraftRange((range) => ({ ...range, dateFrom: event.target.value }))} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">Дата до<Input type="date" aria-label="Дата виписки до" value={draftRange.dateTo} min={draftRange.dateFrom} onChange={(event) => setDraftRange((range) => ({ ...range, dateTo: event.target.value }))} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">Тип операції<Select aria-label="Тип операції" value={direction} onChange={(event) => setDirection(event.target.value as DirectionFilter)}><option value="all">Усі операції</option><option value="incoming">Надходження</option><option value="outgoing">Списання</option></Select></label>
            <Button type="submit" disabled={statementQuery.isFetching}>{statementQuery.isFetching ? 'Завантажуємо…' : 'Завантажити виписку'}</Button>
          </form>
          {rangeError && <p className="mt-2 mb-0 text-xs text-[var(--danger)]" role="alert">{rangeError}</p>}
        </CardContent>
      </Card>

      {!appliedStatement && <Card className="mx-auto my-12 max-w-xl p-10 text-center"><Landmark className="mx-auto mb-4 text-[var(--primary)]" /><h2>Виписку ще не завантажено</h2><p className="mb-0 text-sm text-[var(--muted-foreground)]">Оберіть рахунок і період, а потім натисніть «Завантажити виписку». До цього моменту statement-запит до Monobank не виконується.</p></Card>}
      {appliedStatement && statementQuery.isFetching && <StatementLoadingState />}
      {appliedStatement && statementQuery.isError && <StateCard title="Не вдалося завантажити виписку" message={`${statementQuery.error.message}${statementQuery.error instanceof ApiError && statementQuery.error.requestId ? ` Код запиту: ${statementQuery.error.requestId}.` : ''}`} retry={() => void statementQuery.refetch()} />}
      {appliedStatement && statementQuery.isSuccess && !visibleTransactions.length && <StateCard title="Операцій не знайдено" message={direction === 'all' ? 'За вибраний період руху коштів не було.' : 'Змініть тип операції або період.'} />}
      {appliedStatement && statementQuery.isSuccess && visibleTransactions.length > 0 && <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4"><div><h2 className="mb-1">Виписка</h2><p className="mb-0 text-xs text-[var(--muted-foreground)]">{visibleTransactions.length} операцій · {appliedStatement.range.dateFrom} — {appliedStatement.range.dateTo}</p></div><Landmark className="text-[var(--primary)]" /></div>
        <Table>
          <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Контрагент / призначення</TableHead><TableHead>Статус</TableHead><TableHead className="text-right">Сума</TableHead></TableRow></TableHeader>
          <TableBody>{visibleTransactions.map((transaction) => <TableRow key={transaction.id}>
            <TableCell className="whitespace-nowrap text-xs text-[var(--muted-foreground)]">{formatDate(transaction.occurredAt, { year: 'numeric' })}</TableCell>
            <TableCell><Button variant="ghost" className="h-auto w-full justify-start whitespace-normal p-0 text-left hover:bg-transparent" aria-haspopup="dialog" aria-label={`Деталі операції ${transaction.counterName || transaction.description}`} onClick={() => setSelectedTransaction(transaction)}><span><strong className="block text-sm text-[var(--foreground)]">{transaction.counterName || transaction.description}</strong><span className="block max-w-xl truncate text-xs text-[var(--muted-foreground)]">{transaction.comment || transaction.description}</span></span></Button></TableCell>
            <TableCell><span className={`rounded-full px-2 py-1 text-xs font-semibold ${transaction.hold ? 'bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]' : 'bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]'}`}>{transaction.hold ? 'В обробці' : 'Проведено'}</span></TableCell>
            <TableCell className={`whitespace-nowrap text-right font-semibold tabular-nums ${transaction.direction === 'incoming' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>{transaction.direction === 'incoming' ? '+' : '−'}{formatMoney(transaction.amount.replace(/^-/, ''), transaction.currency)}</TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </Card>}
      {selectedTransaction && <TransactionDetails transaction={selectedTransaction} close={() => setSelectedTransaction(null)} />}
    </div>
  )
}
