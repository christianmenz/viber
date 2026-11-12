import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './GeneralChat.css'

type Turn = { role: 'user' | 'assistant'; content: string }

export function GeneralChat({ onSignInAgain }: { onSignInAgain: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const thread = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight
  }, [messages, pending, error])

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const prompt = draft.trim()
    if (!prompt || pending || expired) return

    const user: Turn = { role: 'user', content: prompt }
    const context = [user]
    let remaining = 40000 - prompt.length
    for (const turn of messages.slice(-16).reverse()) {
      if (turn.content.length > Math.min(12000, remaining)) break
      context.unshift(turn)
      remaining -= turn.content.length
    }

    setPending(prompt)
    setDraft('')
    setError('')
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: context }),
      })
      if (response.status === 401) setExpired(true)
      const result = await response.json()
      if (!response.ok || typeof result.content !== 'string') {
        throw new Error(result.error || 'Die KI konnte gerade nicht antworten.')
      }
      setMessages([...messages, user, { role: 'assistant', content: result.content }])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Die Nachricht konnte nicht gesendet werden.')
      setDraft(prompt)
    } finally {
      setPending('')
    }
  }

  return (
    <>
      <button type="button" className="ghost" onClick={() => {
        dialog.current?.showModal()
        if (thread.current) thread.current.scrollTop = thread.current.scrollHeight
      }}>KI-Chat</button>
      <dialog ref={dialog} className="general-chat" aria-labelledby="general-chat-title">
        <div className="general-chat__body">
          <header>
            <h2 id="general-chat-title">KI-Chat</h2>
            <button type="button" className="ghost" disabled={Boolean(pending) || !messages.length}
              onClick={() => { setMessages([]); setDraft(''); setError('') }}>Neuer Chat</button>
            <button type="button" className="ghost" aria-label="Chat schließen" onClick={() => dialog.current?.close()}>×</button>
          </header>
          <div className="general-chat__thread" ref={thread} role="log" aria-label="Chatverlauf">
            {!messages.length && !pending && <p className="general-chat__welcome">Wobei kann ich dir helfen?</p>}
            {(pending ? [...messages, { role: 'user', content: pending }] : messages).map((turn, index) => (
              <div className={`general-chat__turn general-chat__turn--${turn.role}`} key={index}>
                <strong>{turn.role === 'user' ? 'Du' : 'KI'}</strong>
                <div>{turn.content}</div>
              </div>
            ))}
            {pending && <p role="status">Die KI antwortet …</p>}
            {error && <p role="alert">{error}</p>}
          </div>
          <form onSubmit={send}>
            <textarea aria-label="Deine Nachricht" placeholder="Frag mich etwas …" rows={2}
              maxLength={6000} value={draft} readOnly={Boolean(pending) || expired}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }} />
            {expired
              ? <button type="button" onClick={() => { dialog.current?.close(); onSignInAgain() }}>Neu anmelden</button>
              : <button type="submit" disabled={!draft.trim() || Boolean(pending)}>Senden</button>}
          </form>
        </div>
      </dialog>
    </>
  )
}
