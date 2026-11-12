import type { AzureConfig, ChatMessage } from './types'

export const STORAGE_KEYS = {
  chat: 'futureday25:chat',
  draft: 'futureday25:draft',
  preview: 'futureday25:preview',
  azure: 'futureday25:azure',
  games: 'futureday25:games',
  activeGame: 'futureday25:activeGame',
} as const

const env = import.meta.env ?? {}

const ENV_AZURE_ENDPOINT = env.AZURE_ENDPOINT as string | undefined
const ENV_AZURE_DEPLOYMENT = env.AZURE_DEPLOYMENT as string | undefined
const ENV_AZURE_API_VERSION = env.AZURE_API_VERSION as string | undefined

export const DEFAULT_CHAT_START: ChatMessage[] = []

export const DEFAULT_AZURE_CONFIG: AzureConfig = {
  endpoint: ENV_AZURE_ENDPOINT || 'https://eastus2.api.cognitive.microsoft.com/',
  deployment: ENV_AZURE_DEPLOYMENT || 'fibu3-gpt5.6-terra-prod',
  apiVersion: ENV_AZURE_API_VERSION || '2024-12-01-preview',
  apiKey: '',
}

export const STARTER_CODE = `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <title>Viber Lab</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        background: radial-gradient(circle at top, #f8f1ff, #f0fbff);
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
      }
      .card {
        background: white;
        padding: clamp(1.5rem, 5vw, 3rem);
        margin: 1rem;
        max-width: 34rem;
        border-radius: 24px;
        box-shadow: 0 20px 80px rgba(15, 23, 42, 0.15);
        text-align: center;
      }
      h1 {
        margin-bottom: 0.5rem;
        font-size: 2.5rem;
        color: #111827;
      }
      p {
        color: #475569;
        font-size: 1.25rem;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>🎮 Willkommen in deiner Spielhalle!</h1>
      <p>Erfinde links ein Spiel. Dein KI-Buddy baut es für dich – und hier kannst du sofort losspielen.</p>
    </div>
  </body>
</html>`
