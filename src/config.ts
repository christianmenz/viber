import type { AzureConfig, ChatMessage } from './types'

export const STORAGE_KEYS = {
  chat: 'futureday25:chat',
  draft: 'futureday25:draft',
  preview: 'futureday25:preview',
  azure: 'futureday25:azure',
} as const

export const DEFAULT_CHAT_START: ChatMessage[] = [
  {
    id: 'system-1',
    role: 'system',
    content:
      'Du bist ein freundlicher KI-Coding-Buddy für 10- bis 15-Jährige. Erstelle lauffähiges HTML, CSS und JS in einem einzigen HTML-Dokument, das direkt in einem iframe läuft. Halte alles möglichst schlicht und kurz: wenig CSS, keine schweren Frameworks und nur Animationen, wenn ausdrücklich gewünscht.',
    createdAt: Date.now(),
  },
]

export const DEFAULT_AZURE_CONFIG: AzureConfig = {
  endpoint: 'https://swedencentral.api.cognitive.microsoft.com/',
  deployment: 'fibu3-gpt5-prod',
  apiVersion: '2025-01-01-preview',
  apiKey: '',
}

export const STARTER_CODE = `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <title>Future-Day-Sandbox</title>
    <style>
      body {
        font-family: 'Space Grotesk', sans-serif;
        background: radial-gradient(circle at top, #f8f1ff, #f0fbff);
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
      }
      .card {
        background: white;
        padding: 3rem;
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
      <h1>Starte deine Idee!</h1>
      <p>Bitte die KI, hier Code abzulegen, und klick anschließend auf \"Ausführen\".</p>
    </div>
  </body>
</html>`
