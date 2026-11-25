import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ClipboardList,
  FileText,
  Info,
  ListChecks,
  Loader2,
  PartyPopper,
  Pencil,
  Square,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react'
import AppLayout from '../layouts/AppLayout'
import CalendarButton from '../components/CalendarButton'
import ConfirmDialog from '../components/ConfirmDialog'
import ItemEditor from '../components/ItemEditor'
import {
  deleteDocument,
  deleteItem,
  editItem,
  getDocument,
  updateActionStatus,
} from '../services/documentService'
import { endSession, formatDate } from '../utils/session'
import { DONE_STYLE, daysUntil, getUrgency } from '../utils/urgency'
import { useSpeech } from '../hooks/useSpeech'

const isDone = (item) => item.action_status === 'completed'

// Background of the "Next up" card for urgent and soon actions
const NEXT_CARD_STYLE = {
  urgent: 'border-urgent-border bg-urgent-bg',
  soon: 'border-soon-border bg-soon-bg',
}

// Unfinished actions first, earliest deadline first (undated last), then finished ones
const sortActions = (actions) =>
  [...actions].sort((a, b) => {
    if (isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1
    const da = a.due_date ? daysUntil(a.due_date) : Infinity
    const db = b.due_date ? daysUntil(b.due_date) : Infinity
    return da - db || a.item_id - b.item_id
  })

// Badge with an icon and words, so colour is never the only signal
function UrgencyBadge({ item }) {
  const style = isDone(item) ? { ...DONE_STYLE, label: 'Done' } : getUrgency(item.due_date)
  const Icon = style.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
      <Icon size={13} aria-hidden="true" />
      {style.label}
    </span>
  )
}

function Section({ icon: Icon, title, count, id, children }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-sand bg-white p-5 sm:p-6">
      <h2 id={id} className="mb-4 flex items-center gap-2 text-base font-bold text-ink">
        <Icon size={20} className="text-coral" aria-hidden="true" />
        {title}
        {count > 0 && <span className="text-sm font-medium text-muted">({count})</span>}
      </h2>
      {children}
    </section>
  )
}

const Empty = ({ text }) => <p className="text-sm text-muted">{text}</p>

