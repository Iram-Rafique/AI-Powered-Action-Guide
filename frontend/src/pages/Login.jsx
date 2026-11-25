import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import AuthLayout from '../layouts/AuthLayout'
import { loginUser } from '../services/authService'

function Login() {
  const location = useLocation()
  const navigate = useNavigate()

  const successMessage = location.state?.successMessage

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }))

    setServerError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isLoading) return

    const newErrors = {}

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.'
    }

    if (!formData.password) {
      newErrors.password = 'Please enter your password.'
    }

    setErrors(newErrors)
    setServerError('')

    if (Object.keys(newErrors).length > 0) {
      return
    }

    try {
      setIsLoading(true)

      const data = await loginUser({
        email: formData.email.trim(),
        password: formData.password,
      })

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Clear login fields
      setFormData({
        email: '',
        password: '',
      })

      setErrors({})
      setServerError('')
      setShowPassword(false)

      // Return to the page the user tried to open, or My Documents
      navigate(location.state?.from || '/my-documents', { replace: true })
    } catch (error) {
      if (error.status === 401) {
        setServerError('Invalid email or password.')
      } else {
        setServerError(
          error.message || 'Unable to log in. Please try again.'
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = (field) =>
    `h-12 w-full rounded-lg border bg-white px-4 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-navy focus:ring-2 focus:ring-navy/15 ${
      errors[field] ? 'border-urgent' : 'border-field'
    }`

  return (
    <AuthLayout>
      <section className="w-full max-w-[460px] rounded-2xl border border-sand bg-white p-6 shadow-[0_8px_30px_rgba(30,42,68,0.08)] sm:p-8 md:p-10">

        {/* Heading */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-coral" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Welcome back
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted">
            Log in to access your personal Action Guide.
          </p>
        </div>

        {/* Message from the previous page (e.g. account created, logged out) */}
        {successMessage && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-done-border bg-done-bg px-4 py-3 text-sm font-medium text-done"
          >
            {successMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-ink"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              autoComplete="email"
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={inputClass('email')}
            />

            {errors.email && (
              <p id="email-error" className="mt-1 text-xs text-urgent">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-ink"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`${inputClass('password')} pr-12`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition hover:text-ink focus:outline-none focus:ring-2 focus:ring-navy"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {errors.password && (
              <p id="password-error" className="mt-1 text-xs text-urgent">
                {errors.password}
              </p>
            )}
          </div>

          {/* Server Error */}
          {serverError && (
            <p
              role="alert"
              className="rounded-lg border border-urgent-border bg-urgent-bg px-3 py-2 text-sm text-urgent"
            >
              {serverError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full rounded-lg bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy-hover focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>

        </form>

        {/* Register Link */}
        <p className="mt-7 text-center text-sm text-muted">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-coral-text underline-offset-4 transition hover:underline"
          >
            Register
          </Link>
        </p>

      </section>
    </AuthLayout>
  )
}

export default Login