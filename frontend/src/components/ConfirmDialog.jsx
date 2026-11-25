import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

// A pop-up that asks the user to confirm a risky action, such as deleting.
// Accessible: focus moves to Cancel, Escape closes it, and screen readers announce it.
function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null)

  // Move focus to Cancel when the dialog opens
  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  // Close with the Escape key
  useEffect(() => {
    if (!open) return undefined

    const handleKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-md rounded-2xl border border-sand bg-white p-6 shadow-[0_8px_30px_rgba(30,42,68,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-urgent-bg text-urgent">
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="confirm-title" className="text-base font-bold text-ink">{title}</h2>
            <p id="confirm-message" className="mt-1 text-sm leading-6 text-muted">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-11 rounded-lg border border-field px-5 text-sm font-semibold text-ink transition hover:bg-cream focus:outline-none focus:ring-2 focus:ring-navy disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="h-11 rounded-lg bg-urgent px-5 text-sm font-semibold text-white transition hover:bg-[#881337] focus:outline-none focus:ring-2 focus:ring-urgent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
