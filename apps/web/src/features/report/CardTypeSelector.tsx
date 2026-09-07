import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  CARD_TYPES,
  cardTypesSummary,
  type CardType,
} from './cardTypes'

const labels: Record<CardType, string> = {
  white: 'Біла',
  black: 'Чорна',
}

export function CardTypeSelector({
  value,
  onChange,
}: {
  value: readonly CardType[]
  onChange: (value: CardType[]) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const labelId = useId()
  const summaryId = useId()
  const optionsId = useId()

  useEffect(() => {
    if (!open) return

    containerRef.current
      ?.querySelector<HTMLInputElement>('.card-selector-options input:not(:disabled)')
      ?.focus()

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function toggle(cardType: CardType, checked: boolean) {
    const next = checked
      ? CARD_TYPES.filter((type) => value.includes(type) || type === cardType)
      : value.filter((type) => type !== cardType)

    if (next.length > 0) onChange([...next])
  }

  function closeAndFocusTrigger() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function toggleOpen() {
    if (open) {
      setOpen(false)
      return
    }

    setOpen(true)
  }

  return (
    <div
      className="card-selector"
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          closeAndFocusTrigger()
        }
      }}
    >
      <span className="label" id={labelId}>Картки</span>
      <button
        aria-controls={optionsId}
        aria-expanded={open}
        aria-labelledby={`${labelId} ${summaryId}`}
        className="card-selector-trigger"
        onClick={toggleOpen}
        ref={triggerRef}
        type="button"
      >
        <span id={summaryId}>{cardTypesSummary(value)}</span>
        <ChevronDown aria-hidden="true" className={open ? 'open' : ''} size={16} />
      </button>
      {open && (
        <div
          aria-label="Вибір карток"
          className="card-selector-options"
          id={optionsId}
          role="group"
        >
          {CARD_TYPES.map((cardType) => {
            const checked = value.includes(cardType)
            return (
              <label key={cardType}>
                <input
                  checked={checked}
                  disabled={checked && value.length === 1}
                  id={`${optionsId}-${cardType}`}
                  name="cardTypes"
                  onChange={(event) => toggle(cardType, event.target.checked)}
                  type="checkbox"
                  value={cardType}
                />
                <span>{labels[cardType]}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
