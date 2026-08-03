// HumanAI - 設定管理コンテキスト
// APIキーはlocalStorageに暗号化して保存（Firestoreには保存しない＝流出リスク低減）
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getSettings, saveSettings as saveSettingsFs } from '../lib/memory'
import { encryptApiKey, decryptApiKey } from '../lib/crypto'

const SettingsContext = createContext(null)
const LOCAL_KEY_PREFIX = 'humanai_apikey_'

const DEFAULTS = {
  memoryEnabled: true,
  darkMode: false,
  defaultModel: '3.5-flash-lite',
  temperature: 0.9,
  maxOutputTokens: 2048,
  systemPrompt: '',
  notificationsEnabled: false,
  fontSize: 'medium', // small | medium | large
  ttsEnabled: true,
  quickRepliesEnabled: true,
}

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULTS)
  const [apiKey, setApiKeyState] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) {
      setLoaded(true)
      return
    }
    (async () => {
      const remote = await getSettings(user.uid)
      setSettings({ ...DEFAULTS, ...remote })

      const stored = localStorage.getItem(LOCAL_KEY_PREFIX + user.uid)
      if (stored) {
        setApiKeyState(decryptApiKey(stored, user.uid))
      }
      setLoaded(true)
    })()
  }, [user])

  useEffect(() => {
    const root = document.documentElement
    if (settings.darkMode) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [settings.darkMode])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('text-size-small', 'text-size-medium', 'text-size-large')
    root.classList.add(`text-size-${settings.fontSize || 'medium'}`)
  }, [settings.fontSize])

  const updateSettings = useCallback(async (partial) => {
    setSettings(prev => ({ ...prev, ...partial }))
    if (user) await saveSettingsFs(user.uid, partial)
  }, [user])

  const setApiKey = useCallback((key) => {
    setApiKeyState(key)
    if (user) {
      const encrypted = encryptApiKey(key, user.uid)
      localStorage.setItem(LOCAL_KEY_PREFIX + user.uid, encrypted)
    }
  }, [user])

  const clearApiKey = useCallback(() => {
    setApiKeyState('')
    if (user) localStorage.removeItem(LOCAL_KEY_PREFIX + user.uid)
  }, [user])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, apiKey, setApiKey, clearApiKey, loaded }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettingsはSettingsProviderの内部で使用してください')
  return ctx
}
