// ============================================================
// HumanAI 自律通知スクリプト（GitHub Actions直接実行版）
// ------------------------------------------------------------
// Cloud Functions（Blazeプラン必須）を使わず、GitHub Actions上で
// このスクリプトを直接実行することで、完全無料で動作します。
//
// 実行環境: GitHub Actions（Node.js 20）
// 呼び出し元: .github/workflows/notify.yml（30分ごとにcron実行）
//
// 必要なGitHub Secrets（リポジトリ Settings → Secrets → Actions）:
//   FIREBASE_PROJECT_ID   : FirebaseのプロジェクトID
//   FIREBASE_CLIENT_EMAIL : サービスアカウントのメールアドレス
//   FIREBASE_PRIVATE_KEY  : サービスアカウントの秘密鍵（-----BEGIN～-----END まで）
//
// ※ NOTIFY_SECRET は不要になりました（GitHub Actions自体が認証の役割を担うため）
//
// 処理の流れ:
//   1. Firebase Admin SDKでFirestoreに直接アクセス
//   2. 通知が有効なユーザー全員を取得
//   3. 各ユーザーの直近の会話・要約・長期記憶を取得
//   4. Gemini APIに「通知すべきか」を判定させる
//   5. 通知が必要と判断された場合のみ、FCMでプッシュ通知を送信
// ============================================================

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

// GitHub Secrets から環境変数として受け取る
const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('[HumanAI] 必要な環境変数が設定されていません。')
  console.error('FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY を')
  console.error('GitHub Secrets に登録してください。')
  process.exit(1)
}

// Firebase Admin SDK を初期化（サービスアカウントで認証）
initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    // GitHub Secrets に貼り付けると \n がエスケープされる場合があるため置換する
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
})

const db = getFirestore()
const messaging = getMessaging()

// 通知の連投を避けるための最小間隔（ミリ秒）
const MIN_NOTIFICATION_INTERVAL_MS = 3 * 60 * 60 * 1000 // 3時間

// ============================================================
// メイン処理
// ============================================================
async function main() {
  console.log('[HumanAI] 通知チェック開始')
  let processedCount = 0
  let notifiedCount = 0

  const usersSnap = await db.collection('users').get()

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id
    try {
      const notified = await processUser(uid)
      processedCount++
      if (notified) notifiedCount++
    } catch (e) {
      console.error(`[HumanAI] ユーザー ${uid} の通知判定でエラー:`, e)
    }
  }

  console.log(`[HumanAI] 完了: ${processedCount}人チェック、${notifiedCount}人に通知`)
}

// ============================================================
// ユーザーごとの通知判定
// ============================================================
async function processUser(uid) {
  // 通知設定が有効かチェック
  const settingsSnap = await db.doc(`users/${uid}/settings/general`).get()
  const settings = settingsSnap.exists ? settingsSnap.data() : null
  if (!settings?.notificationsEnabled) return false

  // 直近通知からの間隔チェック（依存を促さないための頻度制限）
  const notifStateSnap = await db.doc(`users/${uid}/memory/notificationState`).get()
  const notifState = notifStateSnap.exists ? notifStateSnap.data() : {}
  const lastSentAt = notifState.lastSentAt?.toMillis?.() || 0
  if (Date.now() - lastSentAt < MIN_NOTIFICATION_INTERVAL_MS) return false

  // FCMトークン取得
  const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get()
  const tokens = tokensSnap.docs.map(d => d.id)
  if (tokens.length === 0) return false

  // 直近セッション・要約・長期記憶を取得
  const sessionsSnap = await db
    .collection(`users/${uid}/sessions`)
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()
  if (sessionsSnap.empty) return false
  const latestSession = sessionsSnap.docs[0]

  const messagesSnap = await db
    .collection(`users/${uid}/sessions/${latestSession.id}/messages`)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get()
  const recentMessages = messagesSnap.docs.map(d => d.data()).reverse()
  if (recentMessages.length === 0) return false

  const profileSnap = await db.doc(`users/${uid}/memory/profile`).get()
  const profileFacts = profileSnap.exists ? (profileSnap.data().facts || []) : []

  // サーバー用Gemini APIキーを取得
  const serverKeySnap = await db.doc(`users/${uid}/settings/serverKey`).get()
  const serverApiKey = serverKeySnap.exists ? serverKeySnap.data().geminiApiKey : null

  // 通知要否をGeminiで判定
  const decision = await decideNotification({
    recentMessages,
    summary: latestSession.data().summary || '',
    profileFacts,
    apiKey: serverApiKey,
  })

  if (!decision.shouldNotify) return false

  // FCMでプッシュ通知を送信
  await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: 'HumanAI',
      body: decision.message,
    },
    webpush: {
      fcmOptions: { link: '/' },
    },
  })

  // 送信記録をFirestoreに保存
  await db.doc(`users/${uid}/memory/notificationState`).set(
    {
      lastSentAt: FieldValue.serverTimestamp(),
      lastReason: decision.reason,
    },
    { merge: true }
  )

  console.log(`[HumanAI] ユーザー ${uid} に通知送信: ${decision.message}`)
  return true
}

// ============================================================
// HumanAI Engine（サーバー側）: 通知要否をGeminiに判定させる
// ============================================================
async function decideNotification({ recentMessages, summary, profileFacts, apiKey }) {
  if (!apiKey) {
    return { shouldNotify: false, message: '', reason: 'no-server-api-key' }
  }

  const transcript = recentMessages
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.text}`)
    .join('\n')
  const profileText = profileFacts.length
    ? profileFacts.map(f => `- ${f}`).join('\n')
    : 'なし'

  const prompt = `
あなたはHumanAIというアプリの「自律通知判定エンジン」です。
以下の情報をもとに、ユーザーに今プッシュ通知を送るべきか判定してください。

# 直近の会話
${transcript}

# 会話の要約
${summary || 'なし'}

# ユーザーに関する既知情報
${profileText}

# 判定基準
- 会話の中でユーザーが「約束」「予定」「締め切り」などに言及しており、
  今リマインドすることが自然かつ有益な場合は通知してよい
- 会話が完結しており、フォローアップの声掛けが自然に響く文脈がある場合は通知してよい
- 上記に該当しない場合、または通知が「AIに依存させる」「不自然に会話を継続させようとする」
  ものになる場合は通知すべきではない
- 判断に迷う場合は通知しない方を選ぶこと（過剰な通知はユーザー体験を損なうため）

# 出力形式
以下のJSON形式のみを出力してください。前置きや説明文は一切不要です。
{"shouldNotify": true または false, "message": "通知するなら30文字程度の自然な日本語メッセージ。しないなら空文字", "reason": "内部判定理由（20文字程度、ユーザーには見せない）"}
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

  if (!res.ok) {
    console.error('[HumanAI] 通知判定APIエラー:', await res.text())
    return { shouldNotify: false, message: '', reason: 'api-error' }
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      shouldNotify: !!parsed.shouldNotify,
      message: parsed.message || '',
      reason: parsed.reason || '',
    }
  } catch (e) {
    console.error('[HumanAI] 通知判定結果のパースに失敗:', text)
    return { shouldNotify: false, message: '', reason: 'parse-error' }
  }
}

// 実行
main().catch(e => {
  console.error('[HumanAI] 予期しないエラー:', e)
  process.exit(1)
})
