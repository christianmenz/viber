import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000
const USERNAME = process.env.APP_LOGIN_USER || 'fd25'
const PASSWORD = process.env.APP_LOGIN_PASSWORD || 'fd25'
const apiKey = process.env.AZURE_OPENAI_API_KEY

if (!apiKey) {
  console.warn('Warnung: AZURE_OPENAI_API_KEY ist nicht gesetzt. Login-Anfragen werden fehlschlagen.')
}

app.use(cors())
app.use(express.json())

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {}
  if (username !== USERNAME || password !== PASSWORD) {
    return res.status(401).json({ error: 'Ungültige Zugangsdaten' })
  }
  if (!apiKey) {
    return res.status(500).json({ error: 'Server hat keinen API-Schlüssel konfiguriert.' })
  }
  res.json({ apiKey })
})

app.post('/api/logout', (_req, res) => {
  res.json({ success: true })
})

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

app.listen(PORT, () => {
  console.log(`App läuft auf Port ${PORT}`)
})
