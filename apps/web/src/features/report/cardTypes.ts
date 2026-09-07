import type { ReportRequest } from '../../shared/api/client'

export type CardType = ReportRequest['cardTypes'][number]

export const CARD_TYPES = ['white', 'black'] as const satisfies readonly CardType[]

const shortLabels: Record<CardType, string> = {
  white: 'Біла',
  black: 'Чорна',
}

export function readCardTypes(params: URLSearchParams): CardType[] {
  const cards = params.get('cards')
  if (cards !== null) {
    const requested = new Set(cards.split(','))
    const selected = CARD_TYPES.filter((cardType) => requested.has(cardType))
    if (selected.length > 0) return [...selected]
  }

  if (params.get('card') === 'black' || params.get('black') === 'true') {
    return [...CARD_TYPES]
  }

  return ['white']
}

export function cardTypesParam(cardTypes: readonly CardType[]) {
  return cardTypes.length === 1 && cardTypes[0] === 'white'
    ? null
    : CARD_TYPES.filter((cardType) => cardTypes.includes(cardType)).join(',')
}

export function cardTypesSummary(cardTypes: readonly CardType[]) {
  return CARD_TYPES.filter((cardType) => cardTypes.includes(cardType))
    .map((cardType) => shortLabels[cardType])
    .join(', ')
}

export function reportCardTypesLabel(cardTypes: readonly CardType[]) {
  if (cardTypes.length === 2) return 'Біла та чорна картки'
  return cardTypes[0] === 'black' ? 'Чорна картка' : 'Біла картка'
}
