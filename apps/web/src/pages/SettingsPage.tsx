import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../app/useTheme'
import { Button } from '../shared/ui/Button'

export default function SettingsPage({
  theme,
  setTheme,
}: {
  theme: Theme
  setTheme: (theme: Theme) => void
}) {
  return (
    <div className="page narrow">
      <div className="page-heading"><div><p className="eyebrow">Локальні параметри</p><h1>Налаштування</h1><p>Дані зберігаються лише у цьому браузері.</p></div></div>
      <section className="mb-3.5 flex flex-col gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-[22px] shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2>Оформлення</h2>
          <p className="mb-0 text-[13px] text-[var(--muted-foreground)]">Оберіть комфортну тему інтерфейсу.</p>
        </div>
        <div role="group" aria-label="Тема інтерфейсу" className="inline-flex w-fit rounded-lg border border-[var(--border)] bg-[var(--background)] p-1">
          <Button className={`size-9 p-0 ${theme === 'light' ? 'bg-sky-100 text-sky-950 hover:bg-sky-200' : ''}`} variant={theme === 'light' ? 'default' : 'ghost'} aria-label="Світла" aria-pressed={theme === 'light'} title="Світла тема" onClick={() => setTheme('light')}><Sun size={17} /><span className="sr-only">Світла</span></Button>
          <Button className="size-9 p-0" variant={theme === 'dark' ? 'default' : 'ghost'} aria-label="Темна" aria-pressed={theme === 'dark'} title="Темна тема" onClick={() => setTheme('dark')}><Moon size={17} /><span className="sr-only">Темна</span></Button>
        </div>
      </section>
      <section className="flex flex-col gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-[22px] shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2>Підключення API</h2>
          <p className="mb-0 text-[13px] text-[var(--muted-foreground)]">Vite проксі передає запити локальному FastAPI. Токен ніколи не потрапляє у браузер.</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 text-xs text-[var(--muted-foreground)]"><i className="size-[7px] rounded-full bg-[var(--success)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_16%,transparent)]" />Локальний API</span>
      </section>
    </div>
  )
}
