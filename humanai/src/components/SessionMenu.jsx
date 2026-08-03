import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Share2, Pin, PinOff, Trash2, Download, Copy } from 'lucide-react'

// HumanAI - セッション操作メニュー
// ゴミ箱アイコンから3点リーダーに変更し、共有・ピン留め・削除・ダウンロード・複製をまとめる。
export default function SessionMenu({ session, onShare, onTogglePin, onDelete, onDownload, onDuplicate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const item = (icon, label, onClick, danger = false) => (
    <button
      onClick={(e) => { e.stopPropagation(); setOpen(false); onClick() }}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition
                 hover:bg-surface-soft dark:hover:bg-surface-dark
                 ${danger ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-surface-border/60 dark:hover:bg-surface-darkborder text-gray-400 transition"
        title="メニュー"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-7 z-50 w-44 bg-white dark:bg-surface-darksoft rounded-xl
                     shadow-floating border border-surface-border dark:border-surface-darkborder overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {item(<Share2 size={14} />, '共有', onShare)}
          {item(
            session.pinned ? <PinOff size={14} /> : <Pin size={14} />,
            session.pinned ? 'ピン留め解除' : 'ピン留め',
            onTogglePin
          )}
          {item(<Download size={14} />, 'ダウンロード', onDownload)}
          {onDuplicate && item(<Copy size={14} />, '複製', onDuplicate)}
          {item(<Trash2 size={14} />, '削除', onDelete, true)}
        </div>
      )}
    </div>
  )
}
