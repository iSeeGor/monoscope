import type { UseMutationResult } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import { ReportControls } from '../features/report/ReportControls'
import { ReportDashboard } from '../features/report/ReportDashboard'
import { ErrorReportState, InitialReportState, LoadingReportState } from '../features/report/ReportStates'
import { exportUrl, type Report, type ReportRequest } from '../shared/api/client'
import { formatDate } from '../shared/format'

export default function OverviewPage({
  report,
  mutation,
}: {
  report: Report | null
  mutation: UseMutationResult<Report, Error, ReportRequest>
}) {
  return (
    <div className="page">
      <div className="page-heading">
        <div><p className="eyebrow">Фінансовий простір</p><h1>Огляд витрат</h1><p>Контролюйте щоденні витрати без зайвого шуму.</p></div>
        {report && <div className="exports"><a href={exportUrl(report.reportId, 'csv')}><Download size={16} /> CSV</a><a href={exportUrl(report.reportId, 'md')}><FileText size={16} /> Markdown</a></div>}
      </div>
      <ReportControls submit={(request) => mutation.mutate(request)} pending={mutation.isPending} />
      {report && <div className="report-meta"><span>{report.meta.cardTypes.length === 2 ? 'Біла та чорна картки' : 'Біла картка'}</span><span>{formatDate(report.meta.dateFrom, { year: 'numeric' })} — {formatDate(report.meta.dateTo, { year: 'numeric' })}</span>{report.cached && <span>З кешу</span>}</div>}
      {!report && !mutation.isPending && !mutation.isError && <InitialReportState />}
      {mutation.isPending && <LoadingReportState />}
      {mutation.isError && <ErrorReportState error={mutation.error} retry={() => mutation.mutate(mutation.variables)} />}
      {report && !mutation.isPending && <ReportDashboard report={report} />}
    </div>
  )
}
