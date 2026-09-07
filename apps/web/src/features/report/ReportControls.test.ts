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
  it('defaults to white-only and does not write the default cards parameter', async () => {
    const submit = renderControls()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Картки Біла' }))
    expect(screen.getByRole('checkbox', { name: 'Біла' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Біла' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Чорна' })).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Сформувати звіт' }))

    expect(submit).toHaveBeenCalledWith({
      cardTypes: ['white'],
      dateFrom: '2026-09-01',
      dateTo: '2026-09-05',
      includeHolds: true,
    })
    expect(screen.getByLabelText('Параметри URL')).not.toHaveTextContent('cards=')
  })

  it('supports black-only while disabling the last selected card', async () => {
    const submit = renderControls()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Картки Біла' }))
    await user.click(screen.getByRole('checkbox', { name: 'Чорна' }))
    await user.click(screen.getByRole('checkbox', { name: 'Біла' }))

    expect(screen.getByRole('checkbox', { name: 'Біла' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Чорна' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Чорна' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Сформувати звіт' }))

    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      cardTypes: ['black'],
    }))
    expect(screen.getByLabelText('Параметри URL')).toHaveTextContent('cards=black')
  })

  it('submits both cards in canonical white-first order', async () => {
    const submit = renderControls()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Картки Біла' }))
    await user.click(screen.getByRole('checkbox', { name: 'Чорна' }))
    expect(screen.getByRole('button', { name: 'Картки Біла, Чорна' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    await user.click(screen.getByRole('button', { name: 'Сформувати звіт' }))

    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      cardTypes: ['white', 'black'],
    }))
    expect(screen.getByLabelText('Параметри URL')).toHaveTextContent(
      'cards=white%2Cblack',
    )
  })

  it.each([
    '/overview?card=black&from=2026-09-01&to=2026-09-05',
    '/overview?black=true&from=2026-09-01&to=2026-09-05',
  ])('migrates legacy black scope from %s', async (entry) => {
    const submit = renderControls(entry)
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: 'Картки Біла, Чорна' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Сформувати звіт' }))

    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      cardTypes: ['white', 'black'],
    }))
    const url = screen.getByLabelText('Параметри URL')
    expect(url).toHaveTextContent('cards=white%2Cblack')
    expect(url).not.toHaveTextContent('card=black')
    expect(url).not.toHaveTextContent('black=true')
  })

  it('reads canonical black-only scope and closes with Escape or outside click', async () => {
    renderControls('/overview?cards=black&from=2026-09-01&to=2026-09-05')
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Картки Чорна' })

    await user.click(trigger)
    expect(screen.getByRole('checkbox', { name: 'Біла' })).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('checkbox', { name: 'Чорна' })).not.toBeInTheDocument()

    await user.click(trigger)
    await user.click(screen.getByLabelText('Дата від'))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
