import type { ChatMessage, LlmMessage } from '../types'

interface BuildRequestMessagesArgs {
  messages: ChatMessage[]
  codeDraft: string
  newPrompt: string
}

// Keep recent conversation, without sending full old game versions repeatedly.
export function buildRequestMessages({ messages, codeDraft, newPrompt }: BuildRequestMessagesArgs): LlmMessage[] {
  const conversation = messages.filter((message) => message.role !== 'system')
  const last = conversation.at(-1)
  const history = last?.role === 'user' && last.content === newPrompt ? conversation.slice(0, -1) : conversation
  const recent: LlmMessage[] = history.slice(-8).map((message) => ({
    role: message.role,
    content: message.role === 'assistant'
      ? message.content.replace(/```[\s\S]*?```/g, '[Spielcode in einer früheren Version erstellt.]')
      : message.content,
  }))
  return [...recent, {
    role: 'user',
    content: `Aktueller Spielcode (Grundlage für Änderungen):\n<current_game>\n${codeDraft.trim() || '(noch kein Spiel)'}\n</current_game>\n\nMein Wunsch:\n${newPrompt}`,
  }]
}
