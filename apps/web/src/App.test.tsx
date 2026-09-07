import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const report = {
  reportId: 'rpt_test',
  cached: false,
  meta: {
    cardTypes: ['white', 'black'],
    dateFrom: '2026-09-01',
    dateTo: '2026-09-05',
    generatedAt: '2026-09-05T18:00:00+03:00',
    transactionCount: 1,
    pendingCount: 0,
    totalUah: '640.00',
    totalEur: '13.18',
  },
  categories: [{ category: 'Продукти', totalUah: '640.00', totalEur: '13.18', sharePct: '100.00', count: 1 }],
  daily: [{ date: '2026-09-01', totalUah: '640.00', totalEur: '13.18', count: 1 }],
  expenses: [
    {
      id: 'expense-black',
      occurredAt: '2026-09-01T13:45:00+03:00',
      description: 'Сільпо',
      comment: '',
      mcc: 5411,
      category: 'Продукти',
      amountOriginal: '640.00',
      currencyOriginal: 'UAH',
      amountUah: '640.00',
      amountEur: '13.18',
      rateUsed: '48.5584',
      rateSource: 'nbu',
      hold: false,
      cardType: 'black',
    },
    {
      id: 'expense-white',
      occurredAt: '2026-09-02T10:00:00+03:00',
      description: 'Тестова книгарня',
      comment: 'Книга',
      mcc: 5942,
      category: 'Покупки',
      amountOriginal: '300.00',
      currencyOriginal: 'UAH',
      amountUah: '300.00',
      amountEur: '6.18',
      rateUsed: '48.5584',
      rateSource: 'nbu',
      hold: false,
      cardType: 'white',
    },
  ],
}

function renderApp() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/overview']}><App /></MemoryRouter></QueryClientProvider>)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('report flow', () => {
  it('submits explicit report controls with selected values', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(report), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('checkbox', { name: 'Додати чорну картку' }))
    await user.clear(screen.getByLabelText('Дата від'))
    await user.type(screen.getByLabelText('Дата від'), '2026-09-01')
    await user.clear(screen.getByLabelText('Дата до'))
    await user.type(screen.getByLabelText('Дата до'), '2026-09-05')
    await user.click(await screen.findByRole('button', { name: 'Сформувати звіт' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      includeBlackCard: true,
      dateFrom: '2026-09-01',
      dateTo: '2026-09-05',
      includeHolds: true,
    })
  })

  it('renders server-provided dashboard totals and transactions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(report), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Сформувати звіт' }))

    expect(await screen.findByText('Динаміка витрат')).toBeInTheDocument()
    expect(screen.getAllByText(/640,00/).length).toBeGreaterThan(0)
    expect(screen.getByText('Сільпо')).toBeInTheDocument()
    expect(screen.getByText('Біла та чорна картки')).toBeInTheDocument()
    expect(screen.getByText('Чорна', { selector: '.card-badge' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CSV/ })).toHaveAttribute('href', '/api/v1/reports/rpt_test/export.csv')
  })

  it('filters a combined report by card on the transactions page', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(report), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Сформувати звіт' }))
    await screen.findByText('Сільпо')

    await user.click(screen.getAllByRole('link', { name: 'Транзакції' })[0])
    await user.selectOptions(await screen.findByLabelText('Картка'), 'white')

    expect(screen.getByText('Тестова книгарня')).toBeInTheDocument()
    expect(screen.queryByText('Сільпо')).not.toBeInTheDocument()
  })

  it('translates stable API errors for the user', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'MONOBANK_UNAVAILABLE',
            message: 'Could not load data from Monobank.',
            requestId: 'request-test',
          },
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Сформувати звіт' }))

    expect(
      await screen.findByText(
        'Не вдалося отримати дані Monobank. Перевірте з’єднання й повторіть.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/request-test/)).toBeInTheDocument()
  })
})
