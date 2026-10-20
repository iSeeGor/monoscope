import type { ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../lib/utils'

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <span className="relative block w-full">
    <select data-slot="select" className={cn('h-9 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1 pr-9 text-sm text-[var(--foreground)] font-normal shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)] disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />
  </span>
}
