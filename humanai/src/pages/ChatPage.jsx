import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useSettings } from '../hooks/useSettings.jsx'
import { useChat } from '../hooks/useChat.jsx'
import {
  createSession, listSessions, deleteSession as deleteSessionFs, listMessages,
  updateSessionTitle, togglePinSession, markSessionViewed, duplicateSession,
} from '../lib/memory'
import { shareSession, downloadSessionAsText } from '../lib/dataTools'
import Sidebar from '../components/Sidebar.jsx'
import MessageBubble from '../components/MessageBubble.jsx'
import TypingIndicator from '../components/TypingIndicator.jsx'
import ChatInput from '../components/ChatInput.jsx'
import QuickReplies from '../components/QuickReplies.jsx'

export default function ChatPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings, apiKey } = useSettings()

  const [sessions, setSessions] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const scrollRef = useRef(null)

  const { messages, setMessages, sendMessage, regenerateLast, stopGenerating, isSending, error } = useChat({
    uid: user?.uid,
    sessionId,
    apiKey,
    settings,
  })

  const refreshSessions = useCallback(async () => {
    if (!user) return
    const list = await listSessions(user.uid)
    setSessions(list)
  }, [user])

  useEffect(() => { refreshSessions() }, [refreshSessions])

  useEffect(() => {
    (async () => {
      if (!user) return
      if (!sessionId) {
        setMessages([])
        return
      }
      const msgs = await listMessages(user.uid, sessionId)
      setMessages(msgs)
      markSessionViewed(user.uid, sessionId).catch(() => {})
    })()
  }, [user, sessionId, setMessages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isSending])

  const handleNewSession = async () => {
    if (!user) return
    const id = await createSession(user.uid)
    await refreshSessions()
    navigate(`/chat/${id}`)
    setSidebarOpen(false)
  }

  const handleDeleteSession = async (id) => {
    if (!user) return
    if (!confirm('この会話を削除します。よろしいですか？')) return
    await deleteSessionFs(user.uid, id)
    await refreshSessions()
    if (sessionId === id) navigate('/chat')
  }

  const handleTogglePin = async (session) => {
    if (!user) return
    await togglePinSession(user.uid, session.id, !session.pinned)
    await refreshSessions()
  }

  const handleShareSession = async (session) => {
    if (!user) return
    const msgs = await listMessages(user.uid, session.id)
    try {
      const result = await shareSession(session, msgs)
      if (result === 'copied') alert('会話をクリップボードにコピーしました。')
    } catch (e) {
      alert('共有に失敗しました。')
    }
  }

  const handleDownloadSession = async (session) => {
    if (!user) return
    const msgs = await listMessages(user.uid, session.id)
    downloadSessionAsText(session, msgs)
  }

  const handleDuplicateSession = async (session) => {
    if (!user) return
    const newId = await duplicateSession(user.uid, session.id)
    await refreshSessions()
    navigate(`/chat/${newId}`)
  }

  const handleSend = async ({ text, attachments, model }) => {
    let activeSessionId = sessionId
    const isFirstMessage = messages.length === 0
    if (!activeSessionId && user) {
      activeSessionId = await createSession(user.uid, text.slice(0, 30) || '新しい会話')
      await refreshSessions()
      navigate(`/chat/${activeSessionId}`, { replace: true })
    }
    await sendMessage({ text, attachments, modelOverride: model })
    if (isFirstMessage && activeSessionId && user) {
      await updateSessionTitle(user.uid, activeSessionId, text.slice(0, 30) || '新しい会話')
      refreshSessions()
    }
  }

  const handleQuickReply = (replyText) => {
    handleSend({ text: replyText, attachments: [], model: settings.defaultModel })
  }

  const handleEdit = (message) => {
    const input = document.querySelector('textarea')
    if (input) {
      input.value = message.text
      input.focus()
    }
  }

  const lastAssistantWithReplies = [...messages].reverse().find(m => m.role === 'assistant' && m.quickReplies?.length)
  const showQuickReplies = settings.quickRepliesEnabled
    && !isSending
    && messages.length > 0
    && messages[messages.length - 1].role === 'assistant'
    && messages[messages.length - 1].quickReplies?.length > 0

  return (
    <div className="h-screen flex bg-white dark:bg-surface-dark overflow-hidden">
      <Sidebar
        uid={user?.uid}
        sessions={sessions}
        currentSessionId={sessionId}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onTogglePin={handleTogglePin}
        onShareSession={handleShareSession}
        onDownloadSession={handleDownloadSession}
        onDuplicateSession={handleDuplicateSession}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-surface-border dark:border-surface-darkborder safe-top md:hidden shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1.5 text-gray-500">
            <Menu size={20} />
          </button>
          <span className="font-semibold truncate">HumanAI</span>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 chat-text">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((m, i) => (
              <MessageBubble
                key={m.id || i}
                message={m}
                isLast={i === messages.length - 1}
                onRegenerate={m.role === 'assistant' ? regenerateLast : undefined}
                onEdit={m.role === 'user' ? handleEdit : undefined}
                ttsEnabled={settings.ttsEnabled}
              />
            ))
          )}
          {isSending && <TypingIndicator />}
        </div>

        {showQuickReplies && (
          <QuickReplies
            replies={messages[messages.length - 1].quickReplies}
            onSelect={handleQuickReply}
          />
        )}

        <ChatInput
          onSend={handleSend}
          onStop={stopGenerating}
          isSending={isSending}
          defaultModel={settings.defaultModel}
          error={error}
        />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-4">
        <span className="text-2xl">💬</span>
      </div>
      <h2 className="text-lg font-semibold mb-1">HumanAIへようこそ</h2>
      <p className="text-sm text-gray-400 max-w-xs">
        何でも話しかけてください。あなたのペースに合わせて、自然な会話を心がけます。
      </p>
    </div>
  )
}
