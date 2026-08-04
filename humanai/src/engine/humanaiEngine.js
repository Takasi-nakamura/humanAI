// ============================================================
// HumanAI Engine
// ============================================================

export function buildHumanAiSystemPrompt({ baseSystemPrompt, userProfile, memorySummary }) {
  // 現在時刻を注入（AIが時間を把握できるようにする）
  const now = new Date()
  const jst = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'long', hour: '2-digit', minute: '2-digit',
  }).format(now)

  const persona = `
あなたは「HumanAI」という名前のAIです。あなたの最大の特徴は、
人間関係を上手に扱えることです。単なる質問応答マシンではなく、
相手の状況・感情・距離感を汲み取り、自然な人間の会話相手のように振る舞います。

# 現在時刻（日本時間）
${jst}
時刻・曜日・日付に関する質問にはこの情報をもとに答えてください。

# 内部思考プロセス（絶対に出力しないこと）
回答を作る前に、あなたの内部（表に出さない思考）で以下を推測してください:
1. 会話目的推測: ユーザーは今、雑談・相談・情報収集・愚痴・確認のどれを求めているか
2. 感情推測: ユーザーの現在の感情状態（喜び・不安・怒り・疲労・中立 等）
3. 距離感推測: これまでのやり取りから、フォーマル/カジュアル、敬語/タメ口、どの程度踏み込んでよい関係性か
4. 回答スタイル決定: 上記を踏まえ、文の長さ・絵文字の有無・共感の量・アドバイスの押し付けがましさの強弱を調整する

これらの推測結果は絶対に最終回答に含めないでください。

# 振る舞いの原則
- 事務的になりすぎない。かといって馴れ馴れしすぎない。相手との距離感に合わせる。
- 相手の話を否定から入らない。まず受け止めてから必要な情報や視点を伝える。
- 依存を助長しない。相手の自己決定や他者との関係を尊重し、あなたに頼りきりにさせない。
- 分からないことは分からないと素直に言う。

# 通知コマンドの処理
ユーザーが「通知送って」「通知して」「プッシュ通知」などと言った場合、
以下のJSON形式を回答の末尾に追記してください（本文の後、改行2つを挟む）。
メッセージはユーザーの意図を汲んだ自然な文言にしてください。
<<<NOTIFY>>>
{"message": "通知内容（30文字以内）"}

「テスト通知」「通知テスト」と言われた場合も同様に処理してください。
上記の場合を除き、<<<NOTIFY>>>は絶対に出力しないでください。
`.trim()

  const profileBlock = userProfile
    ? `\n\n# ユーザーに関する既知情報（長期記憶）\n${userProfile}`
    : ''

  const memoryBlock = memorySummary
    ? `\n\n# 直近の会話要約\n${memorySummary}`
    : ''

  const customBlock = baseSystemPrompt
    ? `\n\n# ユーザー設定のシステムプロンプト（優先して考慮）\n${baseSystemPrompt}`
    : ''

  return `${persona}${profileBlock}${memoryBlock}${customBlock}`
}

// QuickReplies廃止のため空実装
export function buildQuickReplyInstruction() { return '' }
export function extractQuickReplies(rawText) { return { text: rawText, quickReplies: [] } }

/**
 * AI応答からインライン検索指示を検出する
 * Gemini自身にWeb検索が必要かどうかを判断させる
 */
export function buildWebSearchInstruction() {
  return `
# Web検索について
もし回答に最新情報・リアルタイム情報（天気・ニュース・株価・スポーツ結果など）が必要な場合、
または知識の範囲外の具体的な事実確認が必要な場合は、回答の冒頭に以下を出力してください:
<<<SEARCH>>>
{"query": "検索クエリ（日本語OK）"}
その後、通常の回答を続けてください。
ただし、一般的な知識・概念の説明や、会話・感情サポートには検索不要です。`
}

/**
 * 通知コマンドを応答テキストから抽出する
 */
export function extractNotifyCommand(rawText) {
  const marker = '<<<NOTIFY>>>'
  const idx = rawText.indexOf(marker)
  if (idx === -1) return { text: rawText, notifyMessage: null }

  const mainText = rawText.slice(0, idx).trim()
  const jsonPart = rawText.slice(idx + marker.length).trim()

  try {
    const parsed = JSON.parse(jsonPart)
    return { text: mainText, notifyMessage: parsed.message || 'HumanAIからのお知らせ' }
  } catch {
    return { text: mainText, notifyMessage: 'HumanAIからのお知らせ' }
  }
}

export function quickHeuristicSignals(recentMessages) {
  const text = recentMessages.map(m => m.text || '').join('\n')
  const promiseKeywords = ['明日', '来週', '予定', '約束', '締め切り', '会議', 'テスト', '試験']
  const distressKeywords = ['しんどい', 'つらい', '不安', '疲れた', '無理']
  return {
    mentionsPromise: promiseKeywords.some(k => text.includes(k)),
    mentionsDistress: distressKeywords.some(k => text.includes(k)),
    messageCount: recentMessages.length,
  }
}
