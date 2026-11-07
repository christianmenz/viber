import type { LlmMessage } from '../types'

interface RequestParams {
  messages: LlmMessage[]
  signal?: AbortSignal
}

export async function requestAiCode({ messages, signal }: RequestParams) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
    }),
    signal,
  })

  const data = await response.json()
  if (!response.ok) {
    const errorMessage = typeof data?.error === 'string' ? data.error : `Serverfehler ${response.status}`
    throw new Error(errorMessage)
  }

  const content: string | null | undefined = data?.content
  if (!content) {
    throw new Error('Der Server hat keine ausführbare Antwort zurückgegeben.')
  }

  return content
}

export function extractRunnableCode(message: string) {
  const codeFenceMatch = message.match(/```(?:html)?([\s\S]*?)```/i)
  if (codeFenceMatch) {
    return codeFenceMatch[1].trim()
  }
  if (message.trim().startsWith('<!DOCTYPE') || message.trim().startsWith('<html')) {
    return message.trim()
  }
  return null
}
