import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ReportRequest } from '../../shared/api/client'
import { todayKyiv } from '../../shared/format'
import { validateDateRange } from './dateRange'

export function ReportControls({
  submit,
  pending,
}: {
  submit: (request: ReportRequest) => void
  pending: boolean
}) {
  const [params, setParams] = useSearchParams()
  const today = todayKyiv()
  const [cardType, setCardType] = useState<'white' | 'black'>(params.get('card') === 'black' ? 'black' : 'white')
  const [dateFrom, setDateFrom] = useState(params.get('from') ?? `${today.slice(0, 8)}01`)
  const [dateTo, setDateTo] = useState(params.get('to') ?? today)
  const [includeHolds, setIncludeHolds] = useState(params.get('holds') !== 'false')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const validationError = validateDateRange(dateFrom, dateTo)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setParams({ card: cardType, from: dateFrom, to: dateTo, holds: String(includeHolds) })
    submit({ cardType, dateFrom, dateTo, includeHolds })
  }

  return (
    <form className="report-controls card" onSubmit={handleSubmit} aria-label="Параметри звіту">
      <div className="control-group">
        <span className="label">Картка</span>
        <div className="segmented">
          <button type="button" aria-pressed={cardType === 'white'} onClick={() => setCardType('white')}>Біла</button>
          <button type="button" aria-pressed={cardType === 'black'} onClick={() => setCardType('black')}>Чорна</button>
        </div>
      </div>
      <label><span className="label">Від</span><input aria-label="Дата від" name="dateFrom" type="date" value={dateFrom} max={today} onChange={(event) => setDateFrom(event.target.value)} /></label>
      <label><span className="label">До</span><input aria-label="Дата до" name="dateTo" type="date" value={dateTo} max={today} onChange={(event) => setDateTo(event.target.value)} /></label>
      <label className="switch-label"><input name="includeHolds" type="checkbox" checked={includeHolds} onChange={(event) => setIncludeHolds(event.target.checked)} /><span className="switch" />Врахувати холди</label>
      <button className="primary-button" disabled={pending} type="submit">{pending ? 'Формуємо…' : 'Сформувати звіт'}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  )
}