// Small icon button used for edit and delete
function IconButton({ label, onClick, danger = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-md p-2 text-muted transition focus:outline-none focus-visible:ring-2 ${
        danger ? 'hover:bg-urgent-bg hover:text-urgent focus-visible:ring-urgent' : 'hover:bg-cream hover:text-ink focus-visible:ring-navy'
      }`}
    >
      {children}
    </button>
  )
}

function DocumentResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { supported: canSpeak, speakingId, speak, stop } = useSpeech()

  const [document, setDocument] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [confirm, setConfirm] = useState(null) // { kind: 'item', item } or { kind: 'document' }
  const [isDeleting, setIsDeleting] = useState(false)

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
  const actions = useMemo(() => sortActions(items.filter((i) => i.item_type === 'action')), [items])
  const details = items.filter((i) => i.item_type === 'detail')
  const doneCount = actions.filter(isDone).length
  const nextUp = actions.find((a) => !isDone(a))

  // Dates & Deadlines: important dates plus actions with a due date, in date order
  const datedItems = [
    ...items.filter((i) => i.item_type === 'date'),
    ...actions.filter((i) => i.due_date),
  ].sort((a, b) => {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date) - new Date(b.due_date)
  })

  // Replace one item in the page after a change
  const replaceItem = (updated) =>
    setDocument((prev) => ({
      ...prev,
      extracted_items: prev.extracted_items.map((i) => (i.item_id === updated.item_id ? updated : i)),
    }))

  // Tick or untick an action. The checkbox updates straight away and is
  // reverted if the server returns an error.
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

  const saveEdit = async (item, description, date) => {
    try {
      const data = await editItem(item.item_id, description, date)
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

  // Text read out by "Read aloud"
  const spokenGuide = () => {
    const label = (item) => getUrgency(item.due_date).label.replace('–', ',')
    const todo = actions.filter((a) => !isDone(a))
    const parts = [`Your Action Guide for ${document.document_name}.`]
    if (todo.length) {
      parts.push(`You have ${todo.length} ${todo.length === 1 ? 'action' : 'actions'} to do.`)
      todo.forEach((a, i) => parts.push(`${i + 1}. ${a.description}. ${label(a)}.`))
    } else if (actions.length) {
      parts.push('All actions are done.')
    }
    const dates = items.filter((i) => i.item_type === 'date')
    if (dates.length) {
      parts.push('Important dates.')
      dates.forEach((d) => parts.push(`${d.due_date ? `${formatDate(d.due_date)}: ` : ''}${d.description}.`))
    }
    if (details.length) {
      parts.push('Important details.')
      details.forEach((d) => parts.push(`${d.description}.`))
    }
    parts.push('Please check this against your original letter.')
    return parts.join(' ')
  }

  const toggleSpeech = (text, speechId) => (speakingId === speechId ? stop() : speak(text, speechId))

  // Edit and delete buttons for one item
  const itemTools = (item, { calendar = false } = {}) => (
    <div className="flex shrink-0 items-center">
      {calendar && item.due_date && !isDone(item) && (
        <CalendarButton item={item} documentName={document.document_name} compact />
      )}
      <IconButton label={`Edit "${item.description}"`} onClick={() => setEditingId(item.item_id)}>
        <Pencil size={16} aria-hidden="true" />
      </IconButton>
      <IconButton label={`Remove "${item.description}"`} danger onClick={() => setConfirm({ kind: 'item', item })}>
        <Trash2 size={16} aria-hidden="true" />
      </IconButton>
    </div>
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

  const allDone = actions.length > 0 && doneCount === actions.length
  const nextStyle = nextUp ? getUrgency(nextUp.due_date) : null

  return (
    <AppLayout>
      {/* Heading */}
      <Link to="/my-documents" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        My Documents
      </Link>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 h-1 w-12 rounded-full bg-coral" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Your Action Guide</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <FileText size={15} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{document.document_name}</span>
            {document.upload_date && <span className="shrink-0">· uploaded {formatDate(document.upload_date)}</span>}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {canSpeak && (
            <button
              type="button"
              onClick={() => toggleSpeech(spokenGuide(), 'all')}
              aria-pressed={speakingId === 'all'}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-field bg-white px-3.5 text-sm font-semibold text-ink transition hover:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
            >
              {speakingId === 'all' ? <Square size={15} aria-hidden="true" /> : <Volume2 size={16} className="text-coral" aria-hidden="true" />}
              {speakingId === 'all' ? 'Stop reading' : 'Read aloud'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirm({ kind: 'document' })}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-urgent-bg hover:text-urgent focus:outline-none focus:ring-2 focus:ring-urgent"
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      {/* AI notice and disclaimer (FR10) */}
      <div role="note" className="mb-5 flex gap-3 rounded-xl border border-soon-border bg-soon-bg px-4 py-3 text-xs leading-5 text-ink">
        <Info size={18} className="mt-0.5 shrink-0 text-soon" aria-hidden="true" />
        <p>
          <strong>Extracted by AI – please check.</strong> This information may be incomplete or
          incorrect, so always compare it with your original document. You can edit or remove
          anything that is wrong. It is general information only and is not legal, medical or
          financial advice.
        </p>
      </div>

      {updateError && (
        <p role="alert" className="mb-5 rounded-lg border border-urgent-border bg-urgent-bg px-4 py-3 text-sm text-urgent">{updateError}</p>
      )}

      {/* Progress and "Next up" */}
      {actions.length > 0 && (
        <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_1.6fr]">
          <div className={`rounded-2xl border p-5 ${allDone ? 'border-done-border bg-done-bg' : 'border-sand bg-white'}`}>
            <p className="text-xs font-semibold text-muted">Progress</p>
            <p className="mt-1 text-2xl font-bold text-ink">
              {doneCount} <span className="text-base font-medium text-muted">of {actions.length} actions done</span>
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-nodate-bg" aria-hidden="true">
              <div className="h-2 rounded-full bg-done transition-all" style={{ width: `${Math.round((doneCount / actions.length) * 100)}%` }} />
            </div>
          </div>

          {allDone ? (
            <div role="status" className="flex items-center gap-4 rounded-2xl border border-done-border bg-done-bg p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-done">
                <PartyPopper size={24} aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-bold text-done">All done for this letter</p>
                <p className="mt-0.5 text-sm text-ink">Every action is complete. Keep the letter in case you need it later.</p>
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl border p-5 ${NEXT_CARD_STYLE[nextStyle.level] || 'border-sand bg-white'}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Next up</p>
              <p className="mt-1 text-base font-bold text-ink">{nextUp.description}</p>
              <div className="mt-2"><UrgencyBadge item={nextUp} /></div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleAction(nextUp)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-navy-hover focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
                >
                  <Check size={16} aria-hidden="true" />
                  Mark as done
                </button>
                {nextUp.due_date && <CalendarButton item={nextUp} documentName={document.document_name} />}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-5">
        {/* Required Actions */}
        <Section icon={ListChecks} title="Required Actions" count={actions.length} id="actions-heading">
          {actions.length === 0 ? (
            <Empty text="No actions were found in this document." />
          ) : (
            <ul className="divide-y divide-sand">
              {actions.map((item) => (
                <li key={item.item_id} className="py-3 first:pt-0 last:pb-0">
                  {editingId === item.item_id ? (
                    <ItemEditor
                      item={item}
                      onSave={(text, date) => saveEdit(item, text, date)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <input
                        id={`action-${item.item_id}`}
                        type="checkbox"
                        checked={isDone(item)}
                        onChange={() => toggleAction(item)}
                        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-navy"
                      />
                      <label htmlFor={`action-${item.item_id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                        <span className={isDone(item) ? 'text-subtle line-through' : 'font-medium text-ink'}>
                          {item.description}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2">
                          <UrgencyBadge item={item} />
                          {item.due_date && !isDone(item) && getUrgency(item.due_date).level !== 'later' && (
                            <span className="text-xs text-muted">{formatDate(item.due_date)}</span>
                          )}
                        </span>
                      </label>
                      {itemTools(item, { calendar: true })}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Dates & Deadlines */}
        <Section icon={CalendarClock} title="Dates & Deadlines" count={datedItems.length} id="dates-heading">
          {datedItems.length === 0 ? (
            <Empty text="No dates were found in this document." />
          ) : (
            <ul className="divide-y divide-sand">
              {datedItems.map((item) => (
                <li key={`date-${item.item_id}`} className="py-3 first:pt-0 last:pb-0">
                  {editingId === item.item_id && item.item_type === 'date' ? (
                    <ItemEditor
                      item={item}
                      onSave={(text, date) => saveEdit(item, text, date)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex items-start gap-3 text-sm">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:gap-4">
                        <span className="shrink-0 font-semibold text-ink sm:w-40">
                          {item.due_date ? formatDate(item.due_date) : 'Date not identified'}
                        </span>
                        <span className={isDone(item) ? 'text-subtle line-through' : 'text-ink'}>
                          {item.item_type === 'action' ? `Deadline: ${item.description}` : item.description}
                        </span>
                      </div>
                      {item.item_type === 'date' ? (
                        itemTools(item, { calendar: true })
                      ) : (
                        item.due_date && !isDone(item) && (
                          <CalendarButton item={item} documentName={document.document_name} compact />
                        )
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Important Details */}
        <Section icon={ClipboardList} title="Important Details" count={details.length} id="details-heading">
          {details.length === 0 ? (
            <Empty text="No other details were found in this document." />
          ) : (
            <ul className="divide-y divide-sand">
              {details.map((item) => (
                <li key={item.item_id} className="py-3 first:pt-0 last:pb-0">
                  {editingId === item.item_id ? (
                    <ItemEditor
                      item={item}
                      showDate={false}
                      onSave={(text) => saveEdit(item, text, '')}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex items-start gap-3 text-sm">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" aria-hidden="true" />
                      <span className="min-w-0 flex-1 text-ink">{item.description}</span>
                      {itemTools(item)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/upload"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-hover focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          <Upload size={16} aria-hidden="true" />
          Upload another document
        </Link>
        <Link
          to="/my-documents"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-field bg-white px-5 text-sm font-semibold text-ink transition hover:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
        >
          Back to My Documents
        </Link>
      </div>

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