// Helpers for adding a deadline or appointment to the user's calendar.
// Everything happens in the browser: no data is sent to another service
// unless the user chooses Google Calendar themselves.

// "2026-03-17T00:00:00.000Z" -> "20260317"
const toCalendarDate = (value) => new Date(value).toISOString().slice(0, 10).replace(/-/g, '')

// The day after, because all-day events end on the following day
const nextDay = (value) => {
  const date = new Date(value)
  date.setUTCDate(date.getUTCDate() + 1)
  return toCalendarDate(date)
}

// Characters that must be escaped inside .ics text
const escapeIcs = (text) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Link that opens Google Calendar with the event filled in
export const googleCalendarUrl = (item, documentName) => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: item.description,
    dates: `${toCalendarDate(item.due_date)}/${nextDay(item.due_date)}`,
    details: `From your Action Guide for "${documentName}". Please check the original letter for times and details.`,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

// Downloads an .ics file, which opens in Outlook, Apple Calendar and most other calendars
export const downloadIcs = (item, documentName) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Action Guide//EN',
    'BEGIN:VEVENT',
    `UID:action-guide-${item.item_id}@action-guide`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${toCalendarDate(item.due_date)}`,
    `DTEND;VALUE=DATE:${nextDay(item.due_date)}`,
    `SUMMARY:${escapeIcs(item.description)}`,
    `DESCRIPTION:${escapeIcs(`From your Action Guide for "${documentName}". Please check the original letter for times and details.`)}`,
    // Reminder one day before
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(item.description)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `action-guide-${toCalendarDate(item.due_date)}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}