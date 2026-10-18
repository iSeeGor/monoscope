import { expect, test } from '@playwright/test'

test('loads a FOP statement only after an explicit request', async ({ page }) => {
  let accountRequests = 0
  let statementRequests = 0

  await page.route('**/api/v1/accounts', async (route) => {
    accountRequests += 1
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        accounts: [
          { id: 'fop-eur', type: 'fop', currency: 'EUR', balance: '250.00', iban: 'UA-EUR', name: 'ФОП EUR' },
          { id: 'fop-uah', type: 'fop', currency: 'UAH', balance: '12500.00', iban: 'UA-UAH', name: 'ФОП UAH' },
        ],
      }),
    })
  })
  await page.route('**/api/v1/accounts/*/statement', async (route) => {
    statementRequests += 1
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        accountId: 'fop-uah',
        dateFrom: '2026-09-19',
        dateTo: '2026-10-18',
        transactions: [{
          id: 'incoming-1',
          occurredAt: '2026-10-17T12:00:00+03:00',
          description: 'Оплата послуг',
          comment: 'За договором №1',
          amount: '5000.00',
          currency: 'UAH',
          operationAmount: '5000.00',
          operationCurrency: 'UAH',
          balanceAfter: '12500.00',
          hold: false,
          direction: 'incoming',
          counterName: 'ТОВ Клієнт',
          counterEdrpou: '12345678',
          counterIban: 'UA987654321',
          invoiceId: 'invoice-1',
          receiptId: 'receipt-1',
        }],
      }),
    })
  })

  await page.goto('/accounts')

  await expect(page.getByText('Виписку ще не завантажено')).toBeVisible()
  await expect(page.getByRole('button', { name: /ФОП UAH/ })).toHaveAttribute('aria-pressed', 'true')
  expect(accountRequests).toBe(1)
  expect(statementRequests).toBe(0)

  await page.getByRole('button', { name: 'Завантажити виписку' }).click()
  await expect(page.getByText('ТОВ Клієнт')).toBeVisible()
  expect(statementRequests).toBe(1)

  await page.getByRole('button', { name: 'Деталі операції ТОВ Клієнт' }).click()
  await expect(page.getByRole('dialog', { name: 'ТОВ Клієнт' })).toBeVisible()
  await expect(page.getByText('UA987654321')).toBeVisible()
})
