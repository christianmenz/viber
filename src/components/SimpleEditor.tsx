import { lazy, Suspense, useMemo, useState } from 'react'
import { readCodeSections, replaceCodeSection } from '../utils/codeSections'
import type { CodeSection } from '../utils/codeSections'
import { PixelIcon } from './PixelIcon'
const SnippetEditor = lazy(() => import('./CodeEditor'))

function Snippet({ source, section, onApply, isLoading }: { source: string; section: CodeSection; onApply: (code: string) => void; isLoading: boolean }) {
  const [buffer, setBuffer] = useState(section.code)
  const [error, setError] = useState('')
  const changed = buffer !== section.code
  return <>
    <p className="snippet-hint">{section.hint}</p>
    <div className="snippet-file"><span>{section.language === 'css' ? 'style.css' : section.language === 'html' ? 'game.html' : 'game.js'}</span><span>Zeile {section.line}</span></div>
    <div className="snippet-monaco"><Suspense fallback={<p className="editor-loading">Code lädt …</p>}><SnippetEditor value={buffer} onChange={setBuffer} fontSize={18} language={section.language} path={`simple-${section.id}.${section.language === 'css' ? 'css' : section.language === 'html' ? 'html' : 'js'}`} ariaLabel={`Code: ${section.title}`} readOnly={isLoading} startLine={section.line} /></Suspense></div>
    {error && <p className="snippet-error" role="alert">{error}</p>}
    <div className="snippet-actions"><button type="button" disabled={!changed || isLoading} onClick={() => {
      const next = replaceCodeSection(source, section, buffer)
      if (next === null) { setError('Der Spielcode hat sich geändert. Wähle den Ausschnitt bitte neu.'); return }
      setError(''); onApply(next)
    }}>▶ Code spielen</button><button type="button" className="ghost" disabled={!changed || isLoading} onClick={() => { setBuffer(section.code); setError('') }}>Verwerfen</button></div>
    <p className="snippet-note">Das ist ein Ausschnitt aus deinem echten Spielcode. „Code spielen“ übernimmt ihn und startet die Vorschau neu.</p>
  </>
}
export function SimpleEditor({ code, onApply, onEnable, isLoading }: { code: string; onApply: (code: string) => void; onEnable: () => void; isLoading: boolean }) {
  const sections = useMemo(() => readCodeSections(code), [code])
  const [selectedId, setSelectedId] = useState('')
  const selected = sections.find((item) => item.id === selectedId) || sections[0]
  return <aside className="simple-controls simple-code" aria-label="Simple Code">
    <p className="eyebrow"><PixelIcon name="code" /> SIMPLE CODE</p>
    <h3>Kleine Zeilen. Große Wirkung.</h3>
    {selected ? <>
      <label className="snippet-select-label" htmlFor="code-section">Was willst du verändern?</label>
      <select id="code-section" value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>{sections.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <Snippet key={`${selected.id}:${selected.code}`} source={code} section={selected} onApply={onApply} isLoading={isLoading} />
    </> : <><p className="simple-empty">Dein Buddy kann kurze, spannende Code-Stellen zum Experimentieren markieren.</p><button type="button" className="ghost" disabled={isLoading} onClick={onEnable}>{isLoading ? 'Code-Stellen entstehen …' : 'Code-Stellen entdecken'}</button></>}
  </aside>
}
