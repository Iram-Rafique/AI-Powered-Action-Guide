import { useState } from 'react'

// Inline form for correcting an AI-extracted item (FR7).
// onSave(description, date) should return a promise and throw an Error on failure.
function ItemEditor({ item, showDate = true, onSave, onCancel }) {
  const [description, setDescription] = useState(item.description)
  const [date, setDate] = useState(item.due_date ? item.due_date.slice(0, 10) : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const id = `edit-${item.item_id}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) {
      setError('Please enter a description.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(description.trim(), date)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3 rounded-xl border border-navy/30 bg-cream p-4">
      <div>
        <label htmlFor={`${id}-text`} className="mb-1 block text-xs font-semibold text-ink">
          Description
        </label>
        <textarea
          id={`${id}-text`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={500}
          autoFocus
          aria-invalid={Boolean(error)}
          className="w-full rounded-lg border border-field bg-white px-3 py-2 text-sm text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
        />
      </div>

      {showDate && (
        <div>
          <label htmlFor={`${id}-date`} className="mb-1 block text-xs font-semibold text-ink">
            Date <span className="font-normal text-muted">(leave empty if there is none)</span>
          </label>
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-lg border border-field bg-white px-3 text-sm text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-urgent">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="h-9 rounded-lg bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy-hover focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:opacity-70"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-9 rounded-lg border border-field bg-white px-4 text-sm font-semibold text-ink transition hover:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default ItemEditor

