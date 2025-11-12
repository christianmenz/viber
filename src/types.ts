export type Role = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  createdAt: number
}

export interface LlmMessage {
  role: Role
  content: string
}

export interface AzureConfig {
  endpoint: string
  deployment: string
  apiVersion: string
  apiKey: string
}
