import { lazy, Suspense, useMemo } from 'react'
import { SimpleEditor } from './SimpleEditor'
import { previewDocument } from '../utils/previewDocument'
import { PixelIcon } from './PixelIcon'
import { STARTER_CODE } from '../config'
import { usePersistentState } from '../hooks/usePersistentState'
const CodeEditor = lazy(() => import('./CodeEditor'))

interface CodePreviewProps {
  isLoading: boolean
  onEnableSettings: () => void
  onApplySimpleCode: (code: string) => void
  draft: string
  previewCode: string
  onDraftChange: (value: string) => void
  onRun: () => void
  lastRunAt: number | null
  activeTab: 'code' | 'preview' | 'simple'
  onTabChange: (tab: 'code' | 'preview' | 'simple') => void
  canUndo: boolean
  onUndo: () => void
  isExpanded: boolean
  onToggleExpand: () => void
}

export function CodePreview({ draft, previewCode, onDraftChange, onRun, lastRunAt, activeTab, onTabChange, canUndo, onUndo, isExpanded, onToggleExpand, isLoading, onEnableSettings, onApplySimpleCode }: CodePreviewProps) {
  const [fontSize, setFontSize] = usePersistentState('viber:editor-font-size', 20)
  const safeFontSize = typeof fontSize === 'number' && Number.isFinite(fontSize) ? Math.min(32, Math.max(14, fontSize)) : 20
  const fittedPreview = useMemo(() => previewDocument(previewCode), [previewCode])
  return (
    <section className="panel code-panel">
      <header className="panel__header">
        <div><p className="eyebrow"><PixelIcon name="game" /> DEINE SPIELHALLE</p><h2>Hier wird’s spielbar.</h2></div>
        <div className="preview-actions">
          {canUndo && <button type="button" className="ghost" onClick={onUndo} title="Letzte Änderung zurücknehmen">↶ Zurück</button>}
          <button type="button" className="ghost expand-button" aria-pressed={isExpanded} onClick={onToggleExpand}><PixelIcon name="expand" />{isExpanded ? 'Werkstatt zeigen' : 'Groß spielen'}</button>
          <button type="button" className="play-button" onClick={onRun}>▶ {activeTab === 'code' ? 'Code starten' : activeTab === 'simple' ? 'Änderungen spielen' : 'Neustart'}</button>
        </div>
      </header>
      <div className="code-panel__tabs" role="tablist" aria-label="Spielansicht">
        <button id="play-tab" role="tab" aria-selected={activeTab === 'preview'} aria-controls="play-panel" type="button" className={`code-panel__tab ${activeTab === 'preview' ? 'is-active' : ''}`} onClick={() => onTabChange('preview')}><PixelIcon name="game" /> Spielen</button>
        <button id="simple-tab" role="tab" aria-selected={activeTab === 'simple'} aria-controls="play-panel" type="button" className={`code-panel__tab ${activeTab === 'simple' ? 'is-active' : ''}`} onClick={() => onTabChange('simple')}><PixelIcon name="star" /> Simple Code</button>
        <button id="code-tab" role="tab" aria-selected={activeTab === 'code'} aria-controls="code-panel" type="button" className={`code-panel__tab ${activeTab === 'code' ? 'is-active' : ''}`} onClick={() => onTabChange('code')}><PixelIcon name="code" /> Profi-Code</button>
        <span className="code-panel__status"><i />{lastRunAt || previewCode !== STARTER_CODE ? 'SPIEL BEREIT' : 'DEINE BÜHNE'}</span>
      </div>
      {activeTab === 'code' ? (
        <div id="code-panel" role="tabpanel" aria-labelledby="code-tab" className="code-panel__editor">
          <div className="editor-toolbar"><span><span className="file-dot" /> game.html</span><div className="font-controls"><span>Schriftgröße</span><button type="button" className="ghost" aria-label="Schrift verkleinern" disabled={safeFontSize <= 14} onClick={() => setFontSize(safeFontSize - 2)}>A−</button><output aria-live="polite">{safeFontSize} px</output><button type="button" className="ghost" aria-label="Schrift vergrößern" disabled={safeFontSize >= 32} onClick={() => setFontSize(safeFontSize + 2)}>A+</button></div></div>
          <div className="monaco-shell"><Suspense fallback={<div className="editor-loading">Dein Code-Editor startet …</div>}><CodeEditor value={draft} onChange={onDraftChange} fontSize={safeFontSize} /></Suspense></div>
          <p className="code-panel__hint">Ein bisschen tüfteln? Ändere den Code und drücke „Code starten“.</p>
        </div>
      ) : (
        <div className={`play-workspace ${activeTab === 'simple' ? 'play-workspace--simple' : ''}`}>
          {activeTab === 'simple' && <SimpleEditor code={draft} onApply={onApplySimpleCode} onEnable={onEnableSettings} isLoading={isLoading} />}
        <div id="play-panel" role="tabpanel" aria-labelledby={activeTab === 'simple' ? 'simple-tab' : 'play-tab'} className="code-panel__preview">
          <div className="monitor-screen">
            <iframe key={lastRunAt ?? 'start'} title="Dein Spiel" sandbox="allow-scripts" srcDoc={fittedPreview} />
            <div className="monitor-glass" aria-hidden="true" />
          </div>
          <div className="monitor-chin" aria-hidden="true"><span>VIBER <b>COLOR DISPLAY</b></span><div className="monitor-hardware"><i className="monitor-vents" /><i className="monitor-led" /><i className="monitor-power" /></div></div>
        </div>
        </div>
      )}
      <p className="code-panel__hint storage-hint"><PixelIcon name="heart" /> Dein Spiel bleibt in diesem Browser. Mit „Spiel speichern“ nimmst du es mit.</p>
    </section>
  )
}
