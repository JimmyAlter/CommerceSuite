import { useState } from 'react'
import { Icon } from './Icon'
import { icons } from './iconPaths'

// Public demo accounts, also listed in the README.
const DEMO_PASSWORD = 'demo123'
const DEMO_ACCOUNTS = [
  { label: 'Sign in as buyer', email: 'buyer@commercesuite.dev' },
  { label: 'Sign in as admin', email: 'admin@commercesuite.dev' },
]

export const LoginModal = ({ open, onClose, onLogin, error, busy }) => {
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email)
  const [password, setPassword] = useState(DEMO_PASSWORD)

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    onLogin(email, password)
  }

  const signInAs = (account) => {
    setEmail(account.email)
    setPassword(DEMO_PASSWORD)
    onLogin(account.email, DEMO_PASSWORD)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <div className="modal-head">
          <h3 id="login-title">Sign in</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close sign in">
            <Icon d={icons.x} size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="demo-accounts">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => signInAs(account)}
              >
                {account.label}
              </button>
            ))}
          </div>
          <div className="form-group">
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@company.com" />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="form-hint">
            Demo accounts: buyer@commercesuite.dev or admin@commercesuite.dev, password demo123
          </p>
        </form>
      </div>
    </div>
  )
}
