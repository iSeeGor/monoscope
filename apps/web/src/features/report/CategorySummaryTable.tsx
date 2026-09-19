import { Fragment, useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Report } from '../../shared/api/client'
import { formatDate, formatMoney } from '../../shared/format'
import { CardBadge } from '../../shared/ui/CardBadge'
import { StatusBadge } from '../../shared/ui/StatusBadge'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../../shared/ui/Table'

export function CategorySummaryTable({ report }: { report: Report }) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const detailsId = useId()
  const showCard = report.meta.cardTypes.length > 1

  return (
    <section className="card recent col-span-full">
      <div className="card-heading">
        <div>
          <h2>Усі категорії</h2>
          <p>Повна структура витрат за обраний період</p>
        </div>
        <span className="shrink-0 text-xs text-(--muted-foreground)">{report.categories.length} категорій</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Категорія</TableHead>
            <TableHead className="text-right">Сума, грн</TableHead>
            <TableHead className="text-right">Сума, EUR</TableHead>
            <TableHead className="text-right">Частка</TableHead>
            <TableHead className="text-right">Операції</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.categories.map((item, index) => {
            const expanded = expandedCategory === item.category
            const categoryExpenses = expanded
              ? report.expenses.filter((expense) => expense.category === item.category)
              : []
            const panelId = `${detailsId}-${index}`

            return (
              <Fragment key={item.category}>
                <TableRow className={expanded ? 'bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]' : undefined}>
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-sm text-left hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--ring)"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => setExpandedCategory(expanded ? null : item.category)}
                    >
                      <ChevronDown
                        aria-hidden="true"
                        size={16}
                        className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      />
                      {item.category}
                    </button>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(item.totalUah, 'UAH')}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(item.totalEur, 'EUR')}</TableCell>
                  <TableCell className="text-right tabular-nums text-(--muted-foreground)">{Number(item.sharePct).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}%</TableCell>
                  <TableCell className="text-right tabular-nums">{item.count}</TableCell>
                </TableRow>
                {expanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell id={panelId} colSpan={5} className="bg-(--background) p-0">
                      <ul aria-label={`Операції категорії «${item.category}»`} className="divide-y divide-(--border)">
                        {categoryExpenses.map((expense) => (
                          <li key={`${expense.cardType}:${expense.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:pl-10">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">{expense.description}</span>
                                {showCard && <CardBadge cardType={expense.cardType} />}
                              </div>
                              <span className="text-xs text-(--muted-foreground)">{formatDate(expense.occurredAt)}</span>
                            </div>
                            <StatusBadge hold={expense.hold} />
                            <div className="ml-auto text-right tabular-nums">
                              <div className="text-sm font-medium">{formatMoney(expense.amountUah, 'UAH')}</div>
                              <div className="text-xs text-(--muted-foreground)">{formatMoney(expense.amountEur, 'EUR')}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell>Усього</TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(report.meta.totalUah, 'UAH')}</TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(report.meta.totalEur, 'EUR')}</TableCell>
            <TableCell className="text-right">100%</TableCell>
            <TableCell className="text-right tabular-nums">{report.meta.transactionCount}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </section>
  )
}
