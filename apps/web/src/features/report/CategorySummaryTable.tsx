import type { Report } from '../../shared/api/client'
import { formatMoney } from '../../shared/format'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../../shared/ui/Table'

export function CategorySummaryTable({ report }: { report: Report }) {
  return (
    <section className="card col-span-full overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <h2>Усі категорії</h2>
          <p className="m-0 text-xs text-[var(--muted-foreground)]">Повна структура витрат за обраний період</p>
        </div>
        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{report.categories.length} категорій</span>
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
          {report.categories.map((item) => (
            <TableRow key={item.category}>
              <TableCell className="font-medium">{item.category}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(item.totalUah, 'UAH')}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(item.totalEur, 'EUR')}</TableCell>
              <TableCell className="text-right tabular-nums text-[var(--muted-foreground)]">{Number(item.sharePct).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}%</TableCell>
              <TableCell className="text-right tabular-nums">{item.count}</TableCell>
            </TableRow>
          ))}
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
