// HumanAI - クイック返信サジェスト
// AIの返答の下に短い返信候補を表示し、タップだけで会話を続けられるようにする。
export default function QuickReplies({ replies, onSelect }) {
  if (!replies?.length) return null

  return (
    <div className="px-4 pb-2 flex gap-2 overflow-x-auto animate-fadeIn">
      {replies.map((r, i) => (
        <button
          key={i}
          onClick={() => onSelect(r)}
          className="shrink-0 px-3.5 py-2 rounded-full border border-brand-200 dark:border-brand-800
                    text-brand-600 dark:text-brand-300 text-sm bg-brand-50/50 dark:bg-brand-900/20
                    hover:bg-brand-100 dark:hover:bg-brand-900/40 transition whitespace-nowrap"
        >
          {r}
        </button>
      ))}
    </div>
  )
}
