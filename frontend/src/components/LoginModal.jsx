import React, { useState } from 'react'
import { Icon, icons } from './Icon'

export const LoginModal = ({ open, onClose, onLogin, error, busy }) => {
  const [email, setEmail] = useState('buyer@commercesuite.dev')
  const [password, setPassword] = useState('demo123')

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    onLogin(email, password)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-head">
          <h3>Sign in</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <Icon d={icons.x} size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Email address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@company.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', marginTop: 4 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="form-hint">Demo: buyer@commercesuite.dev / demo123</p>
        </form>
      </div>
    </div>
  )
}
