import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

const SECTIONS = [
  { value: 'action', label: 'Required action' },
  { value: 'date', label: 'Key date' },
  { value: 'detail', label: 'Detail' },
]

// Pop-up panel for correcting one AI-extracted item (FR7).
// Four fields: description, section, due date and status (status only for actions,
// date not for details). onSave(fields) returns a promise and throws an Error on failure.
// Keyboard: Esc closes, Ctrl/Cmd + Enter saves.
function ItemEditor({ item, onSave, onClose }) {
  const [description, setDescription] = useState(item.description)
  const [section, setSection] = useState(item.item_type)
  const [date, setDate] = useState(item.due_date ? item.due_date.slice(0, 10) : '')
  const [status, setStatus] = useState(item.action_status === 'completed' ? 'completed' : 'pending')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const textRef = useRef(null)

  const id = `edit-${item.item_id}`
  const showDate = section !== 'detail'
  const showStatus = section === 'action'

  // Put the cursor at the end of the description when the panel opens
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const save = async () => {
    const text = description.trim()
    if (!text) {
      setError('Please enter a description.')
      textRef.current?.focus()
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        description: text,
        item_type: section,
        due_date: showDate ? date : '',
        ...(showStatus && { action_status: status }),
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !saving) {
      e.preventDefault()
      onClose()
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      save()
    }
  }

  const labelClass = 'mb-1.5 block text-sm font-semibold text-ink'
  const fieldClass =
    'h-11 w-full rounded-lg border border-field bg-white px-3 text-sm text-ink outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/15'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:px-4"
      onMouseDown={() => !saving && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        className="w-full max-w-lg rounded-t-2xl bg-white shadow-[0_8px_30px_rgba(30,42,68,0.2)] sm:rounded-2xl"
      >
        {/* Title */}
        <div className="flex items-center justify-between border-b border-sand px-6 py-4">
          <h2 id={`${id}-title`} className="text-base font-bold text-ink">Edit item</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted transition hover:bg-cream hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* 1. Description */}
          <div>
            <label htmlFor={`${id}-text`} className={labelClass}>Description</label>
            <textarea
              id={`${id}-text`}
              ref={textRef}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setError('')
              }}
              rows={3}
              maxLength={500}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              className={`block w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-sm leading-6 text-ink outline-none transition focus:ring-2 focus:ring-navy/15 ${
                error ? 'border-urgent' : 'border-field focus:border-navy'
              }`}
            />
            {error && (
              <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-urgent">{error}</p>
            )}
          </div>

          {/* 2. Section */}
          <div>
            <label htmlFor={`${id}-section`} className={labelClass}>Section</label>
            <select
              id={`${id}-section`}
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className={fieldClass}
            >
              {SECTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {(showDate || showStatus) && (
            <div className="grid gap-5 sm:grid-cols-2">
              {/* 3. Due date */}
              {showDate && (
                <div>
                  <label htmlFor={`${id}-date`} className={labelClass}>
                    {section === 'action' ? 'Due date' : 'Date'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`${id}-date`}
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  {date ? (
                    <button
                      type="button"
                      onClick={() => setDate('')}
                      className="mt-1.5 text-xs font-semibold text-coral-text underline-offset-4 hover:underline"
                    >
                      Clear date
                    </button>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted">No date</p>
                  )}
                </div>
              )}

              {/* 4. Status (actions only) */}
              {showStatus && (
                <div>
                  <label htmlFor={`${id}-status`} className={labelClass}>Status</label>
                  <select
                    id={`${id}-status`}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="pending">To do</option>
                    <option value="completed">Done</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 border-t border-sand px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-lg border border-field bg-white px-4 text-sm font-semibold text-ink transition hover:border-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-lg bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ItemEditor

