import { NavLink } from 'react-router-dom'
import { ExpenseRows } from '../../entities/expense/ExpenseRows'
import type { Report } from '../../shared/api/client'
import { CategoryBarChart } from '../../shared/charts/CategoryBarChart'
import { SpendingTrendChart } from '../../shared/charts/SpendingTrendChart'
import { formatMoney } from '../../shared/format'
import { MetricCard } from '../../shared/ui/MetricCard'
import { CategorySummaryTable } from './CategorySummaryTable'
import { EmptyReportState } from './ReportStates'

export function ReportDashboard({ report }: { report: Report }) {
  if (report.expenses.length === 0) return <EmptyReportState />
  const combinedCards = report.meta.cardTypes.length === 2
  return (
    <div className="dashboard">
      <section className="metrics" aria-label="Ключові показники">
        <MetricCard label="Витрати у гривні" value={formatMoney(report.meta.totalUah, 'UAH')} note="За обраний період" />
        <MetricCard label="Витрати у євро" value={formatMoney(report.meta.totalEur, 'EUR')} note="За курсом у звіті" />
        <MetricCard label="Операції" value={String(report.meta.transactionCount)} note="Витратних транзакцій" />
        <MetricCard label="В очікуванні" value={String(report.meta.pendingCount)} note="Незавершених операцій" />
      </section>
      <SpendingTrendChart daily={report.daily} />
      <CategorySummaryTable report={report} />
      <CategoryBarChart categories={report.categories} />
      <section className="card recent">
        <div className="card-heading"><div><h2>Останні транзакції</h2><p>Найновіші у звіті</p></div><NavLink to="/transactions">Усі</NavLink></div>
        <ExpenseRows expenses={[...report.expenses].reverse().slice(0, 5)} compact showCard={combinedCards} />
      </section>
    </div>
  )
}
