import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../app/useTheme'

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
      <section className="settings-card card">
        <div><h2>Оформлення</h2><p>Оберіть комфортну тему інтерфейсу.</p></div>
        <div className="segmented">
          <button aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><Sun size={16} /> Світла</button>
          <button aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Moon size={16} /> Темна</button>
        </div>
      </section>
      <section className="settings-card card">
        <div><h2>Підключення API</h2><p>Vite проксі передає запити локальному FastAPI. Токен ніколи не потрапляє у браузер.</p></div>
        <span className="api-status"><i /> Локальний API</span>
      </section>
    </div>
  )
}
