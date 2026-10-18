import { ChartNoAxesCombined, CircleAlert, Clock3 } from 'lucide-react'
import { ApiError } from '../../shared/api/client'
import { Card } from '../../shared/ui/Card'

export function InitialReportState() {
  return <section className="state-card card"><div className="state-icon"><ChartNoAxesCombined /></div><h2>Сформуйте перший звіт</h2><p>Оберіть період до 31 дня. Біла картка включена завжди, чорну можна додати.</p></section>
}

export function LoadingReportState() {
  return <div aria-live="polite" aria-label="Звіт завантажується">
    <Card className="mt-4 flex items-start gap-3 p-4" role="status">
      <Clock3 className="mt-0.5 shrink-0 text-[var(--primary)]" size={20} />
      <div><h2 className="mb-1">Формуємо звіт</h2><p className="mb-0 text-sm text-[var(--muted-foreground)]">Якщо перед цим завантажувалась виписка ФОП або іншої картки, Monobank може очікувати наступний доступний запит близько хвилини.</p></div>
    </Card>
    <div className="skeleton-grid">{Array.from({ length: 7 }, (_, index) => <div className="skeleton" key={index} />)}</div>
  </div>
}

export function EmptyReportState() {
  return <section className="state-card card"><h2>Витрат за цей період немає</h2><p>Спробуйте інший період, додайте чорну картку або увімкніть холди.</p></section>
}

export function ErrorReportState({ error, retry }: { error: Error; retry: () => void }) {
  const requestId = error instanceof ApiError ? error.requestId : undefined
  return <section className="state-card card" role="alert"><div className="state-icon danger"><CircleAlert /></div><h2>Звіт не сформовано</h2><p>{error.message}</p>{requestId && <small>Код запиту: {requestId}</small>}<button className="secondary-button" onClick={retry}>Спробувати ще раз</button></section>
}
