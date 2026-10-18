import type { ComponentProps } from 'react'
import { cn } from '../lib/utils'

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select data-slot="select" className={cn('h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)] disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
}
