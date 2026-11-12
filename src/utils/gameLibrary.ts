import { DEFAULT_CHAT_START, STARTER_CODE, STORAGE_KEYS } from '../config'
import type { SavedGame } from '../types'

export function readGames(): SavedGame[] {
  const raw = localStorage.getItem(STORAGE_KEYS.games)
  if (raw === null) return []
  const games: unknown = JSON.parse(raw)
  if (!Array.isArray(games)) throw new Error('Ungültige Spielebibliothek')
  return games
}

export function hasWorkspaceChanges(workspace: Pick<SavedGame, 'draft' | 'preview' | 'messages'>, saved?: SavedGame) {
  return workspace.draft !== (saved?.draft ?? STARTER_CODE)
    || workspace.preview !== (saved?.preview ?? STARTER_CODE)
    || JSON.stringify(workspace.messages) !== JSON.stringify(saved?.messages ?? DEFAULT_CHAT_START)
}
