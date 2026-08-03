import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, MessageSquare } from 'lucide-react'
import { listSessions, listMessages } from '../lib/memory'

// HumanAI - チャット内検索（大機能①）
// 全セッションのタイトル・本文を横断検索し、該当会話へジャンプできる。
export default function SearchModal({ uid, isOpen, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const runSearch = useCallback(async (q) => {
    if (!uid || !q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const sessions = await listSessions(uid)
      const lowerQ = q.toLowerCase()
      const matched = []

      // タイトル一致は即座に候補へ
      for (const s of sessions) {
        if ((s.title || '').toLowerCase().includes(lowerQ)) {
          matched.push({ sessionId: s.id, title: s.title, snippet: '（タイトルが一致）', type: 'title' })
        }
      }

      // 本文一致（直近の会話から優先的に検索、負荷を抑えるため上位20件に限定）
      for (const s of sessions.slice(0, 20)) {
        const msgs = await listMessages(uid, s.id)
        const hit = msgs.find(m => (m.text || '').toLowerCase().includes(lowerQ))
        if (hit && !matched.some(m => m.sessionId === s.id)) {
          const idx = hit.text.toLowerCase().indexOf(lowerQ)
          const snippet = hit.text.slice(Math.max(0, idx - 15), idx + 40)
          matched.push({ sessionId: s.id, title: s.title, snippet: `…${snippet}…`, type: 'body' })
        }
      }

      setResults(matched.slice(0, 30))
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, runSearch])

  useEffect(() => {
    if (!isOpen) { setQuery(''); setResults([]) }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-16 sm:pt-24 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-surface-darksoft rounded-2xl shadow-floating overflow-hidden max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border dark:border-surface-darkborder">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="会話を検索…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <button onClick={onClose} className="text-gray-400 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading && <p className="text-xs text-gray-400 text-center py-6">検索中…</p>}
          {!loading && query.trim() && results.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">一致する会話が見つかりませんでした。</p>
          )}
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => { navigate(`/chat/${r.sessionId}`); onClose() }}
              className="w-full text-left px-4 py-3 hover:bg-surface-soft dark:hover:bg-surface-dark transition flex items-start gap-2.5 border-b border-surface-border dark:border-surface-darkborder last:border-0"
            >
              <MessageSquare size={15} className="text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.title || '新しい会話'}</p>
                <p className="text-xs text-gray-400 truncate">{r.snippet}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
