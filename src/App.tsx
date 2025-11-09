import { useState } from 'react'
import './App.css'
import { ChatPanel } from './components/ChatPanel'
import { CodePreview } from './components/CodePreview'
import { DEFAULT_AZURE_CONFIG, DEFAULT_CHAT_START, STARTER_CODE, STORAGE_KEYS } from './config'
import { usePersistentState } from './hooks/usePersistentState'
import { requestAiCode, extractRunnableCode } from './services/azureClient'
import type { AzureConfig, ChatMessage } from './types'
import { LoginModal } from './components/LoginModal'

const createMessage = (role: ChatMessage['role'], content: string): ChatMessage => ({
  id: crypto.randomUUID?.() ?? `${role}-${Date.now()}`,
  role,
  content,
  createdAt: Date.now(),
})

function App() {
  const [messages, setMessages] = usePersistentState<ChatMessage[]>(STORAGE_KEYS.chat, DEFAULT_CHAT_START)
  const [codeDraft, setCodeDraft] = usePersistentState<string>(STORAGE_KEYS.draft, STARTER_CODE)
  const [codePreview, setCodePreview] = usePersistentState<string>(STORAGE_KEYS.preview, STARTER_CODE)
  const [azureConfig, setAzureConfig] = usePersistentState<AzureConfig>(STORAGE_KEYS.azure, DEFAULT_AZURE_CONFIG)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRunAt, setLastRunAt] = useState<number | null>(null)
  const [activePreviewTab, setActivePreviewTab] = useState<'code' | 'preview'>('code')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const isAuthenticated = Boolean(azureConfig.apiKey)

  const handleSendPrompt = async (prompt: string) => {
    if (!isAuthenticated) {
      setError('Bitte logge dich zuerst ein.')
      return
    }
    const userMessage = createMessage('user', prompt)
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    setIsLoading(true)
    setError(null)

    try {
      const aiResponse = await requestAiCode({ config: azureConfig, messages: updatedMessages })
      const assistantMessage = createMessage('assistant', aiResponse)
      setMessages((prev) => [...prev, assistantMessage])

      const extracted = extractRunnableCode(aiResponse)
      if (extracted) {
        setCodeDraft(extracted)
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Etwas ist schiefgelaufen.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => setMessages(DEFAULT_CHAT_START)

  const handleRunCode = () => {
    setCodePreview(codeDraft)
    setLastRunAt(Date.now())
    setActivePreviewTab('preview')
  }

  const resetWorkspaceState = () => {
    setMessages(DEFAULT_CHAT_START)
    setCodeDraft(STARTER_CODE)
    setCodePreview(STARTER_CODE)
    setLastRunAt(null)
    setActivePreviewTab('code')
    setError(null)
  }

  const handleResetWorkspace = () => {
    if (!window.confirm('Sitzung wirklich zurücksetzen? Dein API-Schlüssel bleibt erhalten, alles andere wird gelöscht.')) {
      return
    }
    resetWorkspaceState()
  }
  const heroSubtitle = 'Baue direkt im Browser kleine HTML-, CSS- und JavaScript-Erlebnisse.'

  const handleLogin = async (username: string, password: string) => {
    setAuthLoading(true)
    setAuthError(null)
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setAuthError(payload?.error ?? 'Login fehlgeschlagen.')
        return
      }
      setAzureConfig((prev) => ({ ...prev, apiKey: payload.apiKey }))
      setAuthError(null)
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Login fehlgeschlagen.'
      setAuthError(message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    resetWorkspaceState()
    setAzureConfig(DEFAULT_AZURE_CONFIG)
    setAuthError(null)
    fetch('/api/logout', { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Future-Day-Vibe-Coder</h1>
          <p className="subtitle">{heroSubtitle}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost" onClick={handleResetWorkspace}>
            Arbeitsfläche zurücksetzen
          </button>
          {isAuthenticated && (
            <button type="button" className="ghost" onClick={handleLogout}>
              Abmelden
            </button>
          )}
        </div>
      </header>

      <main className="app-grid">
        <div className="stack">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSend={handleSendPrompt}
            onClear={handleClearChat}
          />
        </div>
        <CodePreview
          draft={codeDraft}
          previewCode={codePreview}
          onDraftChange={setCodeDraft}
          onRun={handleRunCode}
          lastRunAt={lastRunAt}
          activeTab={activePreviewTab}
          onTabChange={setActivePreviewTab}
        />
      </main>
      {!isAuthenticated && (
        <LoginModal isLoading={authLoading} error={authError} onSubmit={handleLogin} />
      )}
    </div>
  )
}

export default App
