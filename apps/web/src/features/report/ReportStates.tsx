import { ChartNoAxesCombined, CircleAlert } from 'lucide-react'
import { ApiError } from '../../shared/api/client'

export function InitialReportState() {
  return <section className="state-card card"><div className="state-icon"><ChartNoAxesCombined /></div><h2>Сформуйте перший звіт</h2><p>Оберіть картку й період до 31 дня. Розрахунки виконає локальний API.</p></section>
}

export function LoadingReportState() {
  return <div className="skeleton-grid" aria-live="polite" aria-label="Звіт завантажується">{Array.from({ length: 7 }, (_, index) => <div className="skeleton" key={index} />)}</div>
}

export function EmptyReportState() {
  return <section className="state-card card"><h2>Витрат за цей період немає</h2><p>Спробуйте інший період або увімкніть холди.</p></section>
}

export function ErrorReportState({ error, retry }: { error: Error; retry: () => void }) {
  const requestId = error instanceof ApiError ? error.requestId : undefined
  return <section className="state-card card" role="alert"><div className="state-icon danger"><CircleAlert /></div><h2>Звіт не сформовано</h2><p>{error.message}</p>{requestId && <small>Код запиту: {requestId}</small>}<button className="secondary-button" onClick={retry}>Спробувати ще раз</button></section>
}
