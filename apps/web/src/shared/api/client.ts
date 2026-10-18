import type { components } from './schema'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || '/api/v1'
).replace(/\/$/, '')

type ReportTransport = components['schemas']['ReportResponse']
export type ReportRequest = components['schemas']['ReportRequest']

export type Expense = {
  id: string
  occurredAt: string
  description: string
  comment: string
  mcc: number | null
  category: string
  amountOriginal: string
  currencyOriginal: string
  amountUah: string
  amountEur: string
  rateUsed: string | null
  rateSource: 'operation' | 'nbu' | 'monobank' | null
  hold: boolean
  cardType: 'white' | 'black'
}

export type Report = {
  reportId: string
  cached: boolean
  meta: ReportTransport['meta']
  categories: ReportTransport['categories']
  daily: ReportTransport['daily']
  expenses: Expense[]
}

export type Account = components['schemas']['AccountResponse']
export type AccountTransaction = components['schemas']['AccountTransactionResponse']
export type StatementRequest = components['schemas']['StatementRequest']
export type AccountStatement = components['schemas']['StatementResponse']

type ApiErrorBody = {
  error?: { code?: string; message?: string; requestId?: string }
  detail?: Array<{ msg?: string }>
}

const errorMessages: Record<string, string> = {
  MONOBANK_UNAUTHORIZED:
    'Токен Monobank недійсний. Перевірте налаштування сервера.',
  MONOBANK_RATE_LIMITED:
    'Monobank тимчасово обмежив запити. Зачекайте хвилину й повторіть.',
  MONOBANK_UNAVAILABLE:
    'Не вдалося отримати дані Monobank. Перевірте з’єднання й повторіть.',
  RATE_UNAVAILABLE:
    'Не вдалося отримати курс валют для вибраного періоду.',
  REPORT_NOT_FOUND:
    'Цей звіт уже недоступний. Сформуйте його повторно.',
  REQUEST_SCHEMA_INVALID:
    'Перевірте параметри звіту.',
  ACCOUNT_NOT_FOUND: 'Рахунок не знайдено. Оновіть список рахунків.',
}

export class ApiError extends Error {
  readonly status: number
  readonly requestId?: string

  constructor(message: string, status: number, requestId?: string) {
    super(message)
    this.status = status
    this.requestId = requestId
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch {
    throw new ApiError('Немає зв’язку з API. Перевірте, чи запущено сервер.', 0)
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    const translated = body.error?.code ? errorMessages[body.error.code] : undefined
    const fallback =
      response.status === 401
        ? 'Токен Monobank недійсний. Перевірте налаштування сервера.'
        : response.status === 429
          ? 'Monobank тимчасово обмежив запити. Спробуйте пізніше.'
          : response.status === 502
            ? 'Monobank зараз недоступний. Спробуйте ще раз.'
            : 'Не вдалося завантажити дані.'
    throw new ApiError(
      translated ?? body.error?.message ?? body.detail?.[0]?.msg ?? fallback,
      response.status,
      body.error?.requestId,
    )
  }

  return response.json() as Promise<T>
}

export async function createReport(request: ReportRequest): Promise<Report> {
  const transport = await requestJson<ReportTransport>('/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return {
    ...transport,
    expenses: transport.expenses.map((expense) => ({ ...expense })),
  }
}

export async function getAccounts(): Promise<Account[]> {
  const response = await requestJson<components['schemas']['AccountsResponse']>('/accounts')
  return response.accounts
}

export async function getAccountStatement(accountId: string, request: StatementRequest): Promise<AccountStatement> {
  return requestJson<AccountStatement>(
    `/accounts/${encodeURIComponent(accountId)}/statement`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
  )
}

export function exportUrl(reportId: string, format: 'csv' | 'md') {
  return `${API_BASE_URL}/reports/${encodeURIComponent(reportId)}/export.${format}`
}
