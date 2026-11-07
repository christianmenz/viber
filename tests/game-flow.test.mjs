import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import ts from 'typescript'

async function loadTs(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}

const { buildRequestMessages } = await loadTs('../src/utils/chatContext.ts')
const { extractRunnableCode } = await loadTs('../src/services/azureClient.ts')

test('follow-ups preserve conversation and the edited game without duplicating the new request', () => {
  const messages = [
    { role: 'system', content: 'old saved prompt' },
    { role: 'user', content: 'Build a frog game' },
    { role: 'assistant', content: 'Frog ready!\n```html\n<html>old game</html>\n```' },
    { role: 'user', content: 'Add stars' },
  ]
  const result = buildRequestMessages({ messages, codeDraft: '<html>manually edited frog</html>', newPrompt: 'Add stars' })
  assert.equal(result.length, 3)
  assert.equal(result[0].content, 'Build a frog game')
  assert.match(result[1].content, /Frog ready!/)
  assert.doesNotMatch(result[1].content, /old game/)
  assert.match(result[2].content, /manually edited frog/)
  assert.equal(JSON.stringify(result).split('Add stars').length - 1, 1)
  assert.ok(result.every((message) => message.role !== 'system'))
})

test('conversation stays bounded while the complete latest game is retained', () => {
  const messages = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `turn ${i}` }))
  const result = buildRequestMessages({ messages, codeDraft: '<html>latest game</html>', newPrompt: 'Make it easier' })
  assert.equal(result.length, 9)
  assert.match(result.at(-1).content, /latest game/)
})

test('game extraction handles code with a short kid-friendly explanation and plain answers', () => {
  assert.equal(extractRunnableCode('Los geht’s!\n```html\n<!DOCTYPE html><html>game</html>\n```\nSammle Sterne!'), '<!DOCTYPE html><html>game</html>')
  assert.equal(extractRunnableCode('Use the arrows to move.'), null)
})

test('backend uses the selected deployment and current prompt despite stale browser overrides', async () => {
  const reservation = createServer()
  reservation.listen(0, '127.0.0.1')
  await once(reservation, 'listening')
  const port = reservation.address().port
  await new Promise((resolve) => reservation.close(resolve))
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    globalThis.fetch = async (url, options) => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ url, payload: JSON.parse(options.body) }) } }] }),
    });
    await import('./server/index.js');
  `], { cwd: new URL('..', import.meta.url), env: {
    ...process.env, PORT: String(port), AZURE_OPENAI_API_KEY: 'test-only-placeholder',
    AZURE_OPENAI_ENDPOINT: 'https://eastus2.api.cognitive.microsoft.com/',
    AZURE_OPENAI_DEPLOYMENT: 'fibu3-gpt5.6-terra-prod', AZURE_OPENAI_API_VERSION: '2024-12-01-preview',
  }, stdio: ['ignore', 'pipe', 'pipe'] })
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Test server did not start')), 10000)
      child.stdout.on('data', (chunk) => {
        if (chunk.toString().includes('App läuft')) { clearTimeout(timer); resolve() }
      })
      child.once('error', reject)
    })
    const response = await fetch(`http://127.0.0.1:${port}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: 'stale instructions' }, { role: 'user', content: 'Build memory' }], config: { endpoint: 'https://wrong.invalid/', deployment: 'old-model' } }),
    })
    assert.equal(response.status, 200)
    const captured = JSON.parse((await response.json()).content)
    assert.equal(captured.url, 'https://eastus2.api.cognitive.microsoft.com/openai/deployments/fibu3-gpt5.6-terra-prod/chat/completions?api-version=2024-12-01-preview')
    assert.equal(captured.payload.messages[0].role, 'system')
    assert.match(captured.payload.messages[0].content, /Spiele-Buddy/)
    assert.equal(captured.payload.messages[1].content, 'Build memory')
    assert.equal(captured.payload.messages.length, 2)
  } finally { child.kill(); await once(child, 'exit') }
})

const { readCodeSections, replaceCodeSection } = await loadTs('../src/utils/codeSections.ts')
test('AI-selected sections contain the real editable gameplay function and original line numbers', () => {
  const code = '<script>\n/* @viber-edit {"id":"shoot","title":"Laser","hint":"Mehr Tempo!","language":"javascript"} */\nfunction shoot() {\n  lasers.push({ speed: 8 });\n}\n/* @viber-end */\nconst keep = 42;\n</script>'
  const [part] = readCodeSections(code)
  assert.equal(part.line, 3)
  assert.equal(part.language, 'javascript')
  assert.equal(part.code, 'function shoot() {\n  lasers.push({ speed: 8 });\n}')
  const edited = replaceCodeSection(code, part, part.code.replace('speed: 8', 'speed: 12'))
  assert.ok(edited.includes('speed: 12'))
  assert.ok(edited.includes('const keep = 42;'))
  assert.ok(edited.includes('/* @viber-end */'))
})
test('code edits reject a stale source range instead of replacing unrelated code', () => {
  const code = '<style>:root { --color: #abc; }</style>'
  const [part] = readCodeSections(code)
  assert.equal(replaceCodeSection('prefix' + code, part, ':root {}'), null)
})
test('older games expose functions with nested blocks and braces in strings intact', () => {
  const code = '<script>function shoot() {\n const label = "}";\n if (ready) { lasers.push({ speed: 8 }); }\n}\nconst untouched = 5;</script>'
  const [part] = readCodeSections(code)
  assert.equal(part.title, 'Laser abfeuern')
  assert.ok(part.code.endsWith('\n}'))
  assert.ok(!part.code.includes('untouched'))
})
test('HTML sections edit the actual document and malformed metadata is ignored', () => {
  const code = '<!-- @viber-edit {"id":"heading","title":"Titel","language":"html"} --><h1>Hello</h1><!-- @viber-end -->'
  const [part] = readCodeSections(code)
  assert.equal(part.code, '<h1>Hello</h1>')
  assert.ok(replaceCodeSection(code, part, '<h1>Hi!</h1>').includes('<h1>Hi!</h1>'))
  assert.deepEqual(readCodeSections('/* @viber-edit {bad} */x/* @viber-end */'), [])
})
