
// Checks Gemini's response before anything is saved or shown to the user.
// AI output is never trusted as it is: every field is validated, and relative
// deadlines (e.g. "within 14 days") are converted into dates here, not by the AI.

export const ITEM_TYPES = ['action', 'date', 'detail']
const MAX_DESCRIPTION_LENGTH = 500
const MAX_RELATIVE_DAYS = 365

// Returns a Date for a real calendar date in YYYY-MM-DD format, otherwise null
export const parseIsoDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const date = new Date(`${value}T00:00:00Z`)

  // Rejects impossible dates such as 2026-02-31
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null
  }

  return date
}

const addDays = (date, days) => {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

// Returns { letterDate, items } or throws an error if the response is unusable
export const validateExtraction = (raw) => {
  let data = raw

  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      throw new Error('The AI response was not valid JSON.')
    }
  }

  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
    throw new Error('The AI response did not contain a list of items.')
  }

  const letterDate = parseIsoDate(data.letter_date)
  const items = []

  for (const item of data.items) {
    if (!item || typeof item !== 'object') continue

    const type = typeof item.type === 'string' ? item.type.toLowerCase() : ''
    const description =
      typeof item.description === 'string' ? item.description.trim() : ''

    // Skip items with an unknown type or no description
    if (!ITEM_TYPES.includes(type) || !description) continue

    let dueDate = parseIsoDate(item.due_date)

    // Work out relative deadlines from the letter date
    const days = item.relative_deadline_days
    if (
      !dueDate &&
      letterDate &&
      Number.isInteger(days) &&
      days > 0 &&
      days <= MAX_RELATIVE_DAYS
    ) {
      dueDate = addDays(letterDate, days)
    }

    // If no date can be identified confidently, due_date stays empty and the
    // frontend asks the user to check the original document.
    items.push({
      item_type: type,
      description: description.slice(0, MAX_DESCRIPTION_LENGTH),
      due_date: dueDate,
      action_status: type === 'action' ? 'pending' : null,
    })
  }

  if (items.length === 0) {
    throw new Error('The AI response did not contain any valid items.')
  }

  return { letterDate, items }
}
