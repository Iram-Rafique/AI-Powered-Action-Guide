import { useRef } from 'react'
import { CalendarPlus, Download, ExternalLink } from 'lucide-react'
import { downloadIcs, googleCalendarUrl } from '../utils/calendar'

// "Add to calendar" button with two choices: Google Calendar or an .ics file
// (Outlook, Apple Calendar). Uses <details> so it opens with the keyboard too.
function CalendarButton({ item, documentName, compact = false }) {
  const menuRef = useRef(null)
  const close = () => menuRef.current?.removeAttribute('open')

  return (
    <details ref={menuRef} className="relative">
      <summary
        aria-label={compact ? `Add "${item.description}" to calendar` : undefined}
        className={`flex cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-navy [&::-webkit-details-marker]:hidden ${
          compact
            ? 'p-2 text-muted hover:bg-cream hover:text-ink'
            : 'border border-field bg-white px-3 py-2 text-ink hover:border-navy'
        }`}
      >
        <CalendarPlus size={compact ? 17 : 16} className={compact ? '' : 'text-coral'} aria-hidden="true" />
        {!compact && 'Add to calendar'}
      </summary>

      <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-sand bg-white py-1 text-sm shadow-[0_8px_30px_rgba(30,42,68,0.15)]">
        <a
          href={googleCalendarUrl(item, documentName)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          className="flex items-center gap-2 px-4 py-2.5 text-ink hover:bg-cream focus:bg-cream focus:outline-none"
        >
          <ExternalLink size={16} className="text-muted" aria-hidden="true" />
          Google Calendar
        </a>
        <button
          type="button"
          onClick={() => {
            downloadIcs(item, documentName)
            close()
          }}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-ink hover:bg-cream focus:bg-cream focus:outline-none"
        >
          <Download size={16} className="text-muted" aria-hidden="true" />
          Outlook / Apple (.ics)
        </button>
      </div>
    </details>
  )
}

export default CalendarButton
