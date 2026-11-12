import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import nodemailer from 'nodemailer'

const SESSION_COOKIE = 'viber_mail_session'
const SESSION_MS = 8 * 60 * 60 * 1000
const MAX_GAME_BYTES = 512 * 1024
const ADDRESS = /^[^\s<>@,;:"\\]+@[^\s<>@,;:"\\]+\.[^\s<>@,;:"\\]+$/u

export function createGameMail(env, password) {
  const host = env.SMTP_HOST?.trim()
  const port = Number(env.SMTP_PORT || 587)
  const secure = env.SMTP_SECURE === 'true'
  const user = env.SMTP_USER?.trim()
  const pass = env.SMTP_PASSWORD
  const from = env.SMTP_FROM?.trim()
  const relayUrl = env.MAIL_RELAY_URL?.trim()
  const relayToken = env.MAIL_RELAY_TOKEN
  const accessCode = env.MAIL_ACCESS_CODE
  const relayEnabled = Boolean(relayUrl?.startsWith('https://') && relayToken && accessCode && pass && from && ADDRESS.test(from))
  const configured = host && user && pass && from && ADDRESS.test(from)
    && Number.isInteger(port) && port > 0 && port <= 65535
  const localOnly = env.APP_HOST === '127.0.0.1' && env.RENDER !== 'true'
  const transport = relayEnabled ? nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' })
    : configured && (localOnly || password !== 'fd25') ? nodemailer.createTransport({
    host, port, secure, requireTLS: !secure,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  }) : null

  if (host && !transport) {
    console.warn('SMTP is disabled. Check the SMTP settings. Use APP_HOST=127.0.0.1 locally or set a non-default APP_LOGIN_PASSWORD.')
  }

  const secret = randomBytes(32)
  const sign = (expires) => createHmac('sha256', secret).update(expires).digest('hex')
  const cookieOptions = (req) => ({
    httpOnly: true,
    sameSite: 'strict',
    secure: req.secure || env.RENDER === 'true',
    path: '/api',
  })

  function openSession(req, res) {
    if (!transport) return
    const expires = String(Date.now() + SESSION_MS)
    res.cookie(SESSION_COOKIE, expires + '.' + sign(expires), { ...cookieOptions(req), maxAge: SESSION_MS })
  }

  function closeSession(req, res) {
    res.clearCookie(SESSION_COOKIE, cookieOptions(req))
  }

  function hasSession(req) {
    const cookie = req.headers.cookie?.split('; ').find((value) => value.startsWith(SESSION_COOKIE + '='))
    const token = cookie?.slice(SESSION_COOKIE.length + 1)
    const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(token ?? '')
    return Boolean(match && Number(match[1]) > Date.now()
      && timingSafeEqual(Buffer.from(match[2], 'hex'), Buffer.from(sign(match[1]), 'hex')))
  }

  let sending = false
  let nextSendAt = 0
  async function send(req, res) {
    if (!transport) {
      return res.status(503).json({ error: 'Der E-Mail-Versand ist noch nicht eingerichtet.' })
    }
    if (!hasSession(req)) {
      return res.status(401).json({ error: 'Bitte melde dich erneut an, um ein Spiel per E-Mail zu senden.' })
    }
    const { to, name, html, mailCode } = req.body ?? {}
    if (relayEnabled) {
      const digest = (value) => createHash('sha256').update(value).digest()
      if (typeof mailCode !== 'string' || mailCode.length > 128 || !timingSafeEqual(digest(mailCode), digest(accessCode))) {
        return res.status(403).json({ codeRequired: true, error: 'Gib den Versandcode ein.' })
      }
    }
    if (typeof to !== 'string' || to.length > 254 || !ADDRESS.test(to)
      || typeof name !== 'string' || !name.trim() || name.length > 100 || /[\r\n]/.test(name)
      || typeof html !== 'string' || !html.trim() || Buffer.byteLength(html) > MAX_GAME_BYTES) {
      return res.status(400).json({ error: 'Prüfe die E-Mail-Adresse. Das Spiel darf höchstens 512 KB groß sein.' })
    }
    if (sending || Date.now() < nextSendAt) {
      return res.status(429).json({ error: 'Bitte warte kurz, bevor du ein weiteres Spiel sendest.' })
    }

    sending = true
    nextSendAt = Date.now() + 10_000
    try {
      const filename = name.replace(/[<>:"/\\|?*]/g, '-').replace(/[. ]+$/, '') || 'viber-spiel'
      const result = await transport.sendMail({
        from: { name: 'Viber Lab', address: from },
        to: { name: '', address: to },
        subject: 'Viber-Spiel: ' + name,
        text: 'Im Anhang findest du das Spiel „' + name + '“. Speichere die HTML-Datei und öffne sie im Browser.',
        attachments: [{ filename: filename + '.html', content: html, contentType: 'text/html; charset=utf-8', contentTransferEncoding: 'base64' }],
      })
      if (relayEnabled) {
        const response = await fetch(relayUrl, {
          method: 'POST',
          headers: { 'X-Viber-Relay-Token': relayToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, password: pass, message: result.message.toString('utf8') }),
          signal: AbortSignal.timeout(22_000),
          redirect: 'error',
        })
        if (!response.ok || (await response.json()).ok !== true) throw new Error('Mail relay rejected the message')
      } else if (!result.accepted.length) {
        throw new Error('Recipient rejected')
      }
      return res.json({ success: true })
    } catch (error) {
      console.error('SMTP delivery failed', error.code ?? error.name)
      return res.status(502).json({ error: 'Der Mailserver konnte die E-Mail nicht annehmen. Bitte versuche es später erneut.' })
    } finally {
      sending = false
    }
  }

  return { openSession, closeSession, send }
}
