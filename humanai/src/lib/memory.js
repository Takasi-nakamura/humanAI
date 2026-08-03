// HumanAI - Memory管理
// ・チャット履歴のFirestore保存
// ・会話要約（一定メッセージ数ごとにGeminiで要約しコンパクト化）
// ・ユーザー情報（長期記憶）の保存
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  setDoc, query, orderBy, limit as fbLimit, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { callGemini } from './gemini'

const SUMMARY_TRIGGER_COUNT = 20 // このメッセージ数を超えたら要約を実行

// ---------- セッション（チャット履歴）管理 ----------

export function sessionsCol(uid) {
  return collection(db, 'users', uid, 'sessions')
}

export function messagesCol(uid, sessionId) {
  return collection(db, 'users', uid, 'sessions', sessionId, 'messages')
}

export async function createSession(uid, title = '新しい会話') {
  const ref = await addDoc(sessionsCol(uid), {
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    summary: '',
    messageCount: 0,
    pinned: false,
    lastViewedAt: serverTimestamp(),
  })
  return ref.id
}

export async function listSessions(uid) {
  const q = query(sessionsCol(uid), orderBy('updatedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteSession(uid, sessionId) {
  const msgsSnap = await getDocs(messagesCol(uid, sessionId))
  const batch = writeBatch(db)
  msgsSnap.docs.forEach(d => batch.delete(d.ref))
  batch.delete(doc(db, 'users', uid, 'sessions', sessionId))
  await batch.commit()
}

export async function addMessage(uid, sessionId, message) {
  const ref = await addDoc(messagesCol(uid, sessionId), {
    ...message,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'users', uid, 'sessions', sessionId), {
    updatedAt: serverTimestamp(),
    messageCount: (message.messageCount ?? 0) + 1,
  })
  return ref.id
}

export async function listMessages(uid, sessionId) {
  const q = query(messagesCol(uid, sessionId), orderBy('createdAt', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function updateSessionTitle(uid, sessionId, title) {
  await updateDoc(doc(db, 'users', uid, 'sessions', sessionId), { title })
}

export async function togglePinSession(uid, sessionId, pinned) {
  await updateDoc(doc(db, 'users', uid, 'sessions', sessionId), { pinned })
}

export async function markSessionViewed(uid, sessionId) {
  await updateDoc(doc(db, 'users', uid, 'sessions', sessionId), { lastViewedAt: serverTimestamp() })
}

export async function duplicateSession(uid, sessionId) {
  const original = (await getDocs(query(sessionsCol(uid)))).docs.find(d => d.id === sessionId)
  const originalMessages = await listMessages(uid, sessionId)
  const originalData = original?.data() || {}

  const newId = await createSession(uid, `${originalData.title || '会話'}（コピー）`)
  for (const msg of originalMessages) {
    const { id, createdAt, ...rest } = msg
    await addMessage(uid, newId, rest)
  }
  if (originalData.summary) {
    await updateDoc(doc(db, 'users', uid, 'sessions', newId), { summary: originalData.summary })
  }
  return newId
}

// ---------- 会話要約 ----------

/**
 * メッセージ数が閾値を超えていたら、Geminiで要約を作りセッションに保存する。
 * コンテキスト圧縮とAPIコスト削減が目的。
 */
export async function maybeSummarize({ uid, sessionId, messages, apiKey, modelId }) {
  if (messages.length < SUMMARY_TRIGGER_COUNT) return null
  if (!apiKey) return null

  const transcript = messages
    .slice(0, messages.length - 6) // 直近6件は要約せず残す
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.text}`)
    .join('\n')

  if (!transcript.trim()) return null

  try {
    const result = await callGemini({
      apiKey,
      modelId,
      contents: [{
        role: 'user',
        parts: [{
          text: `以下はユーザーとAIアシスタントの会話ログです。今後の会話で参照できるよう、
重要な事実・ユーザーの状況・感情の流れ・約束事を中心に、300文字程度の日本語で簡潔に要約してください。
要約文のみを出力し、前置きや箇条書き記号は不要です。\n\n${transcript}`
        }]
      }],
      temperature: 0.3,
      maxOutputTokens: 512,
    })

    const summary = result.text.trim()
    await updateDoc(doc(db, 'users', uid, 'sessions', sessionId), { summary })
    return summary
  } catch (e) {
    console.warn('会話要約に失敗しました:', e)
    return null
  }
}

// ---------- 長期記憶（ユーザープロフィール） ----------

export function profileDoc(uid) {
  return doc(db, 'users', uid, 'memory', 'profile')
}

export async function getUserProfile(uid) {
  const snap = await getDoc(profileDoc(uid))
  return snap.exists() ? snap.data() : { facts: [], updatedAt: null }
}

export async function saveUserProfile(uid, facts) {
  await setDoc(profileDoc(uid), { facts, updatedAt: serverTimestamp() }, { merge: true })
}

export async function addProfileFact(uid, fact) {
  const current = await getUserProfile(uid)
  const facts = Array.from(new Set([...(current.facts || []), fact]))
  await saveUserProfile(uid, facts)
  return facts
}

export function formatProfileForPrompt(profile) {
  if (!profile?.facts?.length) return ''
  return profile.facts.map(f => `- ${f}`).join('\n')
}

// ---------- メモリON/OFF設定 ----------

export function settingsDoc(uid) {
  return doc(db, 'users', uid, 'settings', 'general')
}

export async function getSettings(uid) {
  const snap = await getDoc(settingsDoc(uid))
  return snap.exists() ? snap.data() : {
    memoryEnabled: true,
    darkMode: false,
    defaultModel: '3.5-flash-lite',
    temperature: 0.9,
    maxOutputTokens: 2048,
    systemPrompt: '',
    notificationsEnabled: false,
    fontSize: 'medium',
    ttsEnabled: true,
    quickRepliesEnabled: true,
  }
}

export async function saveSettings(uid, partial) {
  await setDoc(settingsDoc(uid), partial, { merge: true })
}
