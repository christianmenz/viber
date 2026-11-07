import { useState } from 'react'
import './App.css'
import { Brand } from './components/Brand'
import { PixelIcon } from './components/PixelIcon'
import { ChatPanel } from './components/ChatPanel'
import { CodePreview } from './components/CodePreview'
import { DEFAULT_AZURE_CONFIG, DEFAULT_CHAT_START, STARTER_CODE, STORAGE_KEYS } from './config'
import { usePersistentState } from './hooks/usePersistentState'
import { requestAiCode, extractRunnableCode } from './services/azureClient'
import { buildRequestMessages } from './utils/chatContext'
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
  const [activePreviewTab, setActivePreviewTab] = useState<'code' | 'preview' | 'simple'>('preview')
  const [isExpanded, setIsExpanded] = useState(false)
  const [previousCode, setPreviousCode] = useState<string | null>(null)
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

    const requestMessages = buildRequestMessages({ messages: updatedMessages, codeDraft, newPrompt: prompt })

    try {
      const aiResponse = await requestAiCode({ messages: requestMessages })
      const assistantMessage = createMessage('assistant', aiResponse)
      setMessages((prev) => [...prev, assistantMessage])

      const extracted = extractRunnableCode(aiResponse)
      if (extracted) {
        setPreviousCode(codeDraft)
        setCodeDraft(extracted)
        setCodePreview(extracted)
        setLastRunAt(Date.now())
        setActivePreviewTab((tab) => tab === 'simple' ? 'simple' : 'preview')
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
    setActivePreviewTab((tab) => tab === 'simple' ? 'simple' : 'preview')
  }

  const resetWorkspaceState = () => {
    setMessages(DEFAULT_CHAT_START)
    setCodeDraft(STARTER_CODE)
    setCodePreview(STARTER_CODE)
    setLastRunAt(null)
    setActivePreviewTab('preview')
    setPreviousCode(null)
    setError(null)
  }

  const handleResetWorkspace = () => {
    if (!window.confirm('Arbeitsfläche wirklich zurücksetzen? Dein Spiel und Chat werden gelöscht. Du bleibst angemeldet.')) {
      return
    }
    resetWorkspaceState()
  }


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
      setAzureConfig((prev) => ({ ...prev, apiKey: 'authorized' }))
      setAuthError(null)
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Login fehlgeschlagen.'
      setAuthError(message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setAzureConfig(DEFAULT_AZURE_CONFIG)
    setAuthError(null)
    fetch('/api/logout', { method: 'POST' }).catch(() => {})
  }

  const handleDownload = () => {
    const blob = new Blob([codeDraft], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'viber-playground.html'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`app-shell ${isExpanded ? 'is-expanded' : ''}`}>
      <header className="app-header">
        <Brand />
        <div className="header-actions">
          <button type="button" className="ghost" disabled={isLoading} onClick={handleResetWorkspace}>
            Arbeitsfläche zurücksetzen
          </button>
          <button type="button" className="ghost" onClick={handleDownload}>
            <PixelIcon name="heart" /> Spiel speichern
          </button>
          {isAuthenticated && (
            <button type="button" className="ghost" disabled={isLoading} onClick={handleLogout}>
              Abmelden
            </button>
          )}
        </div>
      </header>

      <div className="workshop-banner"><span><i /> DEINE SPIELEWERKSTATT</span><p>Erfinden. Bauen. Spielen. Repeat!</p><span className="banner-sparkles" aria-hidden="true">✦ + ✦</span></div>
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
          isLoading={isLoading}
          onApplySimpleCode={(nextCode) => {
            setPreviousCode(codeDraft)
            setCodeDraft(nextCode)
            setCodePreview(nextCode)
            setLastRunAt(Date.now())
            setActivePreviewTab('simple')
          }}
          onEnableSettings={() => handleSendPrompt('Markiere in meinem Spiel kurze, echte Code-Stellen zum Selberprogrammieren: etwa Schießen, Bewegung, Punkte oder Aussehen. Erkläre jede Stelle kurz und kindgerecht. Behalte das Spiel und seine Regeln bei.')}
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded((value) => !value)}
          draft={codeDraft}
          previewCode={codePreview}
          onDraftChange={setCodeDraft}
          canUndo={previousCode !== null && !isLoading}
          onUndo={() => {
            if (previousCode === null) return
            setCodeDraft(previousCode)
            setCodePreview(previousCode)
            setPreviousCode(null)
            setLastRunAt(Date.now())
            setActivePreviewTab('preview')
          }}
          onRun={handleRunCode}
          lastRunAt={lastRunAt}
          activeTab={activePreviewTab}
          onTabChange={setActivePreviewTab}
        />
      </main>
      <footer className="app-footer"><span>MADE OF PIXELS & DEINEN IDEEN</span><span><PixelIcon name="star" /> Hier bist du der Game Creator.</span></footer>
      {!isAuthenticated && (
        <LoginModal isLoading={authLoading} error={authError} onSubmit={handleLogin} />
      )}
    </div>
  )
}

export default App
