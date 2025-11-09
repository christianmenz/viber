import type { AzureConfig, ChatMessage } from '../types'

interface RequestParams {
  config: AzureConfig
  messages: ChatMessage[]
  signal?: AbortSignal
}

export async function requestAiCode({ config, messages, signal }: RequestParams) {
  if (!config.endpoint || !config.deployment || !config.apiKey) {
    throw new Error('Trage Endpoint, Deployment und API-Schlüssel deiner Azure-OpenAI-Instanz ein, um Code zu erzeugen.')
  }

  const trimmedEndpoint = config.endpoint.replace(/\/$/, '')
  const url = `${trimmedEndpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`

  const payload = {
    messages: messages.map((message) => ({ role: message.role, content: message.content })),
    max_completion_tokens: 16000,
    response_format: { type: 'text' },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Azure-OpenAI-Fehler ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const choice = data?.choices?.[0]
  const rawContent = choice?.message?.content
  const reasoningContent = choice?.message?.reasoning_content
  const content = normalizeContent(rawContent) ?? normalizeContent(reasoningContent)

  if (!content) {
    if (choice?.finish_reason === 'length') {
      throw new Error(
        'Azure OpenAI hat die maximale Antwortlänge erreicht, bevor Code gesendet wurde. Bitte fordere eine kürzere Antwort an oder reduziere den gewünschten Detailgrad.'
      )
    }
    throw new Error('Azure OpenAI hat eine leere Antwort geliefert. Verfeinere den Prompt oder prüfe den Deployment-Namen.')
  }

  return content
}

type AzureContent = string | Array<{ type?: string; text?: string }>

function normalizeContent(content: AzureContent | undefined): string | null {
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
