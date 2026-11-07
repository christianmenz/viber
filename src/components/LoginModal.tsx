import { useState } from 'react'
import { Brand } from './Brand'
import type { FormEvent } from 'react'

interface LoginModalProps {
  isLoading: boolean
  error: string | null
  onSubmit: (username: string, password: string) => void
}

export function LoginModal({ isLoading, error, onSubmit }: LoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(username, password)
  }

  return (
    <div className="auth-overlay">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Brand compact /><p className="eyebrow">PLAYER ONE • BEREIT?</p>
        <h2>Dein Abenteuer startet hier.</h2>
        <p className="auth-card__hint">
          Mit deinem Werkstatt-Zugang geht es los. Dein gespeichertes Spiel bleibt beim Abmelden erhalten.
        </p>

        <label>
          <span>Benutzername</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>

        <label>
          <span>Passwort</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <p className="error-banner">{error}</p>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Prüfe Zugang...' : 'LET’S PLAY →'}
        </button>
      </form>
    </div>
  )
}
