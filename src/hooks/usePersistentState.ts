import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

const isBrowser = () => typeof window !== 'undefined'

function safelyParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.warn('Could not parse stored value', error)
    return fallback
  }
}

export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const hasHydrated = useRef(false)
  const [state, setState] = useState<T>(() => {
    if (!isBrowser()) return defaultValue
    return safelyParse<T>(window.localStorage.getItem(key), defaultValue)
  })

  useEffect(() => {
    if (!isBrowser()) return
    if (hasHydrated.current) return
    const stored = safelyParse<T>(window.localStorage.getItem(key), defaultValue)
    setState(stored)
    hasHydrated.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isBrowser()) return
    window.localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])

  return [state, setState]
}
