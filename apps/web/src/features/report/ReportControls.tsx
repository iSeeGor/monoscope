import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ReportRequest } from '../../shared/api/client'
import { todayKyiv } from '../../shared/format'
import { CardTypeSelector } from './CardTypeSelector'
import { cardTypesParam, readCardTypes } from './cardTypes'
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
  const [cardTypes, setCardTypes] = useState(() => readCardTypes(params))
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
    const cards = cardTypesParam(cardTypes)
    if (cards) nextParams.set('cards', cards)
    setParams(nextParams)
    submit({ cardTypes, dateFrom, dateTo, includeHolds })
  }

  return (
    <form className="report-controls card" onSubmit={handleSubmit} aria-label="Параметри звіту">
      <CardTypeSelector value={cardTypes} onChange={setCardTypes} />
      <label htmlFor="report-date-from"><span className="label">Від</span><input id="report-date-from" aria-label="Дата від" name="dateFrom" type="date" value={dateFrom} max={today} onChange={(event) => setDateFrom(event.target.value)} /></label>
      <label htmlFor="report-date-to"><span className="label">До</span><input id="report-date-to" aria-label="Дата до" name="dateTo" type="date" value={dateTo} max={today} onChange={(event) => setDateTo(event.target.value)} /></label>
      <label className="switch-label" htmlFor="include-holds"><input id="include-holds" name="includeHolds" type="checkbox" checked={includeHolds} onChange={(event) => setIncludeHolds(event.target.checked)} /><span className="switch" />Врахувати холди</label>
      <button className="primary-button" disabled={pending} type="submit">{pending ? 'Формуємо…' : 'Сформувати звіт'}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  )
}
