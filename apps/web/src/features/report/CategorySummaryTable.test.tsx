import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { Report } from '../../shared/api/client'
import { CategorySummaryTable } from './CategorySummaryTable'

const report: Report = {
  reportId: 'rpt_test',
  cached: false,
  meta: {
    cardTypes: ['white'],
    dateFrom: '2026-09-01',
    dateTo: '2026-09-05',
    generatedAt: '2026-09-05T18:00:00+03:00',
    transactionCount: 3,
    pendingCount: 0,
    totalUah: '940.00',
    totalEur: '19.36',
  },
  categories: [
    { category: 'Продукти', totalUah: '640.00', totalEur: '13.18', sharePct: '68.08', count: 2 },
    { category: 'Покупки', totalUah: '300.00', totalEur: '6.18', sharePct: '31.92', count: 1 },
  ],
  daily: [],
  expenses: [
    {
      id: 'expense-1',
      occurredAt: '2026-09-02T12:00:00+03:00',
      description: 'Сільпо',
      comment: '',
      mcc: 5411,
      category: 'Продукти',
      amountOriginal: '640.00',
      currencyOriginal: 'UAH',
      amountUah: '640.00',
      amountEur: '13.18',
      rateUsed: null,
      rateSource: null,
      hold: false,
      cardType: 'white',
    },
    {
      id: 'expense-2',
      occurredAt: '2026-09-03T12:00:00+03:00',
      description: 'Книгарня',
      comment: '',
      mcc: 5942,
      category: 'Покупки',
      amountOriginal: '300.00',
      currencyOriginal: 'UAH',
      amountUah: '300.00',
      amountEur: '6.18',
      rateUsed: null,
      rateSource: null,
      hold: false,
      cardType: 'white',
    },
  ],
}

afterEach(cleanup)

describe('CategorySummaryTable', () => {
  it('shows every category and the total for the report', () => {
    render(<CategorySummaryTable report={report} />)

    expect(screen.getByText('2 категорій')).toBeInTheDocument()
    expect(screen.getByText('Продукти')).toBeInTheDocument()
    expect(screen.getByText('Покупки')).toBeInTheDocument()
    const total = screen.getByText('Усього').closest('tr')
    expect(total).not.toBeNull()
    expect(within(total!).getByText(/940,00/)).toBeInTheDocument()
    expect(within(total!).getByText(/19,36/)).toBeInTheDocument()
    expect(within(total!).getByText('100%')).toBeInTheDocument()
    expect(within(total!).getByText('3')).toBeInTheDocument()
  })

  it('expands transactions for one category at a time', async () => {
    const user = userEvent.setup()
    render(<CategorySummaryTable report={report} />)

    const groceries = screen.getByRole('button', { name: 'Продукти' })
    expect(groceries).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Сільпо')).not.toBeInTheDocument()

    await user.click(groceries)

    expect(groceries).toHaveAttribute('aria-expanded', 'true')
    const groceriesList = screen.getByRole('list', { name: 'Операції категорії «Продукти»' })
    expect(within(groceriesList).getByText('Сільпо')).toBeInTheDocument()
    expect(within(groceriesList).queryByText('Книгарня')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Покупки' }))

    expect(groceries).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Сільпо')).not.toBeInTheDocument()
    expect(screen.getByText('Книгарня')).toBeInTheDocument()
  })
})
