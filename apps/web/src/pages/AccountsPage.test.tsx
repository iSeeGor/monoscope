import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountsPage from './AccountsPage'

const account = { id: 'fop-uah', type: 'fop', currency: 'UAH', balance: '12500.00', iban: 'UA123456789', name: 'ФОП UAH' }
const transactions = [
  { id: 'incoming-1', occurredAt: '2026-10-17T12:00:00+03:00', description: 'Оплата послуг', comment: 'За договором №1', amount: '5000.00', currency: 'UAH', operationAmount: '5000.00', operationCurrency: 'UAH', balanceAfter: '12500.00', hold: false, direction: 'incoming', counterName: 'ТОВ Клієнт', counterEdrpou: '12345678', counterIban: 'UA987654321', invoiceId: 'invoice-1', receiptId: 'receipt-1' },
  { id: 'outgoing-1', occurredAt: '2026-10-16T12:00:00+03:00', description: 'Податок', comment: 'ЄП', amount: '-1000.00', currency: 'UAH', operationAmount: '-1000.00', operationCurrency: 'UAH', balanceAfter: '7500.00', hold: false, direction: 'outgoing', counterName: 'Казначейство', counterEdrpou: null, counterIban: null, invoiceId: null, receiptId: null },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><AccountsPage /></QueryClientProvider>)
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })

describe('AccountsPage', () => {
  it('selects the UAH account by default even when it is not first', async () => {
    const eurAccount = { ...account, id: 'fop-eur', currency: 'EUR', iban: 'UA-EUR', name: 'ФОП EUR' }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      return new Response(JSON.stringify(url.endsWith('/accounts') ? { accounts: [eurAccount, account] } : { accountId: account.id, dateFrom: '2026-09-19', dateTo: '2026-10-18', transactions: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    expect(await screen.findByText('Виписку ще не завантажено')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /ФОП UAH/ })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Завантажити виписку' }))
    await screen.findByText('Операцій не знайдено')

    expect(String(fetchMock.mock.calls[1][0])).toContain('/accounts/fop-uah/statement')
  })

  it('does not load a statement until the user requests it', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/accounts')) {
        return new Response(JSON.stringify({ accounts: [account] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      throw new Error('Statement must not load automatically')
    })
    renderPage()

    expect(await screen.findByText('Виписку ще не завантажено')).toBeInTheDocument()
    expect(screen.getByText(/statement-запит до Monobank не виконується/)).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('shows the Monobank wait notice after an explicit statement request', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/accounts')) {
        return new Response(JSON.stringify({ accounts: [account] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Promise<Response>(() => {})
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()
    await screen.findByText('Виписку ще не завантажено')

    await user.click(screen.getByRole('button', { name: 'Завантажити виписку' }))

    expect(await screen.findByText('Завантажуємо виписку')).toBeInTheDocument()
    expect(screen.getByText(/очікування може тривати близько хвилини/)).toBeInTheDocument()
  })

  it('loads an account and filters statement operations without another request', async () => {
    vi.setSystemTime(new Date('2026-10-18T10:00:00Z'))
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      return new Response(JSON.stringify(url.endsWith('/accounts') ? { accounts: [account] } : { accountId: account.id, dateFrom: '2026-09-19', dateTo: '2026-10-18', transactions }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    await screen.findByText('Виписку ще не завантажено')
    await user.click(screen.getByRole('button', { name: 'Завантажити виписку' }))
    expect(await screen.findByText('ТОВ Клієнт')).toBeInTheDocument()
    expect(screen.getByText('Казначейство')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ dateFrom: '2026-09-19', dateTo: '2026-10-18' })

    await user.selectOptions(screen.getByLabelText('Тип операції'), 'incoming')
    expect(screen.getByText('ТОВ Клієнт')).toBeInTheDocument()
    expect(screen.queryByText('Казначейство')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('opens accessible payment details and does not refetch draft dates before apply', async () => {
    vi.setSystemTime(new Date('2026-10-18T10:00:00Z'))
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => new Response(JSON.stringify(String(input).endsWith('/accounts') ? { accounts: [account] } : { accountId: account.id, dateFrom: '2026-09-19', dateTo: '2026-10-18', transactions }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()
    await screen.findByText('Виписку ще не завантажено')
    await user.click(screen.getByRole('button', { name: 'Завантажити виписку' }))
    await screen.findByText('ТОВ Клієнт')

    const transactionButton = screen.getByRole('button', { name: 'Деталі операції ТОВ Клієнт' })
    await user.click(transactionButton)
    expect(screen.getByRole('dialog', { name: 'ТОВ Клієнт' })).toBeInTheDocument()
    expect(screen.getByText('UA987654321')).toBeInTheDocument()
    expect(screen.getByText('receipt-1')).toBeInTheDocument()
    const closeButton = screen.getByRole('button', { name: 'Закрити' })
    expect(closeButton).toHaveFocus()
    await user.tab()
    expect(closeButton).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(transactionButton).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog', { name: 'ТОВ Клієнт' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.clear(screen.getByLabelText('Дата виписки від'))
    await user.type(screen.getByLabelText('Дата виписки від'), '2026-10-01')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await user.click(screen.getByRole('button', { name: 'Завантажити виписку' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
  })

  it('refreshes a statement when the same range is submitted again', async () => {
    vi.setSystemTime(new Date('2026-10-18T10:00:00Z'))
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => new Response(JSON.stringify(String(input).endsWith('/accounts') ? { accounts: [account] } : { accountId: account.id, dateFrom: '2026-09-19', dateTo: '2026-10-18', transactions }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()
    await screen.findByText('Виписку ще не завантажено')

    await user.click(screen.getByRole('button', { name: 'Завантажити виписку' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await user.click(screen.getByRole('button', { name: 'Завантажити виписку' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
  })
})
