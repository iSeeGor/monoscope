import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Report } from '../api/client'
import { formatMoney } from '../format'

export function CategoryBarChart({ categories }: { categories: Report['categories'] }) {
  const rows = categories.slice(0, 6)
  const data = rows.map((item) => ({ ...item, value: Number(item.totalUah) }))
  return (
    <section className="chart-card card">
      <div className="card-heading"><div><h2>Категорії</h2><p>Розподіл витрат</p></div></div>
      <div className="chart category-chart" aria-label="Графік витрат за категоріями">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} width={90} stroke="var(--chart-axis)" fontSize={11} />
            <Tooltip cursor={{ fill: 'var(--chart-grid)', fillOpacity: 0.35 }} content={({ active, label }) => {
              const item = active ? rows.find((row) => row.category === String(label)) : undefined
              if (!item) return null
              return (
                <div className="chart-tooltip">
                  <span>{item.category}</span>
                  <strong>{formatMoney(item.totalUah, 'UAH')}</strong>
                  <small>{formatMoney(item.totalEur, 'EUR')}</small>
                </div>
              )
            }} />
            <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-alternative">
        <summary>Табличні дані графіка</summary>
        {rows.map((item) => <p key={item.category}>{item.category} — {formatMoney(item.totalUah, 'UAH')} · {formatMoney(item.totalEur, 'EUR')}</p>)}
      </details>
    </section>
  )
}
