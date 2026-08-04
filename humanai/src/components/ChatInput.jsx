import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Paperclip, X, StopCircle, ChevronDown, FileText, Image as ImageIcon } from 'lucide-react'
import { MODEL_MAP } from '../lib/gemini'
import { buildAttachment } from '../lib/dataTools'

const MAX_CHARS = 4000

export default function ChatInput({ onSend, onStop, isSending, defaultModel, error, initialText = '', onInitialTextConsumed }) {
  const [text, setText] = useState('')
  const [pendingFiles, setPendingFiles] = useState([])
  const [model, setModel] = useState(defaultModel || '3.5-flash-lite')
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  // 編集テキストが外から注入された場合にセット
  useEffect(() => {
    if (initialText) {
      setText(initialText)
      textareaRef.current?.focus()
      onInitialTextConsumed?.()
    }
  }, [initialText])

  const handleFiles = useCallback(async (fileList) => {
    setFileError('')
    const files = Array.from(fileList)
    for (const file of files) {
      try {
        const att = await buildAttachment(file)
        setPendingFiles(prev => [...prev, att])
      } catch (e) {
        setFileError(e.message)
      }
    }
  }, [])

  const handleSubmit = () => {
    if (isSending) return
    if (!text.trim() && pendingFiles.length === 0) return
    if (text.length > MAX_CHARS) return
    onSend({ text, attachments: pendingFiles, model })
    setText('')
    setPendingFiles([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const autoResize = (e) => {
    const val = e.target.value
    if (val.length <= MAX_CHARS) setText(val)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  const charCount = text.length
  const nearLimit = charCount > MAX_CHARS * 0.8
  const overLimit = charCount > MAX_CHARS

  return (
    <div
      className={`border-t border-surface-border dark:border-surface-darkborder bg-white dark:bg-surface-dark
                  px-3 sm:px-4 pt-2.5 pb-3 safe-bottom transition-colors
                  ${dragOver ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      {(error || fileError) && (
        <p className="text-xs text-red-500 mb-1.5 px-1">{error || fileError}</p>
      )}

      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-surface-soft dark:bg-surface-darksoft
                                     border border-surface-border dark:border-surface-darkborder rounded-lg px-2 py-1 text-xs">
              {f.mimeType?.startsWith('image/') ? <ImageIcon size={12} /> : <FileText size={12} />}
              <span className="truncate max-w-[100px]">{f.name}</span>
              <button onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}>
                <X size={12} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`flex items-end gap-2 bg-surface-soft dark:bg-surface-darksoft rounded-2xl border
                      px-2 py-1.5 focus-within:ring-2 focus-within:ring-brand-300 transition
                      ${overLimit ? 'border-red-400' : 'border-surface-border dark:border-surface-darkborder'}`}>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-gray-400 hover:text-brand-500 hover:bg-white dark:hover:bg-surface-dark transition shrink-0"
          title="ファイルを添付"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,application/pdf,text/plain,text/markdown,text/csv"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={autoResize}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力…（Shift+Enterで改行）"
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none py-2 text-[15px] max-h-40 placeholder:text-gray-400"
        />

        <div className="relative shrink-0">
          <button
            onClick={() => setModelMenuOpen(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 px-2 py-2 rounded-xl hover:bg-white dark:hover:bg-surface-dark transition"
          >
            <span className="hidden sm:inline">{MODEL_MAP[model]?.label}</span>
            <span className="sm:hidden">{model === '3.6-flash' ? '3.6' : '3.5L'}</span>
            <ChevronDown size={12} />
          </button>
          {modelMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-surface-darksoft border
                            border-surface-border dark:border-surface-darkborder rounded-xl shadow-floating overflow-hidden z-20">
              {Object.entries(MODEL_MAP).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => { setModel(key); setModelMenuOpen(false) }}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-surface-soft dark:hover:bg-surface-dark
                             ${model === key ? 'text-brand-600 font-medium' : ''}`}
                >
                  <div>{m.label}</div>
                  <div className="text-xs text-gray-400">{m.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {isSending ? (
          <button
            onClick={onStop}
            className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition shrink-0"
            title="停止"
          >
            <StopCircle size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={(!text.trim() && pendingFiles.length === 0) || overLimit}
            className="p-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition shrink-0
                      disabled:opacity-30 disabled:cursor-not-allowed"
            title="送信"
          >
            <Send size={18} />
          </button>
        )}
      </div>

      {/* 文字数カウンター */}
      {nearLimit && (
        <p className={`text-xs mt-1 text-right px-1 ${overLimit ? 'text-red-500' : 'text-gray-400'}`}>
          {charCount} / {MAX_CHARS}
        </p>
      )}
    </div>
  )
}
