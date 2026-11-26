import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Info,
  Loader2,
  Mail,
  Pencil,
  Trash2,
} from 'lucide-react'
import AppLayout from '../layouts/AppLayout'
import ChatPanel from '../components/ChatPanel'
import ConfirmDialog from '../components/ConfirmDialog'
import ItemEditor from '../components/ItemEditor'
import ItemMenu from '../components/ItemMenu'
import {
  deleteDocument,
  deleteItem,
  editItem,
  emailDocument,
  getDocument,
  updateActionStatus,
} from '../services/documentService'
import { endSession, formatDate } from '../utils/session'
import { daysUntil, getUrgency } from '../utils/urgency'
import { downloadIcs, googleCalendarUrl } from '../utils/calendar'

const isDone = (item) => item.action_status === 'completed'

// Earliest deadline first, undated last
const byDueDate = (a, b) => {
  const da = a.due_date ? daysUntil(a.due_date) : Infinity
  const db = b.due_date ? daysUntil(b.due_date) : Infinity
  return da - db || a.item_id - b.item_id
}

// "17 Mar 2026"
const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

// Urgency label: icon + words, so colour is never the only signal.
// On phones the date is shown here too, because there is no date column.
function UrgencyBadge({ dueDate, hideLater = false }) {
  const urgency = getUrgency(dueDate)
  // In the desktop date column the date is already shown, so "later" needs no badge
  if (hideLater && urgency.level === 'later') return null
  const Icon = urgency.icon
  const label = urgency.level === 'later' ? `Due ${shortDate(dueDate)}` : urgency.label
  if (urgency.level === 'nodate') {
    return <span className="text-xs text-muted">Check the letter for a date</span>
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${urgency.badge.replace(/border-\S+/g, '')}`}>
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  )
}

// Small calendar tile for key dates, e.g. "MAR / 20"
function DateTile({ value }) {
  if (!value) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-field text-xs text-muted">
        ?
      </span>
    )
  }
  const date = new Date(value)
  return (
    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-sand bg-cream" aria-hidden="true">
      <span className="text-[10px] font-bold uppercase tracking-wide text-coral-text">
        {date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}
      </span>
      <span className="text-lg font-bold leading-none text-ink">{date.getUTCDate()}</span>
    </span>
  )
}

function Section({ title, count, id, children }) {
  return (
    <section aria-labelledby={id} className="px-5 py-5 sm:px-7">
      <h2 id={id} className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
        {title}
        {count > 0 && (
          <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-semibold text-ink">{count}</span>
        )}
      </h2>
      {children}
    </section>
  )
}

const Empty = ({ text }) => <p className="py-3 text-sm text-muted">{text}</p>

function DocumentResult() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [document, setDocument] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [confirm, setConfirm] = useState(null) // { kind: 'item', item } or { kind: 'document' }
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEmailing, setIsEmailing] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    getDocument(id)
      .then((data) => setDocument(data.document))
      .catch((err) => {
        if (err.status === 401) return endSession(navigate)
        setError(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [id, navigate])

  const items = useMemo(() => document?.extracted_items ?? [], [document])
  const actions = items.filter((i) => i.item_type === 'action')
  const todo = actions.filter((a) => !isDone(a)).sort(byDueDate)
  const completed = actions.filter(isDone)
  const keyDates = items.filter((i) => i.item_type === 'date').sort(byDueDate)
  const details = items.filter((i) => i.item_type === 'detail')
  const editingItem = items.find((i) => i.item_id === editingId)

  const replaceItem = (updated) =>
    setDocument((prev) => ({
      ...prev,
      extracted_items: prev.extracted_items.map((i) => (i.item_id === updated.item_id ? updated : i)),
    }))

  // Tick or untick an action; reverted if the server returns an error
  const toggleAction = async (item) => {
    const newStatus = isDone(item) ? 'pending' : 'completed'
    setUpdateError('')
    replaceItem({ ...item, action_status: newStatus })
    try {
      await updateActionStatus(item.item_id, newStatus)
    } catch (err) {
      if (err.status === 401) return endSession(navigate)
      replaceItem(item)
      setUpdateError(err.message)
    }
  }

  const saveEdit = async (item, fields) => {
    try {
      const data = await editItem(item.item_id, fields)
      replaceItem(data.item)
      setEditingId(null)
    } catch (err) {
      if (err.status === 401) return endSession(navigate)
      throw err
    }
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    setUpdateError('')
    try {
      if (confirm.kind === 'document') {
        await deleteDocument(document.document_id)
        navigate('/my-documents', {
          replace: true,
          state: { successMessage: `"${document.document_name}" was deleted.` },
        })
        return
      }
      await deleteItem(confirm.item.item_id)
      setDocument((prev) => ({
        ...prev,
        extracted_items: prev.extracted_items.filter((i) => i.item_id !== confirm.item.item_id),
      }))
      setConfirm(null)
    } catch (err) {
      if (err.status === 401) return endSession(navigate)
      setUpdateError(err.message)
      setConfirm(null)
    } finally {
      setIsDeleting(false)
    }
  }

  // Emails the guide to the user's own address
  const sendEmail = async () => {
    setIsEmailing(true)
    setNotice('')
    setUpdateError('')
    try {
      const data = await emailDocument(document.document_id)
      setNotice(data.message)
    } catch (err) {
      if (err.status === 401) return endSession(navigate)
      setUpdateError(err.message)
    } finally {
      setIsEmailing(false)
    }
  }

  // Options in each item's "⋯" menu
  const menuOptions = (item, { calendar = false } = {}) => [
    ...(calendar && item.due_date
      ? [
          {
            label: 'Add to Google Calendar',
            icon: CalendarPlus,
            onSelect: () => window.open(googleCalendarUrl(item, document.document_name), '_blank', 'noopener'),
          },
          {
            label: 'Add to Outlook / Apple',
            icon: Download,
            onSelect: () => downloadIcs(item, document.document_name),
          },
        ]
      : []),
    { label: 'Edit', icon: Pencil, onSelect: () => setEditingId(item.item_id) },
    { label: 'Remove', icon: Trash2, danger: true, onSelect: () => setConfirm({ kind: 'item', item }) },
  ]

  // One action row: tick-box, text and urgency, date on the right, then the ⋯ menu
  const actionRow = (item) => (
    <li key={item.item_id} className="py-3.5">
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0">
          <input
            id={`action-${item.item_id}`}
            type="checkbox"
            checked={isDone(item)}
            onChange={() => toggleAction(item)}
            className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-field bg-white transition checked:border-done checked:bg-done hover:border-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
          />
          <Check size={12} strokeWidth={3} className="pointer-events-none absolute left-1 top-1 hidden text-white peer-checked:block" aria-hidden="true" />
        </span>
        <label htmlFor={`action-${item.item_id}`} className="min-w-0 flex-1 cursor-pointer">
          <span className={`block text-[15px] leading-6 ${isDone(item) ? 'text-subtle line-through' : 'text-ink'}`}>
            {item.description}
          </span>
          {!isDone(item) && <span className="mt-1 block sm:hidden"><UrgencyBadge dueDate={item.due_date} /></span>}
        </label>
        {!isDone(item) && (
          <div className="hidden shrink-0 flex-col items-end gap-1 pt-0.5 sm:flex">
            <span className="text-sm font-medium tabular-nums text-ink">
              {item.due_date ? shortDate(item.due_date) : <span className="font-normal text-muted">No date</span>}
            </span>
            <UrgencyBadge dueDate={item.due_date} hideLater />
          </div>
        )}
        <ItemMenu label={`Options for "${item.description}"`} options={menuOptions(item, { calendar: !isDone(item) })} />
      </div>
    </li>
  )

  if (isLoading) {
    return (
      <AppLayout>
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Loading your Action Guide...
        </p>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <p role="alert" className="rounded-lg border border-urgent-border bg-urgent-bg px-4 py-3 text-sm text-urgent">{error}</p>
        <Link to="/my-documents" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to My Documents
        </Link>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Link to="/my-documents" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        My Documents
      </Link>

      {/* Heading */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-coral-text">Action Guide</p>
          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-ink">{document.document_name}</h1>
          {document.upload_date && (
            <p className="mt-1 text-sm text-muted">Uploaded {formatDate(document.upload_date)}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={sendEmail}
          disabled={isEmailing}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-field bg-white px-3 text-sm font-semibold text-ink transition hover:border-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy disabled:opacity-70"
        >
          {isEmailing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Mail size={16} className="text-coral" aria-hidden="true" />}
          {isEmailing ? 'Sending...' : 'Email me'}
        </button>
        <ItemMenu
          label="Document options"
          options={[{ label: 'Delete document', icon: Trash2, danger: true, onSelect: () => setConfirm({ kind: 'document' }) }]}
        />
        </div>
      </div>

      {/* AI notice (FR10): one line, always visible */}
      <p role="note" className="mb-6 flex items-start gap-2 text-xs leading-5 text-muted">
        <Info size={15} className="mt-0.5 shrink-0 text-soon" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-ink">Extracted by AI.</strong> Check it against your original letter and edit anything that is wrong. Not legal, medical or financial advice.
        </span>
      </p>

      {notice && (
        <p role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-done-border bg-done-bg px-4 py-3 text-sm font-medium text-done">
          <CheckCircle2 size={16} aria-hidden="true" />
          {notice}
        </p>
      )}

      {updateError && (
        <p role="alert" className="mb-5 rounded-lg border border-urgent-border bg-urgent-bg px-4 py-3 text-sm text-urgent">{updateError}</p>
      )}

      <div className="divide-y divide-sand overflow-visible rounded-2xl border border-sand bg-white shadow-[0_8px_30px_rgba(30,42,68,0.05)]">
        {/* Required actions */}
        <Section title="To do" count={todo.length} id="actions-heading">
          {actions.length === 0 ? (
            <Empty text="No actions were found in this document." />
          ) : (
            <>
              {todo.length === 0 ? (
                <p role="status" className="flex items-center gap-2 py-3 text-sm text-ink">
                  <CheckCircle2 size={18} className="text-done" aria-hidden="true" />
                  Nothing left to do for this letter.
                </p>
              ) : (
                <ul className="divide-y divide-sand">{todo.map(actionRow)}</ul>
              )}

              {completed.length > 0 && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowCompleted((value) => !value)}
                    aria-expanded={showCompleted}
                    className="flex items-center gap-1.5 rounded-md py-1 text-sm font-medium text-muted transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
                  >
                    <ChevronDown size={16} className={`transition ${showCompleted ? 'rotate-180' : ''}`} aria-hidden="true" />
                    {showCompleted ? 'Hide' : 'Show'} completed ({completed.length})
                  </button>
                  {showCompleted && <ul className="divide-y divide-sand">{completed.map(actionRow)}</ul>}
                </div>
              )}
            </>
          )}
        </Section>

        {/* Key dates */}
        {keyDates.length > 0 && (
          <Section title="Key dates" id="dates-heading">
            <ul className="divide-y divide-sand">
              {keyDates.map((item) => (
                <li key={item.item_id} className="py-3.5">
                  <div className="flex items-center gap-4">
                    <DateTile value={item.due_date} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] leading-6 text-ink">{item.description}</p>
                      <p className="text-xs text-muted">{item.due_date ? formatDate(item.due_date) : 'Date not identified – check the letter'}</p>
                    </div>
                    <ItemMenu label={`Options for "${item.description}"`} options={menuOptions(item, { calendar: true })} />
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Important details */}
        {details.length > 0 && (
          <Section title="Details" id="details-heading">
            <ul className="divide-y divide-sand">
              {details.map((item) => (
                <li key={item.item_id} className="py-3.5">
                  <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 text-[15px] leading-6 text-ink">{item.description}</p>
                    <ItemMenu label={`Options for "${item.description}"`} options={menuOptions(item)} />
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Space so the chat button never covers the last item */}
      <div className="h-20" aria-hidden="true" />

      <ChatPanel key={document.document_id} documentId={document.document_id} documentName={document.document_name} />

      {editingItem && (
        <ItemEditor
          key={editingItem.item_id}
          item={editingItem}
          onSave={(fields) => saveEdit(editingItem, fields)}
          onClose={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'document' ? 'Delete this document?' : 'Remove this item?'}
        message={
          confirm?.kind === 'document'
            ? `"${document.document_name}" and its Action Guide will be permanently deleted. This can't be undone.`
            : confirm
              ? `"${confirm.item.description}" will be removed from your Action Guide. This can't be undone.`
              : ''
        }
        confirmLabel={confirm?.kind === 'document' ? 'Delete' : 'Remove'}
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirm(null)}
      />
    </AppLayout>
  )
}

export default DocumentResult