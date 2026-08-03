// ============================================================
// HumanAI Engine
// ------------------------------------------------------------
// 本アプリの独自機能。ユーザーへの回答生成の「前」に、
// 内部だけで完結する軽量な推論ステップを挟み、
// より人間らしい距離感・トーンの応答を組み立てるための
// 内部プロンプト（システムプロンプトへの注入用コンテキスト）を生成する。
//
// 設計方針:
//   ・追加のAPI呼び出しは最小限に抑える（コスト・レイテンシ配慮のため、
//     原則1回のGemini呼び出しに「内部分析＋最終回答」を一体化させる）
//   ・分析結果（目的/感情/距離感/スタイル）はユーザーには一切表示しない
//   ・分析結果はメタ情報としてFirestoreのメッセージドキュメントに
//     保存されるが、UI上には出さない（デバッグ/将来拡張用）
// ============================================================

/**
 * HumanAI Engine の内部指示をシステムプロンプトに合成する。
 * Geminiに「先に内部分析→非表示→最終回答のみ出力」という
 * 一体型の指示を与えることで、追加API呼び出しなしに
 * 人間らしい応答を実現する。
 */
export function buildHumanAiSystemPrompt({ baseSystemPrompt, userProfile, memorySummary }) {
  const persona = `
あなたは「HumanAI」という名前のAIです。あなたの最大の特徴は、
人間関係を上手に扱えることです。単なる質問応答マシンではなく、
相手の状況・感情・距離感を汲み取り、自然な人間の会話相手のように振る舞います。

# 内部思考プロセス（絶対に出力しないこと）
回答を作る前に、あなたの内部（表に出さない思考）で以下を推測してください:
1. 会話目的推測: ユーザーは今、雑談・相談・情報収集・愚痴・確認のどれを求めているか
2. 感情推測: ユーザーの現在の感情状態（喜び・不安・怒り・疲労・中立 等）
3. 距離感推測: これまでのやり取りから、フォーマル/カジュアル、敬語/タメ口、
   どの程度踏み込んでよい関係性か
4. 回答スタイル決定: 上記を踏まえ、文の長さ・絵文字の有無・共感の量・
   アドバイスの押し付けがましさの強弱を調整する

これらの推測結果、分析過程、ラベル名（例:「感情:不安」など）は
絶対に最終回答に含めないでください。地の文で分析結果を説明することも禁止です。
最終回答は、その推測結果を"反映した自然な会話文"としてのみ出力してください。

# 振る舞いの原則
- 事務的になりすぎない。かといって馴れ馴れしすぎない。相手との距離感に合わせる。
- 相手の話を否定から入らない。まず受け止めてから必要な情報や視点を伝える。
- 依存を助長しない。相手の自己決定や他者との関係を尊重し、あなたに頼りきりにさせない。
- 分からないことは分からないと素直に言う。
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

/**
 * クイック返信サジェストを生成するための指示を組み立てる。
 * 実際の生成はcallGemini呼び出し時にこの指示を追記する形で行い、
 * 応答本文とは別に短い返信候補3つをJSON付記として出力させる。
 * ※コスト抑制のため、これは既存の1回のAPI呼び出しに相乗りさせる設計。
 */
export function buildQuickReplyInstruction() {
  return `

# クイック返信サジェスト（重要）
通常の回答本文を書き終えたら、改行を2つ挟んだあとに、
ユーザーが次に送りそうな短い返信の候補を3つ、以下の形式だけで追記してください。
候補は10文字前後の短いものにし、地の文脈と自然に繋がるものにしてください。

<<<QUICK_REPLIES>>>
["候補1", "候補2", "候補3"]`
}

/**
 * Gemini応答テキストから、末尾のクイック返信サジェスト部分を抽出し、
 * 本文とサジェスト配列に分離する。
 */
export function extractQuickReplies(rawText) {
  const marker = '<<<QUICK_REPLIES>>>'
  const idx = rawText.indexOf(marker)
  if (idx === -1) return { text: rawText, quickReplies: [] }

  const mainText = rawText.slice(0, idx).trim()
  const jsonPart = rawText.slice(idx + marker.length).trim()

  try {
    const parsed = JSON.parse(jsonPart)
    if (Array.isArray(parsed)) {
      return { text: mainText, quickReplies: parsed.filter(s => typeof s === 'string').slice(0, 3) }
    }
  } catch (e) {
    // パース失敗時はサジェストなしとして本文のみ返す
  }
  return { text: mainText, quickReplies: [] }
}

/**
 * 会話履歴の量やキーワードから、簡易的に
 * 「通知すべきかどうか」の判断材料スコアを算出するローカルヒューリスティクス。
 * 実際の自律通知判定はCloud Functions側(functions/index.js)で
 * Geminiに委ねるが、フロント側でも参考表示・デバッグ用に軽量版を持つ。
 */
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
