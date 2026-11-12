import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import express from 'express'

const cookieName = 'viber_chat_session'
const sessionAge = 8 * 60 * 60 * 1000
const systemPrompt = 'Du bist der KI-Assistent der Viber Spielewerkstatt. Hilf bei allgemeinen Fragen, erkläre verständlich und altersgerecht, und antworte in der Sprache der Anfrage. Antworte kurz, sofern nicht mehr Details gewünscht sind.'

export function createChat({ apiKey, endpoint, deployment, apiVersion, secure }) {
  const secret = randomBytes(32)
  const sign = (expiry) => createHmac('sha256', secret).update(expiry).digest()
  const cookieOptions = (req) => ({ httpOnly: true, sameSite: 'strict', secure: secure || req.secure, path: '/api' })

  function openSession(req, res) {
    const expiry = String(Date.now() + sessionAge)
    res.cookie(cookieName, expiry + '.' + sign(expiry).toString('hex'), { ...cookieOptions(req), maxAge: sessionAge })
  }

  function closeSession(req, res) {
    res.clearCookie(cookieName, cookieOptions(req))
  }

  const router = express.Router()
  router.post('/', (req, res, next) => {
    const token = req.headers.cookie?.match(/(?:^|;\s*)viber_chat_session=(\d{13})\.([a-f0-9]{64})(?:;|$)/)
    if (!token || Number(token[1]) <= Date.now() || !timingSafeEqual(sign(token[1]), Buffer.from(token[2], 'hex'))) {
      return res.status(401).json({ error: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.' })
    }
    next()
  }, express.json({ limit: '256kb' }), async (req, res) => {
    const messages = req.body?.messages
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 17
      || messages.at(-1)?.role !== 'user'
      || !messages.every((message) => ['user', 'assistant'].includes(message?.role)
        && typeof message.content === 'string' && message.content.trim() && message.content.length <= 12000)
      || messages.reduce((length, message) => length + message.content.length, 0) > 40000) {
      return res.status(400).json({ error: 'Der Chatverlauf ist ungültig oder zu lang.' })
    }

    try {
      const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...messages.map(({ role, content }) => ({ role, content }))],
          max_completion_tokens: 4000,
        }),
        signal: AbortSignal.timeout(60_000),
      })
      if (!upstream.ok) {
        console.error('Azure-Chat fehlgeschlagen:', upstream.status)
        return res.status(upstream.status === 429 ? 429 : 502).json({ error: 'Die KI ist gerade nicht erreichbar. Bitte versuche es noch einmal.' })
      }
      const data = await upstream.json()
      const content = data?.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(502).json({ error: 'Die KI hat keine Antwort geliefert. Bitte versuche es mit einer kürzeren Frage.' })
      }
      res.json({ content: content.trim() })
    } catch (error) {
      console.error('Azure-Chat fehlgeschlagen:', error.name)
      res.status(502).json({ error: 'Die KI konnte gerade nicht antworten. Bitte versuche es noch einmal.' })
    }
  })

  return { router, openSession, closeSession }
}
