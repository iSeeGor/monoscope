import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CategoryBarChart } from './CategoryBarChart'

const categories = [
  { category: 'Продукти', totalUah: '640.00', totalEur: '13.18', sharePct: '68.09', count: 2 },
  { category: 'Покупки', totalUah: '300.00', totalEur: '6.18', sharePct: '31.91', count: 1 },
]

afterEach(cleanup)

describe('CategoryBarChart', () => {
  it('lists both currencies for every category in the tabular alternative', () => {
    render(<CategoryBarChart categories={categories} />)

    expect(screen.getByText(/Продукти.*640,00.*13,18/)).toBeInTheDocument()
    expect(screen.getByText(/Покупки.*300,00.*6,18/)).toBeInTheDocument()
  })

  it('limits the breakdown to the six largest categories', () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      category: `Категорія ${index}`,
      totalUah: '100.00',
      totalEur: '2.06',
      sharePct: '12.50',
      count: 1,
    }))
    render(<CategoryBarChart categories={many} />)

    expect(screen.getByText(/Категорія 5/)).toBeInTheDocument()
    expect(screen.queryByText(/Категорія 6/)).not.toBeInTheDocument()
  })
})
