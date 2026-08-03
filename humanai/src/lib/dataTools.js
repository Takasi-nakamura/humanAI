// HumanAI - データエクスポート/インポート & ファイル添付ユーティリティ
import { listSessions, listMessages, createSession, addMessage, getUserProfile, saveUserProfile } from './memory'

export async function exportAllData(uid) {
  const sessions = await listSessions(uid)
  const sessionsWithMessages = await Promise.all(
    sessions.map(async (s) => ({
      ...s,
      messages: await listMessages(uid, s.id),
    }))
  )
  const profile = await getUserProfile(uid)

  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'HumanAI',
    version: 1,
    profile,
    sessions: sessionsWithMessages,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `humanai-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importAllData(uid, file) {
  const text = await file.text()
  const data = JSON.parse(text)

  if (data.app !== 'HumanAI') {
    throw new Error('このファイルはHumanAIのエクスポート形式ではありません。')
  }

  if (data.profile?.facts) {
    await saveUserProfile(uid, data.profile.facts)
  }

  for (const session of data.sessions || []) {
    const newId = await createSession(uid, session.title || 'インポートされた会話')
    for (const msg of session.messages || []) {
      const { id, createdAt, ...rest } = msg
      await addMessage(uid, newId, rest)
    }
  }

  return { importedSessions: data.sessions?.length || 0 }
}

// ---------- 単一会話の共有・ダウンロード ----------

export function sessionToText(session, messages) {
  const lines = [`# ${session.title || '会話'}`, '']
  for (const m of messages) {
    lines.push(`【${m.role === 'user' ? 'あなた' : 'HumanAI'}】`)
    lines.push(m.text || '')
    lines.push('')
  }
  return lines.join('\n')
}

export function downloadSessionAsText(session, messages) {
  const text = sessionToText(session, messages)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(session.title || 'humanai-chat').slice(0, 40)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export async function shareSession(session, messages) {
  const text = sessionToText(session, messages)
  if (navigator.share) {
    try {
      await navigator.share({ title: session.title || 'HumanAI', text })
      return 'shared'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled'
      throw e
    }
  }
  // Web Share API未対応環境ではクリップボードにコピー
  await navigator.clipboard.writeText(text)
  return 'copied'
}

// ---------- ファイル添付（画像・PDF・テキスト） ----------

export const ACCEPTED_FILE_TYPES = {
  image: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  pdf: ['application/pdf'],
  text: ['text/plain', 'text/markdown', 'text/csv'],
}

export function isAcceptedFile(file) {
  const all = [...ACCEPTED_FILE_TYPES.image, ...ACCEPTED_FILE_TYPES.pdf, ...ACCEPTED_FILE_TYPES.text]
  return all.includes(file.type)
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function buildAttachment(file) {
  const MAX_SIZE = 15 * 1024 * 1024 // 15MB
  if (file.size > MAX_SIZE) {
    throw new Error(`ファイルサイズが大きすぎます（上限15MB）: ${file.name}`)
  }
  if (!isAcceptedFile(file)) {
    throw new Error(`対応していないファイル形式です: ${file.type || file.name}`)
  }
  const base64 = await fileToBase64(file)
  return {
    name: file.name,
    mimeType: file.type,
    size: file.size,
    inlineData: base64,
  }
}
