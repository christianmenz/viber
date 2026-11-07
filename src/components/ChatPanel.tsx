import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { ChatMessage } from '../types'
import { PixelIcon } from './PixelIcon'
import { extractRunnableCode } from '../services/azureClient'

interface ChatPanelProps {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  onSend: (prompt: string) => void
  onClear: () => void
}

const IDEAS = [
  { label: '🚀 Weltraum', prompt: 'Baue ein Weltraumspiel: Ich fliege mit einer Rakete, weiche Asteroiden aus und sammle Sterne. Mit Punkten und immer mehr Tempo!' },
  { label: '🐸 Hüpf-Abenteuer', prompt: 'Baue ein lustiges Hüpfspiel mit einem Frosch, der über Hindernisse springt und Fliegen sammelt. Mit Tastatur und einem großen Sprungknopf.' },
  { label: '🍓 Fang die Früchte', prompt: 'Baue ein buntes Spiel: Ich bewege einen Korb und fange fallende Früchte. Bomben muss ich vermeiden. Mit drei Leben und einem Neustart.' },
  { label: '🧩 Memory', prompt: 'Baue ein niedliches Tier-Memory mit 12 Karten, Zugzähler, schönen Aufdeck-Effekten und einem Gewinnbildschirm.' },
]
const UPGRADES = ['Baue ein zweites Level ein.', 'Füge ein cooles Power-up hinzu.', 'Mach es leichter.', 'Mach die Grafik noch verspielter.']

export function ChatPanel({ messages, isLoading, error, onSend, onClear }: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const feed = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const visibleMessages = useMemo(() => messages.filter((m) => m.role !== 'system'), [messages])
  const hasGame = visibleMessages.some((m) => m.role === 'assistant' && extractRunnableCode(m.content))

  useEffect(() => {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight
  }, [messages, isLoading])

  const choosePrompt = (prompt: string) => {
    setDraft(prompt)
    composer.current?.focus()
  }
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setDraft('')
  }

  return (
    <section className="panel chat-panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow"><PixelIcon name="star" /> IDEEN-WERKSTATT</p>
          <h2>Was spielen wir?</h2>
        </div>
        <button type="button" className="ghost" disabled={isLoading} onClick={onClear}>Chat leeren</button>
      </header>

      <div className="chat-panel__feed" ref={feed} role="log" aria-label="Unterhaltung mit Viber">
        {visibleMessages.length === 0 && (
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">🎮</span>
            <h3>Eine Idee reicht!</h3>
            <p>Wähle eine Spielidee oder erfinde deine eigene. Du kannst danach alles verändern.</p>
            <div className="idea-grid">
              {IDEAS.map((idea) => <button type="button" className="idea-button" key={idea.label} disabled={isLoading} onClick={() => choosePrompt(idea.prompt)}>{idea.label}</button>)}
            </div>
          </div>
        )}
        {visibleMessages.map((message) => {
          const code = message.role === 'assistant' ? extractRunnableCode(message.content) : null
          const prose = code
            ? message.content.replace(/```[\s\S]*?```/g, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\n{3,}/g, '\n\n').trim()
            : message.content
          return (
            <article key={message.id} className={`chat-bubble chat-bubble--${message.role}`}>
              <p className="chat-bubble__role"><PixelIcon name={message.role === 'assistant' ? 'game' : 'heart'} />{message.role === 'assistant' ? 'VIBER' : 'DU'}</p>
              <p className="chat-bubble__text">{code && prose === message.content ? 'Dein Spiel ist bereit! Probier es rechts aus.' : prose || 'Dein Spiel ist bereit! Probier es rechts aus.'}</p>
              {code && <span className="game-ready">✓ Spielcode erstellt</span>}
            </article>
          )
        })}
      </div>

      {isLoading && <div className="chat-panel__status" role="status"><span className="dot-flash" aria-hidden="true" /><p>Dein Spiel entsteht … Das kann 1–3 Minuten dauern.</p></div>}
      {error && <div className="error-banner" role="alert"><p>{error}</p><button type="button" className="ghost" disabled={isLoading} onClick={() => choosePrompt([...visibleMessages].reverse().find((m) => m.role === 'user')?.content || '')}>Wunsch nochmal bearbeiten</button></div>}
      {hasGame && <div className="upgrade-list" aria-label="Ideen zum Weiterbauen">{UPGRADES.map((prompt) => <button type="button" className="suggestion" disabled={isLoading} key={prompt} onClick={() => choosePrompt(prompt)}>{prompt}</button>)}</div>}

      <form className="chat-panel__composer" onSubmit={handleSubmit}>
        <label htmlFor="game-prompt">{hasGame ? 'Was soll als Nächstes passieren?' : 'Deine Spielidee'}</label>
        <textarea id="game-prompt" ref={composer} placeholder="Zum Beispiel: Ein Pinguin auf einem Skateboard sammelt Eiscreme …" value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} disabled={isLoading} />
        <p className="composer-hint">Tipp: Sag, wer mitspielt, was das Ziel ist und was es knifflig macht.</p>
        <div className="chat-panel__actions"><button type="submit" disabled={isLoading || draft.trim().length === 0}><PixelIcon name="rocket" />{isLoading ? 'Wird gebaut …' : hasGame ? 'Spiel verbessern' : 'Spiel bauen'}</button></div>
      </form>
    </section>
  )
}
