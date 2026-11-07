import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/language/html/monaco.contribution'
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution'
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/language/css/monaco.contribution'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  },
}

monaco.editor.defineTheme('viber-night', {
  base: 'vs-dark', inherit: true,
  rules: [
    { token: 'tag', foreground: 'FF9B9B' },
    { token: 'attribute.name', foreground: 'CFB8FF' },
    { token: 'attribute.value', foreground: 'A5F2CB' },
    { token: 'comment', foreground: '8D93AF' },
  ],
  colors: {
    'editor.background': '#1C1C35',
    'editor.foreground': '#FFF8E8',
    'editorLineNumber.foreground': '#77718F',
    'editorLineNumber.activeForeground': '#FFD66E',
    'editor.lineHighlightBackground': '#292642',
    'editor.selectionBackground': '#65519766',
    'editorCursor.foreground': '#9AF3C4',
    'editorIndentGuide.background1': '#35304F',
  },
})
loader.config({ monaco })
