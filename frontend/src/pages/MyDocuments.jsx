import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  FileText,
  FileWarning,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react'
import AppLayout from '../layouts/AppLayout'
import ConfirmDialog from '../components/ConfirmDialog'
import ItemMenu from '../components/ItemMenu'
import { deleteDocument, getDocuments } from '../services/documentService'
import { endSession } from '../utils/session'
import { daysUntil, getUrgency } from '../utils/urgency'

// "17 Mar 2026"
const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

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
  }
}

// Most urgent first: earliest deadline, then undated actions, then finished, then failed
const urgencyRank = (doc) => {
  if (doc.needsAction) return doc.nextDue ? daysUntil(doc.nextDue) : 9000
  if (doc.processed) return 9500
  return 10000
}

// Right-hand side of each row: what the user needs to know at a glance
function RowStatus({ doc }) {
  if (doc.failed) {
    return <span className="text-xs font-semibold text-urgent">Couldn't read this document</span>
  }
  if (!doc.processed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
        Processing
      </span>
    )
  }
  if (doc.action_count === 0) {
    return <span className="text-xs text-muted">No actions found</span>
  }
  if (doc.pending === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-done">
        <CheckCircle2 size={14} aria-hidden="true" />
        All done
      </span>
    )
  }
  if (!doc.nextDue) {
    return <span className="text-xs text-muted">{doc.pending} to do</span>
  }

  const urgency = getUrgency(doc.nextDue)
  const Icon = urgency.icon
  return (
    <span className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
      <span className="text-sm font-medium tabular-nums text-ink">{shortDate(doc.nextDue)}</span>
      {urgency.level !== 'later' && (
        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${urgency.badge.replace(/border-\S+/g, '')}`}>
          <Icon size={12} aria-hidden="true" />
          {urgency.label}
        </span>
      )}
    </span>
  )
}

function MyDocuments() {
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.successMessage

  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
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

  const sorted = useMemo(() => {
    const newest = (a, b) => new Date(b.upload_date) - new Date(a.upload_date)
    return [...documents].sort((a, b) => urgencyRank(a) - urgencyRank(b) || newest(a, b))
  }, [documents])

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

  const askDelete = (doc) => {
    setNotice('')
    setToDelete(doc)
  }

  return (
    <AppLayout>
      {/* Heading */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">My Documents</h1>
          <p className="mt-1 text-sm text-muted">Your letters, most urgent first.</p>
        </div>
        {documents.length > 0 && (
          <Link
            to="/upload"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy-hover focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            <Upload size={16} aria-hidden="true" />
            Upload
          </Link>
        )}
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
        <section aria-labelledby="empty-heading" className="rounded-2xl border border-sand bg-white px-6 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream text-coral">
            <FileText size={24} aria-hidden="true" />
          </span>
          <h2 id="empty-heading" className="mt-4 text-lg font-bold text-ink">No documents yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Upload a letter and get a clear list of what to do and by when.
          </p>
          <Link
            to="/upload"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-hover focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            <Upload size={17} aria-hidden="true" />
            Upload your first letter
          </Link>
        </section>
      ) : (
        sorted.length > 0 && (
          <ul className="divide-y divide-sand rounded-2xl border border-sand bg-white shadow-[0_8px_30px_rgba(30,42,68,0.05)]">
            {sorted.map((doc) => {
              const opensGuide = doc.processed
              const rowContent = (
                <>
                  {doc.failed ? (
                    <FileWarning size={20} className="shrink-0 text-urgent" aria-hidden="true" />
                  ) : (
                    <FileText size={20} className="shrink-0 text-coral" aria-hidden="true" />
                  )}
                  {/* Name and status: side by side on desktop, stacked on phones */}
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-ink">{doc.document_name}</span>
                      <span className="block text-xs text-muted">
                        {doc.upload_date && `Uploaded ${shortDate(doc.upload_date)}`}
                      </span>
                    </span>
                    <span className="shrink-0 sm:text-right">
                      <RowStatus doc={doc} />
                    </span>
                  </span>
                  {opensGuide && (
                    <ChevronRight size={18} className="hidden shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink sm:block" aria-hidden="true" />
                  )}
                </>
              )

              return (
                <li key={doc.document_id} className="flex items-center gap-2 pr-3 first:rounded-t-2xl last:rounded-b-2xl hover:bg-cream/60">
                  {opensGuide ? (
                    <Link
                      to={`/documents/${doc.document_id}`}
                      className="group flex min-w-0 flex-1 items-start gap-4 rounded-2xl sm:items-center py-4 pl-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy sm:pl-6"
                    >
                      {rowContent}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-start gap-4 py-4 pl-5 sm:items-center sm:pl-6">{rowContent}</div>
                  )}
                  <ItemMenu
                    label={`Options for ${doc.document_name}`}
                    options={[
                      ...(opensGuide
                        ? [{ label: 'Open Action Guide', icon: ArrowRight, onSelect: () => navigate(`/documents/${doc.document_id}`) }]
                        : []),
                      ...(doc.failed
                        ? [{ label: 'Try again', icon: RotateCcw, onSelect: () => navigate('/upload') }]
                        : []),
                      { label: 'Delete', icon: Trash2, danger: true, onSelect: () => askDelete(doc) },
                    ]}
                  />
                </li>
              )
            })}
          </ul>
        )
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