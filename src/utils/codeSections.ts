export interface CodeSection {
  id: string
  title: string
  hint: string
  language: 'javascript' | 'css' | 'html'
  start: number
  end: number
  code: string
  line: number
}
const markers = /(\/\*\s*@viber-edit\s+(\{[^\n]*\})\s*\*\/|<!--\s*@viber-edit\s+(\{[^\n]*\})\s*-->)([\s\S]*?)(\/\*\s*@viber-end\s*\*\/|<!--\s*@viber-end\s*-->)/g
function section(source: string, start: number, end: number, info: Pick<CodeSection, 'id' | 'title' | 'hint' | 'language'>): CodeSection {
  while (start < end && /\s/.test(source[start])) start++
  while (end > start && /\s/.test(source[end - 1])) end--
  return { ...info, start, end, code: source.slice(start, end), line: source.slice(0, start).split('\n').length }
}
// Find a function's real end while ignoring braces in strings and comments.
function closingBrace(source: string, open: number): number {
  let depth = 0
  let quote = ''
  let comment = ''
  for (let i = open; i < source.length; i++) {
    const char = source[i], next = source[i + 1]
    if (comment === 'line') { if (char === '\n') comment = ''; continue }
    if (comment === 'block') { if (char === '*' && next === '/') { comment = ''; i++ } continue }
    if (quote) { if (char === '\\') i++; else if (char === quote) quote = ''; continue }
    if (char === '/' && next === '/') { comment = 'line'; i++; continue }
    if (char === '/' && next === '*') { comment = 'block'; i++; continue }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue }
    if (char === '{') depth++
    if (char === '}' && --depth === 0) return i + 1
  }
  return -1
}
const hints: Record<string, [string, string]> = {
  shoot: ['Laser abfeuern', 'Hier entscheidet dein Spiel, wann und wie ein Laser entsteht.'],
  fire: ['Feuer frei!', 'Verändere die Regeln für einen Schuss.'],
  jump: ['Springen', 'Hier kannst du ausprobieren, wie dein Sprung funktioniert.'],
  spawn: ['Neue Objekte', 'Hier entstehen neue Objekte im Spiel.'],
  restart: ['Neustart', 'Diese Funktion setzt dein Spiel zurück.'],
  start: ['Spiel starten', 'Dieser Code startet eine neue Runde.'],
}
export function readCodeSections(source: string): CodeSection[] {
  const marked: CodeSection[] = []
  for (const match of source.matchAll(markers)) {
    try {
      const info = JSON.parse(match[2] || match[3])
      if (typeof info.id !== 'string' || typeof info.title !== 'string' || !['javascript', 'css', 'html'].includes(info.language)) continue
      if (marked.some((item) => item.id === info.id)) continue
      const start = match.index! + match[1].length
      marked.push(section(source, start, start + match[4].length, { id: info.id, title: info.title, hint: typeof info.hint === 'string' ? info.hint : 'Ändere eine Zeile und beobachte, was passiert.', language: info.language }))
    } catch { /* Ignore malformed annotations; never execute metadata. */ }
  }
  if (marked.length) return marked.slice(0, 12)
  const found: CodeSection[] = []
  for (const style of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    const root = /:root\s*\{[^}]+\}/.exec(style[1])
    if (root) {
      const start = style.index! + style[0].indexOf(style[1]) + root.index
      found.push(section(source, start, start + root[0].length, { id: 'css-colors', title: 'Farben & Aussehen', hint: 'Das ist echtes CSS. Ein Farbcode wie #ff5d8f bestimmt eine Farbe. Behalte die Semikolons und Klammern bei.', language: 'css' }))
      break
    }
  }
  for (const script of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    if (/type\s*=\s*["']application\/json/i.test(script[0].slice(0, script[0].indexOf('>')))) continue
    const base = script.index! + script[0].indexOf(script[1])
    for (const match of script[1].matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g)) {
      const start = base + match.index!
      const end = closingBrace(source, start + match[0].lastIndexOf('{'))
      if (end < 0 || source.slice(start, end).split('\n').length > 32) continue
      const name = match[1]
      const entry = Object.entries(hints).find(([word]) => name.toLowerCase().includes(word))
      if (!entry) continue
      found.push(section(source, start, end, { id: `function-${name}`, title: entry[1][0], hint: entry[1][1] + ' Klammern und Satzzeichen gehören zum Code dazu.', language: 'javascript' }))
      if (found.length >= 7) return found
    }
  }
  return found
}
export function replaceCodeSection(source: string, original: CodeSection, edited: string): string | null {
  if (source.slice(original.start, original.end) !== original.code) return null
  return source.slice(0, original.start) + edited + source.slice(original.end)
}
