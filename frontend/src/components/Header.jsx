import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { FileCheck2, FolderOpen, LogOut, Menu, Upload, UserRound, X } from 'lucide-react'
import { endSession, getUser, isLoggedIn } from '../utils/session'

// Links shown to logged-in users
const APP_LINKS = [
  { to: '/my-documents', label: 'My Documents', icon: FolderOpen },
  { to: '/upload', label: 'Upload', icon: Upload },
]

// Style for a navigation link; the current page is white with a coral underline
const navLinkClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-coral ${
    isActive
      ? 'text-white underline decoration-coral decoration-2 underline-offset-8'
      : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`

function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  // The page the mobile menu was opened on; it closes itself after moving to another page
  const [menuOpenOn, setMenuOpenOn] = useState(null)
  const menuOpen = menuOpenOn === location.pathname

  // Read on every render, so the header updates as soon as the user logs in or out
  const loggedIn = isLoggedIn()
  const user = loggedIn ? getUser() : null
  const firstName = user?.name?.split(' ')[0]

  const handleLogout = () => {
    endSession(navigate, 'You have been logged out.')
  }

  return (
    <header className="w-full border-b-[3px] border-coral bg-ink">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center gap-6 px-5 sm:px-8 lg:px-10">

        {/* Logo: goes to My Documents when logged in, otherwise to Login */}
        <Link
          to={loggedIn ? '/my-documents' : '/login'}
          className="flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          <FileCheck2 size={28} strokeWidth={2.2} className="text-coral" aria-hidden="true" />
          <span className="text-xl font-bold text-white">Action Guide</span>
        </Link>

        {loggedIn ? (
          <>
            {/* Desktop navigation */}
            <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
              {APP_LINKS.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={navLinkClass}>
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto hidden items-center gap-4 md:flex">
              {firstName && (
                <span className="flex items-center gap-2 text-sm text-white/80">
                  <UserRound size={17} className="text-coral" aria-hidden="true" />
                  {firstName}
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-sm font-medium text-white transition hover:border-coral hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              >
                <LogOut size={16} aria-hidden="true" />
                Log out
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMenuOpenOn(menuOpen ? null : location.pathname)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="ml-auto rounded-md p-2 text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral md:hidden"
            >
              {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            </button>
          </>
        ) : (
          /* Visitors who are not logged in */
          <nav aria-label="Account" className="ml-auto flex items-center gap-2">
            <NavLink to="/login" className={navLinkClass}>
              Log in
            </NavLink>
            <Link
              to="/register"
              className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#F48A76] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Register
            </Link>
          </nav>
        )}
      </div>

      {/* Mobile menu panel */}
      {loggedIn && menuOpen && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-white/10 px-5 pb-4 pt-2 md:hidden">
          {firstName && (
            <p className="flex items-center gap-2 px-3 py-2 text-sm text-white/80">
              <UserRound size={17} className="text-coral" aria-hidden="true" />
              Signed in as {firstName}
            </p>
          )}
          {APP_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navLinkClass}>
              <Icon size={17} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            <LogOut size={17} aria-hidden="true" />
            Log out
          </button>
        </nav>
      )}
    </header>
  )
}

export default Header