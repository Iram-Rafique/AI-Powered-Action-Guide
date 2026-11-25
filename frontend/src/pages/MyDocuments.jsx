import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  ArrowRight,
  FileText,
  FileWarning,
  Files,
  ListChecks,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import AppLayout from '../layouts/AppLayout'
import ConfirmDialog from '../components/ConfirmDialog'
import { deleteDocument, getDocuments } from '../services/documentService'
import { endSession, formatDate } from '../utils/session'
import { DONE_STYLE, NODATE_STYLE, daysUntil, getUrgency } from '../utils/urgency'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'needs', label: 'Needs action' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
]

// Adds the values the page needs to each document from the API
const describe = (doc) => {
  const pending = doc.action_count - doc.done_count
  const processed = doc.processing_status === 'processed'
  return {
    ...doc,
    pending,
    nextDue: doc.pending_due_dates[0] || null,
    processed,
    failed: doc.processing_status === 'failed',
    needsAction: processed && pending > 0,
    completed: processed && pending === 0,
  }
}

// Sort key for "Most urgent first": earliest deadline first, then undated
// actions, then completed documents, then failed ones
const urgencyRank = (doc) => {
  if (doc.needsAction) return doc.nextDue ? daysUntil(doc.nextDue) : 9000
  if (doc.completed) return 9500
  return 10000
}

// The badge on each document card
function StatusBadge({ doc }) {
  let style
  let label

  if (doc.failed) {
    return null
  } else if (!doc.processed) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-sand bg-nodate-bg px-2.5 py-1 text-xs font-semibold text-muted">
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        Processing
      </span>
    )
  } else if (doc.action_count === 0) {
    style = NODATE_STYLE
    label = 'No actions found'
  } else if (doc.pending === 0) {
    style = DONE_STYLE
    label = 'All done'
  } else {
    const urgency = getUrgency(doc.nextDue)
    style = urgency
    label = urgency.label
  }

  const Icon = style.icon
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  )
}

