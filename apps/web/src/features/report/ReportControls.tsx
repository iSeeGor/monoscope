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
  const [includeBlackCard, setIncludeBlackCard] = useState(
    params.get('black') === 'true' || params.get('card') === 'black',
  )
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
    const nextParams = new URLSearchParams({
      from: dateFrom,
      to: dateTo,
      holds: String(includeHolds),
    })
    if (includeBlackCard) nextParams.set('black', 'true')
    setParams(nextParams)
    submit({ includeBlackCard, dateFrom, dateTo, includeHolds })
  }

  return (
    <form className="report-controls card" onSubmit={handleSubmit} aria-label="Параметри звіту">
      <fieldset className="card-scope">
        <legend className="label">Картки</legend>
        <div className="always-card" aria-label="Біла картка, завжди включена">
          <span>Біла картка</span>
          <strong>Завжди</strong>
        </div>
        <label className="switch-label" htmlFor="include-black-card">
          <input id="include-black-card" name="includeBlackCard" type="checkbox" checked={includeBlackCard} onChange={(event) => setIncludeBlackCard(event.target.checked)} />
          <span className="switch" />
          Додати чорну картку
        </label>
      </fieldset>
      <label htmlFor="report-date-from"><span className="label">Від</span><input id="report-date-from" aria-label="Дата від" name="dateFrom" type="date" value={dateFrom} max={today} onChange={(event) => setDateFrom(event.target.value)} /></label>
      <label htmlFor="report-date-to"><span className="label">До</span><input id="report-date-to" aria-label="Дата до" name="dateTo" type="date" value={dateTo} max={today} onChange={(event) => setDateTo(event.target.value)} /></label>
      <label className="switch-label" htmlFor="include-holds"><input id="include-holds" name="includeHolds" type="checkbox" checked={includeHolds} onChange={(event) => setIncludeHolds(event.target.checked)} /><span className="switch" />Врахувати холди</label>
      <button className="primary-button" disabled={pending} type="submit">{pending ? 'Формуємо…' : 'Сформувати звіт'}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  )
}
