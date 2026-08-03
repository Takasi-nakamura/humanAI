// HumanAI - チャット管理hook
// Gemini API呼び出し、HumanAI Engineによるシステムプロンプト合成、
// Firestoreへの履歴保存、会話要約トリガーを統合する。
import { useState, useCallback, useRef } from 'react'
import { callGemini, toGeminiContents, MODEL_MAP } from '../lib/gemini'
import { buildHumanAiSystemPrompt, buildQuickReplyInstruction, extractQuickReplies } from '../engine/humanaiEngine'
import { addMessage, maybeSummarize, getUserProfile, formatProfileForPrompt } from '../lib/memory'
import { validateChatInput } from '../lib/validation'

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

      // --- HumanAI Engine: 内部分析結果をシステムプロンプトへ合成 ---
      let profileText = ''
      if (settings.memoryEnabled && uid) {
        const profile = await getUserProfile(uid)
        profileText = formatProfileForPrompt(profile)
      }

      let systemPrompt = buildHumanAiSystemPrompt({
        baseSystemPrompt: settings.systemPrompt,
        userProfile: profileText,
        memorySummary: null, // セッション要約はcontents側で別途注入（App.jsx側でセット済み想定）
      })

      if (settings.quickRepliesEnabled) {
        systemPrompt += buildQuickReplyInstruction()
      }

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

      const { text: cleanedText, quickReplies } = settings.quickRepliesEnabled
        ? extractQuickReplies(result.text)
        : { text: result.text, quickReplies: [] }

      const assistantMessage = {
        role: 'assistant',
        text: cleanedText,
        modelUsed: modelKey,
        quickReplies,
      }

      const finalMessages = [...nextMessages, assistantMessage]
      setMessages(finalMessages)

      if (uid && sessionId) {
        await addMessage(uid, sessionId, assistantMessage)
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

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { messages, setMessages: loadMessages, sendMessage, regenerateLast, stopGenerating, isSending, error }
}
