import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Check, RotateCcw, Pencil, User, Sparkles, FileText, Image as ImageIcon, Volume2, VolumeX, Bell } from 'lucide-react'
import { speakText, stopSpeaking, isSpeechSupported } from '../lib/tts'

export default function MessageBubble({ message, onRegenerate, onEdit, isLast, ttsEnabled }) {
  const isUser = message.role === 'user'
  const isNotification = message.role === 'notification'
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.text || '')
  const longPressTimer = useRef(null)

  // 通知ログメッセージの表示
  if (isNotification) {
    return (
      <div className="flex justify-center px-3 py-2 animate-fadeIn">
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-surface-soft dark:bg-surface-darksoft
                        border border-surface-border dark:border-surface-darkborder rounded-full px-3 py-1.5">
          <Bell size={11} />
          <span>通知を送信しました: {message.text}</span>
        </div>
      </div>
    )
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.text || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // 長押しコピー（モバイル向け）
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(async () => {
      await navigator.clipboard.writeText(message.text || '').catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }, 600)
  }
  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current)
  }

  const handleSpeak = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    const ok = speakText(message.text || '')
    if (ok) {
      setSpeaking(true)
      const estMs = Math.min(20000, (message.text || '').length * 90)
      setTimeout(() => setSpeaking(false), estMs)
    }
  }

  const handleEditSubmit = () => {
    if (editText.trim() && onEdit) {
      onEdit(message, editText.trim())
      setEditing(false)
    }
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEditSubmit()
    }
    if (e.key === 'Escape') {
      setEditing(false)
      setEditText(message.text || '')
    }
  }

  return (
    <div className={`flex gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 group ${isUser ? 'flex-row-reverse' : ''} animate-fadeIn`}>
      <div className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full flex items-center justify-center
        ${isUser ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300'
                 : 'bg-gray-900 text-white dark:bg-brand-500'}`}>
        {isUser ? <User size={14} /> : <Sparkles size={14} />}
      </div>

      <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
        {message.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-1.5">
            {message.attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs bg-surface-soft dark:bg-surface-darksoft
                                       border border-surface-border dark:border-surface-darkborder rounded-lg px-2 py-1">
                {att.mimeType?.startsWith('image/') ? <ImageIcon size={12} /> : <FileText size={12} />}
                <span className="truncate max-w-[120px]">{att.name}</span>
              </div>
            ))}
          </div>
        )}

        {editing ? (
          <div className="w-full min-w-[200px]">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              autoFocus
              rows={3}
              className="w-full px-3 py-2 rounded-2xl border border-brand-400 outline-none resize-none
                         bg-white dark:bg-surface-darksoft text-[15px] text-right"
            />
            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={() => { setEditing(false); setEditText(message.text || '') }}
                className="text-xs text-gray-400 px-2 py-1 rounded-lg hover:bg-surface-soft"
              >キャンセル</button>
              <button
                onClick={handleEditSubmit}
                className="text-xs text-white bg-brand-500 px-3 py-1 rounded-lg hover:bg-brand-600"
              >送信</button>
            </div>
          </div>
        ) : (
          <div
            className={`px-3.5 sm:px-4 py-2.5 rounded-2xl chat-text leading-relaxed min-w-0
              ${isUser
                ? 'bg-brand-500 text-white rounded-tr-sm'
                : 'bg-white dark:bg-surface-darksoft border border-surface-border dark:border-surface-darkborder rounded-tl-sm shadow-soft'
              }`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
            ) : (
              <div className="prose-chat break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeHighlight]}
                >
                  {message.text || ''}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {!editing && (
          <div className="flex items-center gap-0.5 mt-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-surface-soft dark:hover:bg-surface-darksoft text-gray-400" title="コピー">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            {!isUser && ttsEnabled && isSpeechSupported() && (
              <button onClick={handleSpeak} className="p-1.5 rounded-lg hover:bg-surface-soft dark:hover:bg-surface-darksoft text-gray-400" title="読み上げ">
                {speaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
            )}
            {!isUser && isLast && onRegenerate && (
              <button onClick={onRegenerate} className="p-1.5 rounded-lg hover:bg-surface-soft dark:hover:bg-surface-darksoft text-gray-400" title="再生成">
                <RotateCcw size={13} />
              </button>
            )}
            {isUser && onEdit && (
              <button
                onClick={() => { setEditing(true); setEditText(message.text || '') }}
                className="p-1.5 rounded-lg hover:bg-surface-soft dark:hover:bg-surface-darksoft text-gray-400"
                title="編集して再送信"
              >
                <Pencil size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
