import Editor from '@monaco-editor/react'

interface CodePreviewProps {
  draft: string
  previewCode: string
  onDraftChange: (value: string) => void
  onRun: () => void
  lastRunAt: number | null
  activeTab: 'code' | 'preview'
  onTabChange: (tab: 'code' | 'preview') => void
}

export function CodePreview({ draft, previewCode, onDraftChange, onRun, lastRunAt, activeTab, onTabChange }: CodePreviewProps) {
  const renderTimestamp = lastRunAt ? `Zuletzt ausgeführt ${new Date(lastRunAt).toLocaleTimeString()}` : 'Noch nicht ausgeführt'

  return (
    <section className="panel code-panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Live-Vorschau</p>
          
        </div>
        <button type="button" onClick={onRun}>
          Code ausführen
        </button>
      </header>

      <div className="code-panel__tabs">
        <button
          type="button"
          className={`code-panel__tab ${activeTab === 'code' ? 'is-active' : ''}`}
          onClick={() => onTabChange('code')}
        >
          Code
        </button>
        <button
          type="button"
          className={`code-panel__tab ${activeTab === 'preview' ? 'is-active' : ''}`}
          onClick={() => onTabChange('preview')}
        >
          Ergebnis
        </button>
        <span className="code-panel__status">{renderTimestamp}</span>
      </div>

      {activeTab === 'code' ? (
        <div className="code-panel__editor">
          <Editor
            height="100%"
            defaultLanguage="html"
            theme="vs-light"
            value={draft}
            onChange={(value) => onDraftChange(value ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
          <p className="code-panel__hint">Bearbeite hier HTML/CSS/JS. Tippe auf Ausführen, um den Ergebnis-Tab zu aktualisieren.</p>
        </div>
      ) : (
        <div className="code-panel__preview">
          <iframe title="KI-generierte Vorschau" sandbox="allow-scripts allow-same-origin" srcDoc={previewCode} />
        </div>
      )}
    </section>
  )
}
