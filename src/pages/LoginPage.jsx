import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import Spinner from '../components/common/Spinner'

export default function LoginPage() {
  const { session, signIn, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!loading && session) {
    return <Navigate to={location.state?.from ?? '/dashboard'} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      navigate(location.state?.from ?? '/dashboard', { replace: true })
    } catch (err) {
      // Deliberately vague: distinguishing "no such account" from "wrong
      // password" tells an attacker which emails are registered.
      setError(
        err.message?.includes('Invalid login')
          ? 'That email and password combination did not work.'
          : (err.message ?? 'Could not sign you in.'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-8 block text-center text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Back
        </Link>

        <div className="card p-7">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">Your leads are waiting.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800"
              >
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5">
              {busy ? <Spinner className="h-4 w-4" /> : null}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Need an account?{' '}
          <Link to="/signup" className="font-semibold text-slate-700 underline underline-offset-4">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
