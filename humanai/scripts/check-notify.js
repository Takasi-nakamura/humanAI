// ============================================================
// HumanAI 自律通知スクリプト（GitHub Actions直接実行版）
// チャットからの即時通知キュー処理も対応
// ============================================================
const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('[HumanAI] 必要な環境変数が設定されていません。')
  process.exit(1)
}

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
})

const db = getFirestore()
const messaging = getMessaging()
const MIN_NOTIFICATION_INTERVAL_MS = 3 * 60 * 60 * 1000

async function main() {
  console.log('[HumanAI] 通知チェック開始')
  let processedCount = 0
  let notifiedCount = 0

  const usersSnap = await db.collection('users').get()

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id
    try {
      // 1. チャットからのキュー通知を優先処理
      const queueNotified = await processNotificationQueue(uid)
      // 2. 自律通知チェック
      const autoNotified = await processUser(uid)
      processedCount++
      if (queueNotified || autoNotified) notifiedCount++
    } catch (e) {
      console.error(`[HumanAI] ユーザー ${uid} でエラー:`, e)
    }
  }

  console.log(`[HumanAI] 完了: ${processedCount}人チェック、${notifiedCount}人に通知`)
}

// チャットから送られた通知キューを処理
async function processNotificationQueue(uid) {
  const queueSnap = await db.collection(`users/${uid}/notificationQueue`)
    .where('processed', '==', false)
    .limit(5)
    .get()

  if (queueSnap.empty) return false

  const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get()
  const tokens = tokensSnap.docs.map(d => d.id)
  if (tokens.length === 0) return false

  let sent = false
  for (const qDoc of queueSnap.docs) {
    const { message } = qDoc.data()
    try {
      await messaging.sendEachForMulticast({
        tokens,
        notification: { title: 'HumanAI', body: message },
        webpush: { fcmOptions: { link: '/' } },
      })
      sent = true
      console.log(`[HumanAI] キュー通知送信: ${message}`)
    } catch (e) {
      console.error(`[HumanAI] キュー通知送信エラー:`, e)
    }
    // 処理済みにマーク
    await qDoc.ref.update({ processed: true, processedAt: FieldValue.serverTimestamp() })
  }
  return sent
}

// 自律通知チェック（従来の処理）
async function processUser(uid) {
  const settingsSnap = await db.doc(`users/${uid}/settings/general`).get()
  const settings = settingsSnap.exists ? settingsSnap.data() : null
  if (!settings?.notificationsEnabled) return false

  const notifStateSnap = await db.doc(`users/${uid}/memory/notificationState`).get()
  const notifState = notifStateSnap.exists ? notifStateSnap.data() : {}
  const lastSentAt = notifState.lastSentAt?.toMillis?.() || 0
  if (Date.now() - lastSentAt < MIN_NOTIFICATION_INTERVAL_MS) return false

  const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get()
  const tokens = tokensSnap.docs.map(d => d.id)
  if (tokens.length === 0) return false

  const sessionsSnap = await db.collection(`users/${uid}/sessions`)
    .orderBy('updatedAt', 'desc').limit(1).get()
  if (sessionsSnap.empty) return false
  const latestSession = sessionsSnap.docs[0]

  const messagesSnap = await db.collection(`users/${uid}/sessions/${latestSession.id}/messages`)
    .orderBy('createdAt', 'desc').limit(10).get()
  const recentMessages = messagesSnap.docs.map(d => d.data()).reverse()
  if (recentMessages.length === 0) return false

  const profileSnap = await db.doc(`users/${uid}/memory/profile`).get()
  const profileFacts = profileSnap.exists ? (profileSnap.data().facts || []) : []

  const serverKeySnap = await db.doc(`users/${uid}/settings/serverKey`).get()
  const serverApiKey = serverKeySnap.exists ? serverKeySnap.data().geminiApiKey : null

  const decision = await decideNotification({ recentMessages, summary: latestSession.data().summary || '', profileFacts, apiKey: serverApiKey })
  if (!decision.shouldNotify) return false

  await messaging.sendEachForMulticast({
    tokens,
    notification: { title: 'HumanAI', body: decision.message },
    webpush: { fcmOptions: { link: '/' } },
  })

  await db.doc(`users/${uid}/memory/notificationState`).set({
    lastSentAt: FieldValue.serverTimestamp(),
    lastReason: decision.reason,
  }, { merge: true })

  console.log(`[HumanAI] 自律通知送信: ${decision.message}`)
  return true
}

async function decideNotification({ recentMessages, summary, profileFacts, apiKey }) {
  if (!apiKey) return { shouldNotify: false, message: '', reason: 'no-server-api-key' }

  const transcript = recentMessages.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.text}`).join('\n')
  const profileText = profileFacts.length ? profileFacts.map(f => `- ${f}`).join('\n') : 'なし'

  const prompt = `
あなたはHumanAIの「自律通知判定エンジン」です。
以下の情報をもとに、ユーザーに今プッシュ通知を送るべきか判定してください。

# 直近の会話
${transcript}

# 会話の要約
${summary || 'なし'}

# ユーザーに関する既知情報
${profileText}

# 判定基準
- 約束・予定・締め切りに関するリマインドが自然かつ有益な場合は通知してよい
- 会話が完結しており、フォローアップの声掛けが自然な場合は通知してよい
- 依存を促す通知や不自然な通知はしない
- 判断に迷う場合は通知しない

# 出力形式（JSONのみ、前置き不要）
{"shouldNotify": true/false, "message": "30文字以内の日本語メッセージ（しないなら空文字）", "reason": "判定理由20文字"}
`.trim()

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
      }),
    }
  )

  if (!res.ok) return { shouldNotify: false, message: '', reason: 'api-error' }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return { shouldNotify: !!parsed.shouldNotify, message: parsed.message || '', reason: parsed.reason || '' }
  } catch {
    return { shouldNotify: false, message: '', reason: 'parse-error' }
  }
}

main().catch(e => { console.error('[HumanAI] 予期しないエラー:', e); process.exit(1) })
