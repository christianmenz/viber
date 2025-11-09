import { useState } from 'react'
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
        <p className="eyebrow">Viber Zugang</p>
        <h2>Bitte einloggen</h2>
        <p className="auth-card__hint">
          Zum Schutz des API-Schlüssels brauchst du vor dem Prompten ein Passwort. Frag dein Coach-Team, wenn du
          keines hast.
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
          {isLoading ? 'Prüfe Zugang...' : 'Anmelden'}
        </button>
      </form>
    </div>
  )
}
