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
import { hasWorkspaceChanges, readGames } from './utils/gameLibrary'
import type { AzureConfig, ChatMessage, SavedGame } from './types'
import { LoginModal } from './components/LoginModal'
import { GameLibrary } from './components/GameLibrary'

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
  const [activeGameId, setActiveGameId] = usePersistentState<string | null>(STORAGE_KEYS.activeGame, null)
  const [gameDialog, setGameDialog] = useState<'save' | 'library' | 'new' | 'save-new' | null>(null)
  const [workspaceVersion, setWorkspaceVersion] = useState(0)
  const isAuthenticated = Boolean(azureConfig.apiKey)
  const workspace = { draft: codeDraft, preview: codePreview, messages }

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

  const startNewGame = () => {
    setMessages(DEFAULT_CHAT_START)
    setCodeDraft(STARTER_CODE)
    setCodePreview(STARTER_CODE)
    setLastRunAt(null)
    setActivePreviewTab('preview')
    setPreviousCode(null)
    setError(null)
    setActiveGameId(null)
    setWorkspaceVersion((version) => version + 1)
    setGameDialog(null)
  }

  const handleNewGame = () => {
    try {
      const saved = readGames().find((game) => game.id === activeGameId)
      if (!hasWorkspaceChanges(workspace, saved)) {
        startNewGame()
        return
      }
    } catch {
      // Keep the current workspace available when the library cannot be read.
    }
    setGameDialog('new')
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

  const handleLoadGame = (game: SavedGame) => {
    setActiveGameId(game.id)
    setMessages(game.messages)
    setCodeDraft(game.draft)
    setCodePreview(game.preview)
    setPreviousCode(null)
    setError(null)
    setLastRunAt(null)
    setActivePreviewTab('preview')
    setWorkspaceVersion((version) => version + 1)
    setGameDialog(null)
  }

  return (
    <div className={`app-shell ${isExpanded ? 'is-expanded' : ''}`}>
      <header className="app-header">
        <Brand />
        <div className="header-actions">
          <button type="button" className="ghost" disabled={isLoading} onClick={handleNewGame}>
            Neues Spiel
          </button>
          <button type="button" className="ghost" disabled={isLoading} onClick={() => setGameDialog('save')}>
            <PixelIcon name="heart" /> Spiel speichern
          </button>
          <button type="button" className="ghost" disabled={isLoading} onClick={() => setGameDialog('library')}>
            Spielebibliothek
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
            key={workspaceVersion}
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSend={handleSendPrompt}
            onClear={handleClearChat}
          />
        </div>
        <CodePreview
          key={workspaceVersion}
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
      {gameDialog && (
        <GameLibrary
          key={gameDialog === 'save-new' ? 'save-new' : 'library-dialog'}
          mode={gameDialog}
          activeGameId={activeGameId}
          workspace={workspace}
          onSave={(id) => {
            setActiveGameId(id)
            setGameDialog('library')
          }}
          onLoad={handleLoadGame}
          onNew={startNewGame}
          onSaveBeforeNew={() => setGameDialog('save-new')}
          onClose={() => setGameDialog(null)}
        />
      )}
      {!isAuthenticated && (
        <LoginModal isLoading={authLoading} error={authError} onSubmit={handleLogin} />
      )}
    </div>
  )
}

export default App
