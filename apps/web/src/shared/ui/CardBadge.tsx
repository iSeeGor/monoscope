import type { Expense } from '../api/client'

const labels: Record<Expense['cardType'], string> = {
  white: 'Біла',
  black: 'Чорна',
}

export function CardBadge({ cardType }: { cardType: Expense['cardType'] }) {
  return (
    <span className={`card-badge ${cardType}`}>
      {labels[cardType]}
      <span className="sr-only"> картка</span>
    </span>
  )
}
