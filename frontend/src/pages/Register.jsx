
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import AuthLayout from '../layouts/AuthLayout'
import { registerUser } from '../services/authService'

function Register() {
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const [formData, setFormData] = useState({
    fullName: '',
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

    const newErrors = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Please enter your full name.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.'
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Password must contain at least 8 characters.'
    }

    setErrors(newErrors)
    setServerError('')

    if (Object.keys(newErrors).length > 0) {
      return
    }

    try {
      setIsLoading(true)

      const data = await registerUser({
        ...formData,
        email: formData.email.trim(),
      })

      navigate('/login', {
        state: {
          successMessage: data.message,
        },
      })
    } catch (error) {
      if (error.status === 409) {
        setErrors({
          email: error.message,
        })
      } else {
        setServerError(
          error.message || 'Unable to register. Please try again.'
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = (field) =>
    `h-12 w-full rounded-lg border bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#17324D] focus:ring-2 focus:ring-[#17324D]/10 ${
      errors[field] ? 'border-red-500' : 'border-[#D7DEE8]'
    }`

  return (
    <AuthLayout>
      <section className="w-full max-w-[460px] rounded-xl border border-[#D7DEE8] bg-[#F7F9FC] p-6 sm:p-8 md:p-10">

        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold tracking-tight text-[#17324D] sm:text-2xl">
            Create your account
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Get started with your personal Action Guide.
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Full name
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              required
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              className={inputClass('fullName')}
            />

            {errors.fullName && (
              <p id="fullName-error" className="mt-1 text-xs text-red-700">
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-700"
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
              <p id="email-error" className="mt-1 text-xs text-red-700">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-700"
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
                placeholder="Create a password"
                autoComplete="new-password"
                required
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-hint"
                className={`${inputClass('password')} pr-12`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#168C83] transition hover:text-[#116B65] focus:outline-none focus:ring-2 focus:ring-[#168C83]"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            <p id="password-hint" className="mt-1.5 text-xs text-slate-600">
              Use at least 8 characters.
            </p>

            {errors.password && (
              <p className="mt-1 text-xs text-red-700">
                {errors.password}
              </p>
            )}
          </div>

          {/* Server Error */}
          {serverError && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {serverError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full rounded-lg bg-[#17324D] px-4 text-sm font-semibold text-white transition hover:bg-[#244766] focus:outline-none focus:ring-2 focus:ring-[#17324D] focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>

        </form>

        {/* Login Link */}
        <p className="mt-7 text-center text-sm text-slate-700">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#168C83] transition hover:text-[#116B65] hover:underline"
          >
            Log in
          </Link>
        </p>

      </section>
    </AuthLayout>
  )
}

export default Register
