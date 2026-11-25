import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { clearSession, isLoggedIn } from '../utils/session'

// Pages only for logged-in users (My Documents, Upload, Action Guide).
// Anyone else is sent to the login page.
export function ProtectedRoute() {
  const location = useLocation()

  if (!isLoggedIn()) {
    // Remove an expired token so the header shows the logged-out links
    clearSession()
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

// Pages only for visitors who are not logged in (Register, Login).
// A logged-in user is sent to My Documents instead.
export function GuestRoute() {
  if (isLoggedIn()) {
    return <Navigate to="/my-documents" replace />
  }

  return <Outlet />
}

// The home address sends each user to the right place
export function HomeRedirect() {
  return <Navigate to={isLoggedIn() ? '/my-documents' : '/login'} replace />
}