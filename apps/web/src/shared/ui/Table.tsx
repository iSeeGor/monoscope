import type { ComponentProps } from 'react'

function classes(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <div data-slot="table-container" className="relative w-full overflow-x-auto"><table data-slot="table" className={classes('w-full caption-bottom text-sm', className)} {...props} /></div>
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={classes('[&_tr]:border-b [&_tr]:border-[var(--border)]', className)} {...props} />
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={classes('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableFooter({ className, ...props }: ComponentProps<'tfoot'>) {
  return <tfoot data-slot="table-footer" className={classes('border-t border-[var(--border)] font-medium [&_tr:last-child]:border-b-0', className)} {...props} />
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr data-slot="table-row" className={classes('border-b border-[var(--border)] transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]', className)} {...props} />
}

export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return <th data-slot="table-head" className={classes('h-11 px-4 text-left align-middle text-xs font-semibold text-[var(--muted-foreground)]', className)} {...props} />
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td data-slot="table-cell" className={classes('p-4 align-middle', className)} {...props} />
}
