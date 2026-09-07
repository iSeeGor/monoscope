import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { ListFilter, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ExpenseDetails } from '../entities/expense/ExpenseDetails'
import { ExpenseRows } from '../entities/expense/ExpenseRows'
import { ExpenseTotals } from '../entities/expense/ExpenseTotals'
import { InitialReportState } from '../features/report/ReportStates'
import type { Expense, Report } from '../shared/api/client'

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  rowSortingFeature,
  sortFns: { alphanumeric: sortFn_alphanumeric },
  sortedRowModel: createSortedRowModel(),
})
const helper = createColumnHelper<typeof features, Expense>()
const columns = helper.columns([
  helper.accessor('description', { header: 'Опис' }),
  helper.accessor('comment', { header: 'Коментар' }),
  helper.accessor('category', { header: 'Категорія' }),
  helper.accessor('cardType', { header: 'Картка' }),
  helper.accessor('hold', { header: 'Холд' }),
  helper.accessor('occurredAt', { header: 'Дата' }),
  helper.accessor((expense) => Number(expense.amountUah), { id: 'amountUah', header: 'Сума' }),
])
const EMPTY_EXPENSES: Expense[] = []

export default function TransactionsPage({ report }: { report: Report | null }) {
  const [selected, setSelected] = useState<Expense | null>(null)
  const categories = useMemo(() => [...new Set(report?.expenses.map((item) => item.category) ?? [])].sort(), [report])
  const data = report?.expenses ?? EMPTY_EXPENSES
  const combinedCards = report?.meta.cardTypes.length === 2
  const table = useTable({
    features,
    columns,
    data,
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: (column) => column.id === 'description' || column.id === 'comment',
    initialState: { sorting: [{ id: 'occurredAt', desc: true }] },
  })
  const expenses = table.getRowModel().rows.map((row) => row.original)

  function setStatus(value: string) {
    table.getColumn('hold')?.setFilterValue(value === 'all' ? undefined : value === 'hold')
  }

  function setCardType(value: string) {
    table.getColumn('cardType')?.setFilterValue(value === 'all' ? undefined : value)
  }

  function setSort(value: string) {
    const [id, direction] = value.split('-')
    table.setSorting([{ id: id === 'amount' ? 'amountUah' : 'occurredAt', desc: direction === 'desc' }])
  }

  return (
    <div className="page">
      <div className="page-heading"><div><p className="eyebrow">Деталізація</p><h1>Транзакції</h1><p>{report ? `${expenses.length} із ${report.expenses.length} операцій` : 'Спочатку сформуйте звіт на сторінці огляду.'}</p></div></div>
      {!report ? <InitialReportState /> : <>
        <section className={`filters card${combinedCards ? ' combined-cards' : ''}`}>
          <label className="search" htmlFor="transaction-search"><Search size={18} /><input id="transaction-search" name="transactionSearch" aria-label="Пошук транзакцій" placeholder="Опис або коментар…" onChange={(event) => table.setGlobalFilter(event.target.value)} /></label>
          <label htmlFor="category-filter"><ListFilter size={17} /><select id="category-filter" name="categoryFilter" aria-label="Категорія" onChange={(event) => table.getColumn('category')?.setFilterValue(event.target.value === 'all' ? undefined : event.target.value)}><option value="all">Усі категорії</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          {combinedCards && <select id="card-type-filter" name="cardTypeFilter" aria-label="Картка" onChange={(event) => setCardType(event.target.value)}><option value="all">Усі картки</option><option value="white">Біла</option><option value="black">Чорна</option></select>}
          <select id="status-filter" name="statusFilter" aria-label="Статус" onChange={(event) => setStatus(event.target.value)}><option value="all">Усі статуси</option><option value="complete">Завершено</option><option value="hold">Холд</option></select>
          <select id="transaction-sort" name="transactionSort" aria-label="Сортування" defaultValue="date-desc" onChange={(event) => setSort(event.target.value)}><option value="date-desc">Спочатку нові</option><option value="date-asc">Спочатку старі</option><option value="amount-desc">Сума: від більшої</option><option value="amount-asc">Сума: від меншої</option></select>
        </section>
        {expenses.length > 0 && <ExpenseTotals expenses={expenses} filtered={expenses.length !== report.expenses.length} />}
        {expenses.length ? <section className="transactions-card card"><div className="table-head"><span>Операція</span><span>Статус</span><span>Сума</span></div><ExpenseRows expenses={expenses} select={setSelected} showCard={combinedCards} /></section> : <section className="state-card card"><h2>Нічого не знайдено</h2><p>Змініть пошук або фільтри.</p></section>}
      </>}
      {selected && <ExpenseDetails expense={selected} close={() => setSelected(null)} />}
    </div>
  )
}
