import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { ChatMessage } from '../types'

interface ChatPanelProps {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  onSend: (prompt: string) => void
  onClear: () => void
}

export function ChatPanel({ messages, isLoading, error, onSend, onClear }: ChatPanelProps) {
  const [draft, setDraft] = useState('Beschreibe ein knackiges Viber-Erlebnis...')

  const visibleMessages = useMemo(() => messages.filter((m) => m.role !== 'system'), [messages])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) return
    onSend(trimmed)
    setDraft('')
  }

  return (
    <section className="panel chat-panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Prompt-Labor</p>
          <h2>Chatte mit deinem KI-Buddy</h2>
        </div>
        <button type="button" className="ghost" onClick={onClear}>
          Chat zurücksetzen
        </button>
      </header>

      {isLoading && (
        <div className="chat-panel__status">
          <span className="dot-flash" aria-hidden="true" />
          <p>KI denkt nach...</p>
        </div>
      )}

      <div className="chat-panel__feed">
        {visibleMessages.length === 0 && (
          <div className="empty-state">
            <p>Teile deine Idee und lass die KI daraus Code machen, den du anpassen kannst.</p>
          </div>
        )}
        {visibleMessages.map((message) => (
          <article key={message.id} className={`chat-bubble chat-bubble--${message.role}`}>
            <p className="chat-bubble__role">{message.role === 'assistant' ? 'KI-Buddy' : 'Du'}</p>
            <p>{message.content}</p>
          </article>
        ))}
      </div>

      {error && <p className="error-banner">{error}</p>}

      <form className="chat-panel__composer" onSubmit={handleSubmit}>
        <textarea
          placeholder="Erzähl der KI, was sie bauen soll, welche Farben du magst oder was bei einem Klick passieren soll."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
        />
        <div className="chat-panel__actions">
          <button type="submit" disabled={isLoading || draft.trim().length === 0}>
            {isLoading ? 'Magie wird geladen...' : 'An die KI senden'}
          </button>
        </div>
      </form>
    </section>
  )
}
