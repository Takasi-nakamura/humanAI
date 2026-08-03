import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Moon, Sun, Bell, Download, Upload, LogOut, Trash2, Type, Volume2, MessageCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useSettings } from '../hooks/useSettings.jsx'
import { useNotifications } from '../hooks/useNotifications.jsx'
import { MODEL_MAP } from '../lib/gemini'
import { validateApiKey, validateTemperature, validateMaxTokens } from '../lib/validation'
import { exportAllData, importAllData } from '../lib/dataTools'
import { listSessions, deleteSession } from '../lib/memory'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { settings, updateSettings, apiKey, setApiKey, clearApiKey } = useSettings()
  const notif = useNotifications(user?.uid)

  const [keyInput, setKeyInput] = useState(apiKey || '')
  const [showKey, setShowKey] = useState(false)
  const [keyMsg, setKeyMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const saveApiKey = () => {
    const v = validateApiKey(keyInput)
    if (!v.valid) { setKeyMsg(v.message); return }
    setApiKey(keyInput.trim())
    setKeyMsg('APIキーを保存しました。')
    setTimeout(() => setKeyMsg(''), 2000)
  }

  const handleExport = async () => {
    if (!user) return
    setBusy(true)
    try { await exportAllData(user.uid) } finally { setBusy(false) }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setBusy(true)
    try {
      const res = await importAllData(user.uid, file)
      alert(`${res.importedSessions}件の会話をインポートしました。`)
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const handleDeleteAllChats = async () => {
    if (!user) return
    if (!confirm('すべてのチャット履歴を削除します。よろしいですか？この操作は取り消せません。')) return
    setBusy(true)
    try {
      const sessions = await listSessions(user.uid)
      for (const s of sessions) await deleteSession(user.uid, s.id)
      alert('すべてのチャット履歴を削除しました。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-soft dark:bg-surface-dark safe-top safe-bottom">
      <header className="flex items-center gap-3 px-4 py-4 bg-white dark:bg-surface-darksoft border-b border-surface-border dark:border-surface-darkborder sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold text-lg">設定</h1>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
        {/* APIキー設定 */}
        <Section title="APIキー設定">
          <p className="text-xs text-gray-400 mb-2">
            Google AI StudioでGemini APIキーを取得し、ここに貼り付けてください。キーは暗号化してこの端末にのみ保存されます。
          </p>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="AIza..."
              className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-surface-border dark:border-surface-darkborder
                        bg-white dark:bg-surface-darksoft text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <button onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {keyMsg && <p className="text-xs text-brand-500 mt-1.5">{keyMsg}</p>}
          <div className="flex gap-2 mt-2.5">
            <button onClick={saveApiKey} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition">
              保存
            </button>
            <button onClick={() => { clearApiKey(); setKeyInput('') }} className="px-4 py-2 rounded-xl border border-surface-border dark:border-surface-darkborder text-sm hover:bg-white dark:hover:bg-surface-darksoft transition">
              削除
            </button>
          </div>
        </Section>

        {/* モデル設定 */}
        <Section title="モデル設定">
          <label className="text-xs text-gray-400 block mb-1.5">既定モデル</label>
          <select
            value={settings.defaultModel}
            onChange={e => updateSettings({ defaultModel: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-surface-border dark:border-surface-darkborder
                      bg-white dark:bg-surface-darksoft text-sm mb-4"
          >
            {Object.entries(MODEL_MAP).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>

          <label className="text-xs text-gray-400 block mb-1.5">
            Temperature: {settings.temperature}
          </label>
          <input
            type="range" min="0" max="2" step="0.1"
            value={settings.temperature}
            onChange={e => {
              const v = Number(e.target.value)
              if (validateTemperature(v).valid) updateSettings({ temperature: v })
            }}
            className="w-full accent-brand-500 mb-4"
          />

          <label className="text-xs text-gray-400 block mb-1.5">Max Output Tokens</label>
          <input
            type="number" min="1" max="8192"
            value={settings.maxOutputTokens}
            onChange={e => {
              const v = Number(e.target.value)
              if (validateMaxTokens(v).valid) updateSettings({ maxOutputTokens: v })
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-surface-border dark:border-surface-darkborder
                      bg-white dark:bg-surface-darksoft text-sm mb-4"
          />

          <label className="text-xs text-gray-400 block mb-1.5">システムプロンプト</label>
          <textarea
            value={settings.systemPrompt}
            onChange={e => updateSettings({ systemPrompt: e.target.value })}
            rows={3}
            placeholder="AIの振る舞いに関する追加指示があれば入力（任意）"
            className="w-full px-3 py-2.5 rounded-xl border border-surface-border dark:border-surface-darkborder
                      bg-white dark:bg-surface-darksoft text-sm resize-none"
          />
        </Section>

        {/* UI設定 */}
        <Section title="表示設定">
          <ToggleRow
            icon={settings.darkMode ? <Moon size={16} /> : <Sun size={16} />}
            label="ダークモード"
            checked={settings.darkMode}
            onChange={v => updateSettings({ darkMode: v })}
          />

          <div className="h-px bg-surface-border dark:bg-surface-darkborder my-3.5" />

          <div className="flex items-center gap-2 text-sm mb-2">
            <Type size={16} />
            <span>文字サイズ</span>
          </div>
          <div className="flex gap-2">
            {[
              { key: 'small', label: '小' },
              { key: 'medium', label: '中' },
              { key: 'large', label: '大' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => updateSettings({ fontSize: opt.key })}
                className={`flex-1 py-2 rounded-xl text-sm border transition
                  ${settings.fontSize === opt.key
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'border-surface-border dark:border-surface-darkborder hover:bg-white dark:hover:bg-surface-dark'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="h-px bg-surface-border dark:bg-surface-darkborder my-3.5" />

          <ToggleRow
            icon={<Volume2 size={16} />}
            label="AI応答の読み上げボタンを表示"
            checked={settings.ttsEnabled}
            onChange={v => updateSettings({ ttsEnabled: v })}
          />

          <div className="h-px bg-surface-border dark:bg-surface-darkborder my-3.5" />

          <ToggleRow
            icon={<MessageCircle size={16} />}
            label="クイック返信サジェストを表示"
            checked={settings.quickRepliesEnabled}
            onChange={v => updateSettings({ quickRepliesEnabled: v })}
          />
        </Section>

        {/* メモリ設定 */}
        <Section title="メモリ">
          <ToggleRow
            label="メモリ機能（会話要約・長期記憶）"
            checked={settings.memoryEnabled}
            onChange={v => updateSettings({ memoryEnabled: v })}
          />
          <p className="text-xs text-gray-400 mt-2">
            オフにすると、会話の要約や長期的なユーザー情報の記憶を行わなくなります。
          </p>
        </Section>

        {/* 通知設定 */}
        <Section title="自律通知">
          <ToggleRow
            icon={<Bell size={16} />}
            label="通知を許可する"
            checked={notif.permission === 'granted'}
            onChange={async (v) => { if (v) await notif.enableNotifications() }}
          />
          <p className="text-xs text-gray-400 mt-2">
            HumanAIが会話の内容や記憶をもとに、必要だと判断した時だけ通知を送ります。
            毎日決まった時間の通知や、依存を促すような通知は行いません。
          </p>
          {notif.error && <p className="text-xs text-red-500 mt-1">{notif.error}</p>}
        </Section>

        {/* データ管理 */}
        <Section title="データ管理">
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <button onClick={handleExport} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-surface-border dark:border-surface-darkborder text-sm hover:bg-white dark:hover:bg-surface-darksoft transition disabled:opacity-50">
              <Download size={14} /> エクスポート
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-surface-border dark:border-surface-darkborder text-sm hover:bg-white dark:hover:bg-surface-darksoft transition disabled:opacity-50">
              <Upload size={14} /> インポート
            </button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </div>
          <button onClick={handleDeleteAllChats} disabled={busy} className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition disabled:opacity-50">
            <Trash2 size={14} /> すべてのチャットを削除
          </button>
        </Section>

        {/* アカウント */}
        <Section title="アカウント">
          <p className="text-sm text-gray-500 mb-3">{user?.email}</p>
          <button onClick={signOut} className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-surface-border dark:border-surface-darkborder text-sm hover:bg-white dark:hover:bg-surface-darksoft transition">
            <LogOut size={14} /> ログアウト
          </button>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 mb-2.5">{title}</h2>
      <div className="bg-white dark:bg-surface-darksoft rounded-2xl border border-surface-border dark:border-surface-darkborder p-4">
        {children}
      </div>
    </section>
  )
}

function ToggleRow({ icon, label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition relative shrink-0 ${checked ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}
