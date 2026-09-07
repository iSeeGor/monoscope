import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReportControls } from './ReportControls'
import { validateDateRange } from './dateRange'

afterEach(cleanup)

describe('validateDateRange', () => {
  it('accepts 31 inclusive days and rejects 32', () => {
    expect(validateDateRange('2026-08-01', '2026-08-31')).toBeNull()
    expect(validateDateRange('2026-08-01', '2026-09-01')).toBe(
      'Період не може перевищувати 31 день.',
    )
  })
})

function LocationSearch() {
  const location = useLocation()
  return createElement('output', { 'aria-label': 'Параметри URL' }, location.search)
}

function renderControls(entry = '/overview?from=2026-09-01&to=2026-09-05') {
  const submit = vi.fn()
  render(
    createElement(
      MemoryRouter,
      { initialEntries: [entry] },
      createElement(ReportControls, { submit, pending: false }),
      createElement(LocationSearch),
    ),
  )
  return submit
}

describe('ReportControls card scope', () => {
  it('always includes the white card and leaves black disabled by default', async () => {
    const submit = renderControls()
    const user = userEvent.setup()

    expect(screen.getByLabelText('Біла картка, завжди включена')).toHaveTextContent(
      'Завжди',
    )
    expect(
      screen.getByRole('checkbox', { name: 'Додати чорну картку' }),
    ).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Сформувати звіт' }))

    expect(submit).toHaveBeenCalledWith({
      includeBlackCard: false,
      dateFrom: '2026-09-01',
      dateTo: '2026-09-05',
      includeHolds: true,
    })
    expect(screen.getByLabelText('Параметри URL')).not.toHaveTextContent('black=')
  })

  it('reads the legacy black-card URL and writes only the current parameter', async () => {
    const submit = renderControls(
      '/overview?card=black&from=2026-09-01&to=2026-09-05',
    )
    const user = userEvent.setup()

    expect(
      screen.getByRole('checkbox', { name: 'Додати чорну картку' }),
    ).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Сформувати звіт' }))

    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ includeBlackCard: true }),
    )
    expect(screen.getByLabelText('Параметри URL')).toHaveTextContent('black=true')
    expect(screen.getByLabelText('Параметри URL')).not.toHaveTextContent('card=')
  })
})
