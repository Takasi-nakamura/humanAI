// HumanAI - チャット管理hook（改良版）
import { useState, useCallback, useRef } from 'react'
import { callGemini, toGeminiContents, MODEL_MAP } from '../lib/gemini'
import { buildHumanAiSystemPrompt, extractNotifyCommand } from '../engine/humanaiEngine'
import { addMessage, maybeSummarize, getUserProfile, formatProfileForPrompt } from '../lib/memory'
import { validateChatInput } from '../lib/validation'
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'

// FCM通知をFirestore経由でトリガーする（全セッションにも通知ログを残す）
async function sendPushNotification(uid, message, sessionId) {
  console.log('sendPushNotification呼ばれた', uid, message)
  if (!uid) return
try {
    console.log('addDoc開始')
    const docRef = await addDoc(collection(db, 'users', uid, 'notificationQueue'), {
      message,
      sessionId: sessionId || null,
      createdAt: serverTimestamp(),
      processed: false,
    })
    console.log('Firestore書き込み成功', docRef.id)
  } catch (e) {
    console.error('通知送信エラー:', e.code, e.message)
  }
}

export function useChat({ uid, sessionId, apiKey, settings }) {
  const [messages, setMessages] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const loadMessages = useCallback((msgs) => {
    setMessages(msgs)
  }, [])

  const sendMessage = useCallback(async ({ text, attachments = [], modelOverride }) => {
    setError(null)
    const validation = validateChatInput(text)
    if (!validation.valid && attachments.length === 0) {
      setError(validation.message)
      return
    }

    const modelKey = modelOverride || settings.defaultModel
    const modelId = MODEL_MAP[modelKey]?.id || MODEL_MAP['3.5-flash-lite'].id

    const userMessage = {
      role: 'user',
      text: text.trim(),
      attachments: attachments.map(a => ({ name: a.name, mimeType: a.mimeType, inlineData: a.inlineData })),
      modelUsed: modelKey,
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setIsSending(true)

    try {
      if (uid && sessionId) {
        await addMessage(uid, sessionId, userMessage)
      }

      let profileText = ''
      if (settings.memoryEnabled && uid) {
        const profile = await getUserProfile(uid)
        profileText = formatProfileForPrompt(profile)
      }

      const systemPrompt = buildHumanAiSystemPrompt({
        baseSystemPrompt: settings.systemPrompt,
        userProfile: profileText,
        memorySummary: null,
      })

      const controller = new AbortController()
      abortRef.current = controller

      const contents = toGeminiContents(nextMessages)

      const result = await callGemini({
        apiKey,
        modelId,
        contents,
        systemInstruction: systemPrompt,
        temperature: settings.temperature,
        maxOutputTokens: settings.maxOutputTokens,
        signal: controller.signal,
      })

      // 通知コマンドを抽出
      console.log('AI生テキスト:', result.text)
      const { text: cleanedText, notifyMessage } = extractNotifyCommand(result.text)

      const assistantMessage = {
        role: 'assistant',
        text: cleanedText,
        modelUsed: modelKey,
        quickReplies: [],
      }

      let finalMessages = [...nextMessages, assistantMessage]

      // 通知が要求されていた場合
      if (notifyMessage) {
        await sendPushNotification(uid, notifyMessage, sessionId)
        const notifLogMessage = {
          role: 'notification',
          text: notifyMessage,
        }
        finalMessages = [...finalMessages, notifLogMessage]
      }

      setMessages(finalMessages)

      if (uid && sessionId) {
        await addMessage(uid, sessionId, assistantMessage)
        if (notifyMessage) {
          await addMessage(uid, sessionId, { role: 'notification', text: notifyMessage })
        }
        if (settings.memoryEnabled) {
          maybeSummarize({ uid, sessionId, messages: finalMessages, apiKey, modelId }).catch(() => {})
        }
      }

      return assistantMessage
    } catch (e) {
      if (e.name === 'AbortError') {
        setError('応答生成を中止しました。')
      } else {
        setError(e.message || '応答の生成に失敗しました。')
      }
    } finally {
      setIsSending(false)
      abortRef.current = null
    }
  }, [messages, uid, sessionId, apiKey, settings])

  const regenerateLast = useCallback(async (modelOverride) => {
    if (messages.length < 2) return
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserIdx === -1) return
    const idx = messages.length - 1 - lastUserIdx
    const lastUserMsg = messages[idx]
    const trimmed = messages.slice(0, idx)
    setMessages(trimmed)
    return sendMessage({ text: lastUserMsg.text, attachments: lastUserMsg.attachments || [], modelOverride })
  }, [messages, sendMessage])

  // メッセージ編集して再送信
  const editAndResend = useCallback(async (message, newText, modelOverride) => {
    const idx = messages.findIndex(m => m === message || m.id === message.id)
    if (idx === -1) return
    // 編集したメッセージ以降を削除して再送信
    const trimmed = messages.slice(0, idx)
    setMessages(trimmed)
    return sendMessage({ text: newText, attachments: message.attachments || [], modelOverride })
  }, [messages, sendMessage])

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { messages, setMessages: loadMessages, sendMessage, regenerateLast, editAndResend, stopGenerating, isSending, error }
}
