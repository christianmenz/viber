import express from 'express'
import { createChat } from './chat.js'
import { GAME_SYSTEM_PROMPT, SETTINGS_INSTRUCTIONS } from './gamePrompt.js'
import { createGameMail } from './gameMail.js'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000
const HOST = process.env.APP_HOST || undefined
const USERNAME = process.env.APP_LOGIN_USER || 'fd25'
const PASSWORD = process.env.APP_LOGIN_PASSWORD || 'fd25'
const gameMail = createGameMail(process.env, PASSWORD)
const apiKey = process.env.AZURE_OPENAI_API_KEY
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || 'https://eastus2.api.cognitive.microsoft.com/'
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'fibu3-gpt5.6-terra-prod'
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview'

const chat = createChat({
  apiKey, endpoint: AZURE_ENDPOINT, deployment: AZURE_DEPLOYMENT,
  apiVersion: AZURE_API_VERSION, secure: process.env.RENDER === 'true',
})

if (!apiKey) {
  console.warn('Warnung: AZURE_OPENAI_API_KEY ist nicht gesetzt. Login-Anfragen werden fehlschlagen.')
}

app.use(cors())
app.post('/api/email/game', express.json({ limit: '1mb' }), gameMail.send)
app.use('/api/chat', chat.router)
app.use(express.json())

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {}
  if (username !== USERNAME || password !== PASSWORD) {
    return res.status(401).json({ error: 'Ungültige Zugangsdaten' })
  }
  if (!apiKey) {
    return res.status(500).json({ error: 'Server hat keinen API-Schlüssel konfiguriert.' })
  }
  gameMail.openSession(req, res)
  chat.openSession(req, res)
  res.json({ success: true })
})

app.post('/api/logout', (req, res) => {
  gameMail.closeSession(req, res)
  chat.closeSession(req, res)
  res.json({ success: true })
})

app.post('/api/generate', async (req, res) => {
  const { messages } = req.body || {}
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages fehlt oder ist kein Array.' })
  }
  if (!apiKey) {
    return res.status(500).json({ error: 'Server hat keinen API-Schlüssel konfiguriert.' })
  }

  const endpoint = AZURE_ENDPOINT.replace(/\/$/, '')
  const deployment = AZURE_DEPLOYMENT
  const apiVersion = AZURE_API_VERSION

  if (!endpoint || !deployment || !apiVersion) {
    return res.status(400).json({ error: 'Azure-Konfiguration ist unvollständig.' })
  }

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
  const payload = {
    messages: [
      { role: 'system', content: GAME_SYSTEM_PROMPT + SETTINGS_INSTRUCTIONS },
      ...messages.filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string'),
    ],
    max_completion_tokens: 16000,
    response_format: { type: 'text' },
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180_000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({ error: errorText })
    }

    const data = await response.json()
    const choice = data?.choices?.[0]
    if (choice?.finish_reason === 'length') {
      return res.status(400).json({ error: 'Das Spiel war zu groß für eine Antwort. Bitte versuche eine kleinere Version mit weniger Funktionen.' })
    }
    const content = normalizeContent(choice?.message?.content) ?? normalizeContent(choice?.message?.reasoning_content)
    if (!content) {
      const finishReason = choice?.finish_reason
      if (finishReason === 'length') {
        return res.status(400).json({
          error: 'Azure OpenAI hat die maximale Antwortlänge erreicht. Bitte fordere eine kürzere Antwort an.',
        })
      }
      return res.status(500).json({ error: 'Azure OpenAI hat eine leere Antwort geliefert.' })
    }

    res.json({ content })
  } catch (error) {
    console.error('Fehler bei Azure-Request', error)
    res.status(500).json({ error: 'Fehler beim Aufruf von Azure OpenAI.' })
  }
})

function normalizeContent(content) {
  if (!content) return null
  if (typeof content === 'string') {
    const trimmed = content.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (Array.isArray(content)) {
    const combined = content
      .map((chunk) => chunk?.text ?? '')
      .join('\n')
      .trim()
    return combined.length > 0 ? combined : null
  }
  return null
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.resolve(__dirname, '../dist')
const assetsPath = path.join(distPath, 'assets')

app.use('/assets', express.static(assetsPath, { immutable: true, maxAge: '1y' }))
app.use('/vite.svg', express.static(path.join(distPath, 'vite.svg')))
app.use(express.static(distPath))

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  if (req.method !== 'GET') return next()
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, HOST, () => {
  console.log(`App läuft auf Port ${PORT}`)
})
