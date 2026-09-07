import { useMutation } from '@tanstack/react-query'
import { lazy, Suspense, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { createReport, type Report, type ReportRequest } from '../shared/api/client'
import { AppShell } from './AppShell'
import { useTheme } from './useTheme'

const OverviewPage = lazy(() => import('../pages/OverviewPage'))
const TransactionsPage = lazy(() => import('../pages/TransactionsPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))

export default function App() {
  const [report, setReport] = useState<Report | null>(null)
  const { theme, setTheme } = useTheme()
  const mutation = useMutation<Report, Error, ReportRequest>({
    mutationFn: createReport,
    onSuccess: setReport,
  })

  return (
    <AppShell theme={theme} setTheme={setTheme}>
      <Suspense fallback={<div className="page"><div className="skeleton" aria-label="Сторінка завантажується" /></div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage report={report} mutation={mutation} />} />
          <Route path="/transactions" element={<TransactionsPage report={report} />} />
          <Route path="/settings" element={<SettingsPage theme={theme} setTheme={setTheme} />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}
