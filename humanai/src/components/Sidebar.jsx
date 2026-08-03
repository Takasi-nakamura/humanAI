import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Settings, X, Sparkles, Search, Pin } from 'lucide-react'

// 最終更新が最終閲覧より新しければ「未読」とみなす（小機能④）
function isUnread(session) {
  const updated = session.updatedAt?.toMillis?.() || 0
  const viewed = session.lastViewedAt?.toMillis?.() || 0
  return updated > viewed + 1000 // 誤差吸収のため1秒マージン
}
import SessionMenu from './SessionMenu.jsx'
import SearchModal from './SearchModal.jsx'

export default function Sidebar({
  uid, sessions, currentSessionId, onNewSession, onDeleteSession,
  onTogglePin, onShareSession, onDownloadSession, onDuplicateSession, isOpen, onClose,
}) {
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)

  const { pinned, others } = useMemo(() => {
    const pinned = sessions.filter(s => s.pinned)
    const others = sessions.filter(s => !s.pinned)
    return { pinned, others }
  }, [sessions])

  const renderSession = (s) => (
    <div
      key={s.id}
      onClick={() => { navigate(`/chat/${s.id}`); onClose?.() }}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-sm min-w-0
                 ${currentSessionId === s.id
                   ? 'bg-white dark:bg-surface-dark shadow-soft font-medium'
                   : 'hover:bg-white/60 dark:hover:bg-surface-dark/60 text-gray-600 dark:text-gray-300'}`}
    >
      <MessageSquare size={15} className="shrink-0 text-gray-400" />
      <span className="truncate flex-1 min-w-0">{s.title || '新しい会話'}</span>
      {isUnread(s) && currentSessionId !== s.id && (
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" title="未読の更新があります" />
      )}
      <SessionMenu
        session={s}
        onShare={() => onShareSession(s)}
        onTogglePin={() => onTogglePin(s)}
        onDownload={() => onDownloadSession(s)}
        onDuplicate={() => onDuplicateSession(s)}
        onDelete={() => onDeleteSession(s.id)}
      />
    </div>
  )

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={onClose} />
      )}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-[85vw] max-w-72 md:w-72 bg-surface-soft dark:bg-surface-darksoft
                        border-r border-surface-border dark:border-surface-darkborder flex flex-col
                        transform transition-transform duration-200 safe-top
                        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between px-4 py-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-bold tracking-tight truncate">HumanAI</span>
          </div>
          <button onClick={onClose} className="md:hidden p-1 text-gray-400 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-3 space-y-2 shrink-0">
          <button
            onClick={onNewSession}
            className="w-full flex items-center gap-2 justify-center py-2.5 rounded-xl bg-brand-500 text-white
                      text-sm font-medium hover:bg-brand-600 transition"
          >
            <Plus size={16} />
            新しい会話
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-surface-border
                      dark:border-surface-darkborder text-sm text-gray-500 hover:bg-white dark:hover:bg-surface-dark transition"
          >
            <Search size={15} />
            会話を検索
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 mt-3 space-y-3 pb-2">
          {sessions.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-8 px-4">
              まだ会話がありません。<br />「新しい会話」から始めましょう。
            </p>
          )}

          {pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 font-medium">
                <Pin size={11} />
                ピン留め
              </div>
              <div className="space-y-0.5">
                {pinned.map(renderSession)}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div className="px-3 py-1 text-xs text-gray-400 font-medium">その他の会話</div>
              )}
              <div className="space-y-0.5">
                {others.map(renderSession)}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-surface-border dark:border-surface-darkborder shrink-0 safe-bottom">
          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300
                      hover:bg-white dark:hover:bg-surface-dark transition"
          >
            <Settings size={16} />
            設定
          </button>
        </div>
      </aside>

      <SearchModal uid={uid} isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
