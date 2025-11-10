import type { AzureConfig, ChatMessage } from '../types'

interface RequestParams {
  config: AzureConfig
  messages: ChatMessage[]
  signal?: AbortSignal
}

export async function requestAiCode({ config, messages, signal }: RequestParams) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      config: {
        endpoint: config.endpoint,
        deployment: config.deployment,
        apiVersion: config.apiVersion,
      },
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