// One box in the summary strip
function SummaryBox({ icon: Icon, label, value, tone }) {
  const tones = {
    urgent: 'border-urgent-border bg-urgent-bg text-urgent',
    soon: 'border-soon-border bg-soon-bg text-soon',
    plain: 'border-sand bg-white text-ink',
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon size={15} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

function MyDocuments() {
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.successMessage

  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('urgent')

  const [toDelete, setToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    getDocuments()
      .then((data) => setDocuments(data.documents.map(describe)))
      .catch((err) => {
        if (err.status === 401) return endSession(navigate)
        setError(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [navigate])

  // Figures for the summary strip
  const summary = useMemo(() => {
    const dueDays = documents.flatMap((doc) => doc.pending_due_dates.map(daysUntil))
    return {
      overdue: dueDays.filter((d) => d < 0).length,
      thisWeek: dueDays.filter((d) => d >= 0 && d <= 7).length,
      actionsLeft: documents.reduce((total, doc) => total + (doc.processed ? doc.pending : 0), 0),
      documents: documents.length,
    }
  }, [documents])

  // How many documents each filter would show
  const counts = useMemo(() => ({
    all: documents.length,
    needs: documents.filter((d) => d.needsAction).length,
    completed: documents.filter((d) => d.completed).length,
    failed: documents.filter((d) => d.failed).length,
  }), [documents])

  const visible = useMemo(() => {
    const filtered = documents.filter((doc) => {
      if (filter === 'needs') return doc.needsAction
      if (filter === 'completed') return doc.completed
      if (filter === 'failed') return doc.failed
      return true
    })
    const newest = (a, b) => new Date(b.upload_date) - new Date(a.upload_date)
    return [...filtered].sort((a, b) =>
      sort === 'urgent' ? urgencyRank(a) - urgencyRank(b) || newest(a, b) : newest(a, b)
    )
  }, [documents, filter, sort])

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteDocument(toDelete.document_id)
      setDocuments((prev) => prev.filter((d) => d.document_id !== toDelete.document_id))
      setNotice(`"${toDelete.document_name}" was deleted.`)
      setError('')
      setToDelete(null)
    } catch (err) {
      if (err.status === 401) return endSession(navigate)
      setError(err.message)
      setToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AppLayout wide>
      {/* Heading */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 h-1 w-12 rounded-full bg-coral" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">My Documents</h1>
          <p className="mt-1 text-sm text-muted">Your letters and what still needs doing.</p>
        </div>
        <Link
          to="/upload"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-hover focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          <Upload size={17} aria-hidden="true" />
          Upload document
        </Link>
      </div>

      {/* Messages */}
      {(notice || successMessage) && (
        <p role="status" className="mb-5 rounded-lg border border-done-border bg-done-bg px-4 py-3 text-sm font-medium text-done">
          {notice || successMessage}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-5 rounded-lg border border-urgent-border bg-urgent-bg px-4 py-3 text-sm text-urgent">
          {error}
        </p>
      )}

      {isLoading ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Loading your documents...
        </p>
      ) : documents.length === 0 && !error ? (
        /* Empty state for new users */
        <section aria-labelledby="empty-heading" className="rounded-2xl border border-sand bg-white px-6 py-10 text-center">
          <h2 id="empty-heading" className="text-lg font-bold text-ink">Start with your first letter</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Upload an appointment, council or school letter and get a clear checklist of what to do and by when.
          </p>
          <ol className="mx-auto mt-8 grid max-w-2xl gap-4 text-left sm:grid-cols-3">
            {[
              { icon: Upload, title: '1. Upload', text: 'A PDF, text file or photo of your letter.' },
              { icon: Sparkles, title: '2. AI reads it', text: 'Actions, dates and details are picked out.' },
              { icon: ListChecks, title: '3. Get your checklist', text: 'Tick actions off as you complete them.' },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-xl border border-sand bg-cream p-4">
                <Icon size={22} className="text-coral" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-ink">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
              </li>
            ))}
          </ol>
          <Link
            to="/upload"
            className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-hover focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            <Upload size={17} aria-hidden="true" />
            Upload your first letter
          </Link>
        </section>
      ) : (
        <>
          {/* Summary strip */}
          <section aria-label="Summary" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryBox icon={AlertTriangle} label="Overdue" value={summary.overdue} tone={summary.overdue ? 'urgent' : 'plain'} />
            <SummaryBox icon={CalendarClock} label="Due this week" value={summary.thisWeek} tone={summary.thisWeek ? 'soon' : 'plain'} />
            <SummaryBox icon={ListChecks} label="Actions left" value={summary.actionsLeft} tone="plain" />
            <SummaryBox icon={Files} label="Documents" value={summary.documents} tone="plain" />
          </section>

          {/* Filter and sort */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="group" aria-label="Filter documents" className="flex flex-wrap gap-2">
              {FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  aria-pressed={filter === id}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                    filter === id
                      ? 'border-navy bg-navy text-white'
                      : 'border-sand bg-white text-ink hover:border-field'
                  }`}
                >
                  {label} <span className={filter === id ? 'text-white/80' : 'text-muted'}>({counts[id]})</span>
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              Sort by
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-9 rounded-lg border border-field bg-white px-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="urgent">Most urgent first</option>
                <option value="newest">Newest first</option>
              </select>
            </label>
          </div>

          {/* Document list */}
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-field bg-white px-6 py-8 text-center">
              <p className="text-sm text-muted">No documents match this filter.</p>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="mt-2 text-sm font-semibold text-coral-text underline-offset-4 hover:underline"
              >
                Show all documents
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((doc) => (
                <li
                  key={doc.document_id}
                  className={`rounded-xl border bg-white p-4 sm:p-5 ${doc.failed ? 'border-urgent-border' : 'border-sand'}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      {doc.failed ? (
                        <FileWarning size={22} className="mt-0.5 shrink-0 text-urgent" aria-hidden="true" />
                      ) : (
                        <FileText size={22} className="mt-0.5 shrink-0 text-coral" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{doc.document_name}</p>
                        <p className="text-xs text-muted">
                          {doc.upload_date && `Uploaded ${formatDate(doc.upload_date)}`}
                          {doc.processed && ` · ${doc.item_count} extracted ${doc.item_count === 1 ? 'item' : 'items'}`}
                        </p>
                      </div>
                    </div>
                    <StatusBadge doc={doc} />
                  </div>

                  {/* Progress */}
                  {doc.processed && doc.action_count > 0 && (
                    <div className="mt-4">
                      <p className="mb-1.5 text-xs text-muted">
                        {doc.done_count} of {doc.action_count} {doc.action_count === 1 ? 'action' : 'actions'} done
                      </p>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-nodate-bg" aria-hidden="true">
                        <div
                          className="h-2 rounded-full bg-done"
                          style={{ width: `${Math.round((doc.done_count / doc.action_count) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Failed message */}
                  {doc.failed && (
                    <p className="mt-3 text-sm text-urgent">
                      We couldn't read this document. Try uploading it again, or as a photo if it's a scanned PDF.
                    </p>
                  )}

                  {/* Card actions */}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-sand pt-3">
                    {doc.processed && (
                      <Link
                        to={`/documents/${doc.document_id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
                      >
                        Open Action Guide<span className="sr-only"> for {doc.document_name}</span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    )}
                    {doc.failed && (
                      <Link
                        to="/upload"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
                      >
                        <RotateCcw size={16} aria-hidden="true" />
                        Try again
                      </Link>
                    )}
                    {!doc.processed && !doc.failed && <span />}
                    <button
                      type="button"
                      onClick={() => {
                        setNotice('')
                        setToDelete(doc)
                      }}
                      aria-label={`Delete ${doc.document_name}`}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted transition hover:bg-urgent-bg hover:text-urgent focus:outline-none focus-visible:ring-2 focus-visible:ring-urgent"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this document?"
        message={toDelete ? `"${toDelete.document_name}" and its Action Guide will be permanently deleted. This can't be undone.` : ''}
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </AppLayout>
  )
}

export default MyDocuments