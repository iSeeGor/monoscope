import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Report } from '../api/client'
import { formatMoney } from '../format'

export function CategoryBarChart({ categories }: { categories: Report['categories'] }) {
  const data = categories.slice(0, 6).map((item) => ({ ...item, value: Number(item.totalUah) }))
  return (
    <section className="chart-card card">
      <div className="card-heading"><div><h2>Категорії</h2><p>Розподіл витрат</p></div></div>
      <div className="chart category-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} width={90} stroke="var(--chart-axis)" fontSize={11} />
            <Tooltip formatter={(value) => formatMoney(String(value), 'UAH')} />
            <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
