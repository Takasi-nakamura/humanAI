import { Sparkles } from 'lucide-react'

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-3 animate-fadeIn">
      <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-gray-900 text-white dark:bg-brand-500">
        <Sparkles size={15} />
      </div>
      <div className="bg-white dark:bg-surface-darksoft border border-surface-border dark:border-surface-darkborder
                      rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-soft flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-typingDot" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-typingDot" style={{ animationDelay: '160ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-typingDot" style={{ animationDelay: '320ms' }} />
      </div>
    </div>
  )
}
