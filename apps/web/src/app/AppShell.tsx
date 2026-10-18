import { BriefcaseBusiness, ChartNoAxesCombined, Settings, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ThemeButton } from './theme'
import type { Theme } from './useTheme'

const links = [
  { to: '/overview', label: 'Огляд', icon: ChartNoAxesCombined },
  { to: '/transactions', label: 'Транзакції', icon: WalletCards },
  { to: '/accounts', label: 'Рахунки', icon: BriefcaseBusiness },
  { to: '/settings', label: 'Налаштування', icon: Settings },
]

function NavigationLinks() {
  return links.map(({ to, label, icon: Icon }) => (
    <NavLink key={to} to={to}>
      <Icon size={19} />
      <span>{label}</span>
    </NavLink>
  ))
}

export function AppShell({
  children,
  theme,
  setTheme,
}: {
  children: ReactNode
  theme: Theme
  setTheme: (theme: Theme) => void
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">M</span><span>Monoscope</span></div>
        <nav aria-label="Головна навігація"><NavigationLinks /></nav>
        <div className="sidebar-footer">
          <span className="api-status"><i /> API локально</span>
          <ThemeButton theme={theme} setTheme={setTheme} />
        </div>
      </aside>
      <header className="mobile-header">
        <div className="brand"><span className="brand-mark">M</span><span>Monoscope</span></div>
        <ThemeButton theme={theme} setTheme={setTheme} />
      </header>
      <main>{children}</main>
      <nav className="mobile-nav" aria-label="Мобільна навігація"><NavigationLinks /></nav>
    </div>
  )
}
