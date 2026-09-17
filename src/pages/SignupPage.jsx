import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import Spinner from '../components/common/Spinner'

/**
 * Signup is invite-only for the MVP: creating an auth user is only half the
 * job — the account still needs a `business_users` row before the dashboard
 * will show anything, and only someone with database access can add that.
 * The form is here so an invited owner can set their own password rather than
 * having one emailed to them.
 */
export default function SignupPage() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await signUp(email.trim(), password)
      setDone(true)
    } catch (err) {
      setError(err.message ?? 'Could not create that account.')
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
          {done ? (
            <div className="text-center">
              <div className="text-3xl" aria-hidden="true">
                📧
              </div>
              <h1 className="mt-4 text-xl font-bold text-slate-900">Check your email</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Confirm your address, then sign in. If your dashboard says your login is not
                linked to a business yet, ask whoever set this up to link it.
              </p>
              <Link to="/login" className="btn btn-primary mt-6 w-full">
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Create account</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Accounts are set up by invitation while we are in early access.
              </p>

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
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field"
                  />
                  <p className="hint">At least 8 characters.</p>
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
                  {busy ? 'Creating…' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have one?{' '}
          <Link to="/login" className="font-semibold text-slate-700 underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
