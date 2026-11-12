import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { STORAGE_KEYS } from '../config'
import type { SavedGame } from '../types'
import { hasWorkspaceChanges, readGames } from '../utils/gameLibrary'

type Workspace = Pick<SavedGame, 'draft' | 'preview' | 'messages'>

interface GameLibraryProps {
  mode: 'save' | 'library' | 'new' | 'save-new'
  activeGameId: string | null
  workspace: Workspace
  onSave: (id: string) => void
  onLoad: (game: SavedGame) => void
  onNew: () => void
  onSaveBeforeNew: () => void
  onClose: () => void
}

function downloadGame(game: SavedGame) {
  const filename = game.name.replace(/[<>:"/\\|?*]/g, '-').replace(/[. ]+$/, '') || 'viber-spiel'
  const url = URL.createObjectURL(new Blob([game.draft], { type: 'text/html' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename + '.html'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function GameLibrary({ mode, activeGameId, workspace, onSave, onLoad, onNew, onSaveBeforeNew, onClose }: GameLibraryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [initial] = useState(() => {
    try {
      return { games: readGames(), error: null }
    } catch {
      return { games: [], error: 'Die Spielebibliothek konnte nicht gelesen werden.' }
    }
  })
  const [games, setGames] = useState(initial.games)
  const [name, setName] = useState(() => games.find((game) => game.id === activeGameId)?.name ?? '')
  const [error, setError] = useState<string | null>(initial.error)
  const [saved, setSaved] = useState(false)
  const activeGame = games.find((game) => game.id === activeGameId)
  const isSaving = mode === 'save' || mode === 'save-new'

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  function saveGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    try {
      const latestGames = readGames()
      const game: SavedGame = {
        ...workspace,
        id: activeGameId ?? crypto.randomUUID(),
        name: trimmedName,
        updatedAt: Date.now(),
      }
      const nextGames = [game, ...latestGames.filter((entry) => entry.id !== game.id)]
      localStorage.setItem(STORAGE_KEYS.games, JSON.stringify(nextGames))
      setGames(nextGames)
      setError(null)
      setSaved(true)
      if (mode === 'save-new') onNew()
      else onSave(game.id)
    } catch {
      setError('Das Spiel konnte nicht gespeichert werden. Prüfe, ob dein Browser Speicherplatz für Viber hat.')
    }
  }

  function loadGame(game: SavedGame) {
    if (hasWorkspaceChanges(workspace, activeGame) && !window.confirm('Dieses Spiel laden? Ungespeicherte Änderungen an deiner Arbeitsfläche gehen verloren.')) return
    onLoad(game)
  }

  return (
    <dialog
      ref={dialogRef}
      className="game-dialog"
      aria-labelledby="game-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="game-dialog__header">
        <h2 id="game-dialog-title">{isSaving ? 'Spiel speichern' : mode === 'new' ? 'Neues Spiel' : 'Spielebibliothek'}</h2>
        <button type="button" className="ghost" onClick={onClose}>{mode === 'new' || mode === 'save-new' ? 'Abbrechen' : 'Schließen'}</button>
      </div>
      {error && <p className="error-banner" role="alert">{error}</p>}
      {mode === 'new' ? (
        <>
          <p>Dein aktuelles Spiel hat ungespeicherte Änderungen. Möchtest du es speichern, bevor du ein neues startest?</p>
          <div className="game-library__actions">
            <button type="button" onClick={onSaveBeforeNew}>Spiel speichern</button>
            <button type="button" className="ghost" onClick={onNew}>Ohne Speichern starten</button>
          </div>
        </>
      ) : isSaving ? (
        <form onSubmit={saveGame}>
          <label>
            Spielname
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
          </label>
          <p>Spiel und Chat werden in diesem Browser gespeichert.</p>
          <button type="submit" disabled={!name.trim()}>{mode === 'save-new' ? 'Speichern und neues Spiel starten' : activeGame ? 'Änderungen speichern' : 'Speichern'}</button>
        </form>
      ) : (
        <>
          {saved && <p role="status">Spiel gespeichert.</p>}
          {games.length > 0 ? (
            <ul className="game-library">
              {games.map((game) => (
                <li key={game.id}>
                  <div>
                    <strong>{game.name}</strong>
                    <small>{new Date(game.updatedAt).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' })}</small>
                  </div>
                  <div className="game-library__actions">
                    <button type="button" onClick={() => loadGame(game)} aria-label={game.name + ' laden'}>Laden</button>
                    <button type="button" className="ghost" onClick={() => downloadGame(game)} aria-label={game.name + ' herunterladen'}>HTML herunterladen</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : !error && <p>Du hast in diesem Browser noch keine Spiele gespeichert.</p>}
        </>
      )}
    </dialog>
  )
}
