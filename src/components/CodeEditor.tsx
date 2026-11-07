import Editor from '@monaco-editor/react'
import '../editor/monaco'

export default function CodeEditor({ value, onChange, fontSize, language = 'html', path = 'game.html', ariaLabel = 'HTML-Spielcode', readOnly = false, startLine = 1 }: { value: string; onChange: (value: string) => void; fontSize: number; language?: string; path?: string; ariaLabel?: string; readOnly?: boolean; startLine?: number }) {
  return <Editor height="100%" language={language} path={path} theme="viber-night" value={value} onChange={(next) => onChange(next ?? '')}
    loading={<div className="editor-loading">Dein Code-Editor startet …</div>}
    options={{
      fontSize, lineHeight: Math.round(fontSize * 1.6), minimap: { enabled: false },
      wordWrap: 'on', scrollBeyondLastLine: false, automaticLayout: true,
      tabSize: 2, padding: { top: 20, bottom: 20 }, fontFamily: 'Consolas, "SFMono-Regular", monospace',
      lineNumbersMinChars: 3, folding: true, renderLineHighlight: 'line',
      accessibilitySupport: 'auto', ariaLabel, readOnly, lineNumbers: (line) => String(startLine + line - 1),
      bracketPairColorization: { enabled: true }, stickyScroll: { enabled: false },
    }} />
}
