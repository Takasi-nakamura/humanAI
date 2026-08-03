// HumanAI - 入力バリデーション

export function validateChatInput(text) {
  if (!text || !text.trim()) {
    return { valid: false, message: 'メッセージを入力してください。' }
  }
  if (text.length > 8000) {
    return { valid: false, message: 'メッセージが長すぎます（上限8000文字）。' }
  }
  return { valid: true }
}

export function validateApiKey(key) {
  if (!key || !key.trim()) {
    return { valid: false, message: 'APIキーを入力してください。' }
  }
  // Gemini APIキーは概ね "AIza" から始まる39文字前後の文字列
  if (key.trim().length < 20) {
    return { valid: false, message: 'APIキーの形式が正しくないようです。もう一度確認してください。' }
  }
  return { valid: true }
}

export function validateSessionTitle(title) {
  if (!title || !title.trim()) {
    return { valid: false, message: 'タイトルを入力してください。' }
  }
  if (title.length > 100) {
    return { valid: false, message: 'タイトルは100文字以内にしてください。' }
  }
  return { valid: true }
}

export function validateTemperature(value) {
  const n = Number(value)
  if (Number.isNaN(n) || n < 0 || n > 2) {
    return { valid: false, message: 'Temperatureは0〜2の範囲で指定してください。' }
  }
  return { valid: true }
}

export function validateMaxTokens(value) {
  const n = Number(value)
  if (Number.isNaN(n) || n < 1 || n > 8192) {
    return { valid: false, message: 'Max Output Tokensは1〜8192の範囲で指定してください。' }
  }
  return { valid: true }
}
