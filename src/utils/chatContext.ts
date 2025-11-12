import type { ChatMessage, LlmMessage } from '../types'

interface BuildRequestMessagesArgs {
  messages: ChatMessage[]
  codeDraft: string
  newPrompt: string
}

const NO_HISTORY_FALLBACK = 'No prior conversation between user and assistant.'

export function buildRequestMessages({ messages, codeDraft, newPrompt }: BuildRequestMessagesArgs): LlmMessage[] {
  const systemMessages: LlmMessage[] = messages
    .filter((message) => message.role === 'system')
    .map((message) => ({ role: message.role, content: message.content }))

  const userMessages = messages.filter((message) => message.role === 'user')
  const historicalUserMessages = userMessages.slice(0, Math.max(0, userMessages.length - 1))
  const historyBlock = historicalUserMessages.length
    ? historicalUserMessages.map((message) => `user: ${message.content}`).join('\n\n')
    : NO_HISTORY_FALLBACK

  const normalizedCode = codeDraft.trim().length > 0 ? codeDraft : '(no current code provided)'
  const content = [
    'past messages:',
    historyBlock,
    '',
    'the current code:',
    normalizedCode,
    '',
    'new ask:',
    newPrompt,
  ].join('\n')

  return [...systemMessages, { role: 'user', content }]
}
