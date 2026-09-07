import { expect, test } from '@playwright/test'

test('generates and explores a report', async ({ page }) => {
  await page.route('**/api/v1/reports', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        reportId: 'rpt_browser',
        cached: false,
        meta: {
          cardType: 'white',
          dateFrom: '2026-09-01',
          dateTo: '2026-09-05',
          generatedAt: '2026-09-05T18:00:00+03:00',
          transactionCount: 1,
          pendingCount: 0,
          totalUah: '640.00',
          totalEur: '13.18',
        },
        categories: [
          {
            category: 'Продукти',
            totalUah: '640.00',
            totalEur: '13.18',
            sharePct: '100.00',
            count: 1,
          },
        ],
        daily: [
          {
            date: '2026-09-01',
            totalUah: '640.00',
            totalEur: '13.18',
            count: 1,
          },
        ],
        expenses: [
          {
            id: 'synthetic-browser-expense',
            occurredAt: '2026-09-01T13:45:00+03:00',
            description: 'Тестовий магазин',
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
          },
        ],
      }),
    })
  })

  await page.goto('/overview')
  await page.getByRole('button', { name: 'Сформувати звіт' }).click()

  await expect(page.getByText('Динаміка витрат')).toBeVisible()
  await expect(page.getByText('Тестовий магазин')).toBeVisible()
  await expect(page.getByRole('link', { name: /CSV/ })).toHaveAttribute(
    'href',
    '/api/v1/reports/rpt_browser/export.csv',
  )

  await page.getByRole('link', { name: 'Транзакції' }).first().click()
  await expect(page.getByRole('heading', { name: 'Транзакції' })).toBeVisible()
  await expect(page.getByText('Тестовий магазин')).toBeVisible()
})
