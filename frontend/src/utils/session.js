// Reads the expiry time from the JWT (the middle part of the token is base64 JSON).
// This only decides what the interface shows: the backend still checks every token.
const tokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

// True if a token is stored and has not expired
export const isLoggedIn = () => {
  const token = localStorage.getItem('token')
  return Boolean(token) && !tokenExpired(token)
}

// The logged-in user's details saved at login ({ user_id, name, email }), or null
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
}

// Removes the saved login details
export const clearSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// Logs the user out and returns them to the login page with a message
export const endSession = (navigate, message = 'Your session has expired. Please log in again.') => {
  clearSession()
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