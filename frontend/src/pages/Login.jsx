
import { useLocation } from 'react-router-dom'

function Login() {
  const location = useLocation()
  const successMessage = location.state?.successMessage

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">

      {successMessage && (
        <div
          role="status"
          className="mb-6 w-full max-w-md rounded-lg border border-[#168C83]/30 bg-[#168C83]/10 px-4 py-3 text-center text-sm text-[#116B65]"
        >
          {successMessage}
        </div>
      )}

      <h1 className="text-2xl font-bold text-[#17324D]">
        Login page – Coming soon
      </h1>

    </div>
  )
}

export default Login
