
// Logs the user out and returns them to the login page with a message
export const endSession = (navigate, message = 'Your session has expired. Please log in again.') => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  navigate('/login', { replace: true, state: { successMessage: message } })
}

// Formats a date from the API (e.g. "2026-03-17T00:00:00.000Z") as "17 March 2026"
export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
