import { expect, test } from '@playwright/test'

test('generates and explores a report', async ({ page }) => {
  const requests: Array<Record<string, unknown>> = []
  await page.route('**/api/v1/reports', async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>
    requests.push(request)
    const includeBlackCard = request.includeBlackCard === true
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        reportId: 'rpt_browser',
        cached: false,
        meta: {
          cardTypes: includeBlackCard ? ['white', 'black'] : ['white'],
          dateFrom: '2026-09-01',
          dateTo: '2026-09-05',
          generatedAt: '2026-09-05T18:00:00+03:00',
          transactionCount: includeBlackCard ? 2 : 1,
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
            id: 'synthetic-white-expense',
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
            cardType: 'white',
          },
          ...(includeBlackCard
            ? [{
                id: 'synthetic-black-expense',
                occurredAt: '2026-09-02T10:00:00+03:00',
                description: 'Тестове кафе',
                comment: '',
                mcc: 5812,
                category: 'Кафе',
                amountOriginal: '180.00',
                currencyOriginal: 'UAH',
                amountUah: '180.00',
                amountEur: '3.71',
                rateUsed: '48.5584',
                rateSource: 'nbu',
                hold: false,
                cardType: 'black',
              }]
            : []),
        ],
      }),
    })
  })

  await page.goto('/overview')
  await page.getByRole('button', { name: 'Сформувати звіт' }).click()

  expect(requests[0]).toEqual(expect.objectContaining({ includeBlackCard: false }))
  await expect(page).not.toHaveURL(/(?:\?|&)black=/)
  await expect(page.getByText('Динаміка витрат')).toBeVisible()
  await expect(page.getByText('Тестовий магазин')).toBeVisible()
  await expect(page.locator('.report-meta').getByText('Біла картка', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /CSV/ })).toHaveAttribute(
    'href',
    '/api/v1/reports/rpt_browser/export.csv',
  )

  await page.getByRole('link', { name: 'Транзакції' }).first().click()
  await expect(page.getByLabel('Картка')).toHaveCount(0)
  await page.getByRole('button', { name: /Тестовий магазин/ }).click()
  await expect(page.getByRole('dialog').locator('.card-badge')).toContainText('Біла')
  await page.getByRole('button', { name: 'Закрити' }).click()
  await page.getByRole('link', { name: 'Огляд' }).first().click()

  await page.getByRole('checkbox', { name: 'Додати чорну картку' }).check()
  await page.getByRole('button', { name: 'Сформувати звіт' }).click()
  expect(requests[1]).toEqual(expect.objectContaining({ includeBlackCard: true }))
  await expect(page).toHaveURL(/(?:\?|&)black=true(?:&|$)/)
  await expect(page.getByText('Біла та чорна картки')).toBeVisible()

  await page.getByRole('link', { name: 'Транзакції' }).first().click()
  await expect(page.getByRole('heading', { name: 'Транзакції' })).toBeVisible()
  await page.getByLabel('Картка').selectOption('black')
  await expect(page.getByText('Тестове кафе')).toBeVisible()
  await expect(page.getByText('Тестовий магазин')).not.toBeVisible()
})
