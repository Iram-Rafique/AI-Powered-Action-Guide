import { AlertTriangle, CalendarClock, CheckCircle2, Clock, HelpCircle } from 'lucide-react'
import { formatDate } from './session'

// Whole days from today until a due date from the API (negative = overdue).
// Due dates are stored as dates at midnight UTC, so both sides are compared as UTC dates.
export const daysUntil = (dueDate) => {
  const due = new Date(dueDate)
  const today = new Date()
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate())
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((dueDay - todayDay) / 86400000)
}

// Style for each urgency level (colours come from index.css)
const STYLES = {
  urgent: { badge: 'border-urgent-border bg-urgent-bg text-urgent', icon: AlertTriangle },
  soon: { badge: 'border-soon-border bg-soon-bg text-soon', icon: Clock },
  later: { badge: 'border-sand bg-white text-muted', icon: CalendarClock },
  nodate: { badge: 'border-sand bg-nodate-bg text-muted', icon: HelpCircle },
  done: { badge: 'border-done-border bg-done-bg text-done', icon: CheckCircle2 },
}

// Urgency of a due date: overdue or within 3 days = urgent, within 7 days = soon.
// Every level has an icon and words, so colour is never the only signal (WCAG 1.4.1).
export const getUrgency = (dueDate) => {
  if (!dueDate) {
    return { level: 'nodate', label: 'No date – check the letter', ...STYLES.nodate }
  }

  const days = daysUntil(dueDate)

  if (days < 0) {
    const overdue = Math.abs(days)
    return { level: 'urgent', label: `Overdue by ${overdue} day${overdue === 1 ? '' : 's'}`, ...STYLES.urgent }
  }
  if (days === 0) return { level: 'urgent', label: 'Due today', ...STYLES.urgent }
  if (days === 1) return { level: 'urgent', label: 'Due tomorrow', ...STYLES.urgent }
  if (days <= 3) return { level: 'urgent', label: `${days} days left`, ...STYLES.urgent }
  if (days <= 7) return { level: 'soon', label: `${days} days left`, ...STYLES.soon }

  return { level: 'later', label: `Due ${formatDate(dueDate)}`, ...STYLES.later }
}

export const DONE_STYLE = STYLES.done
export const NODATE_STYLE = STYLES.nodate