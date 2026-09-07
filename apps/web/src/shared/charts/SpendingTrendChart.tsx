import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Report } from '../api/client'
import { formatDate, formatMoney } from '../format'

export function SpendingTrendChart({ daily }: { daily: Report['daily'] }) {
  const data = daily.map((item) => ({
    ...item,
    value: Number(item.totalUah),
    label: formatDate(item.date),
  }))
  return (
    <section className="chart-card card wide">
      <div className="card-heading"><div><h2>Динаміка витрат</h2><p>Щоденні витрати у гривні</p></div></div>
      <div className="chart" aria-label="Графік щоденних витрат">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="spending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity=".35" />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} stroke="var(--chart-axis)" fontSize={12} />
            <YAxis axisLine={false} tickLine={false} stroke="var(--chart-axis)" fontSize={12} width={55} />
            <Tooltip formatter={(value) => formatMoney(String(value), 'UAH')} />
            <Area type="monotone" dataKey="value" stroke="var(--chart-1)" fill="url(#spending)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-alternative">
        <summary>Табличні дані графіка</summary>
        {daily.map((item) => <p key={item.date}>{formatDate(item.date)} — {formatMoney(item.totalUah, 'UAH')}</p>)}
      </details>
    </section>
  )
}
