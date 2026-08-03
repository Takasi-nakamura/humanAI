// HumanAI - 音声読み上げ（Web Speech API）
// メッセージ本文を日本語音声で読み上げる小機能。
// Markdown記法をある程度除去してから読み上げる。

function stripMarkdownForSpeech(text) {
  return text
    .replace(/```[\s\S]*?```/g, 'コードブロックを省略します。')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    .replace(/[*_#>~-]/g, '')
    .trim()
}

let currentUtterance = null

export function speakText(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false
  window.speechSynthesis.cancel()

  const cleaned = stripMarkdownForSpeech(text)
  if (!cleaned) return false

  const utterance = new SpeechSynthesisUtterance(cleaned)
  utterance.lang = 'ja-JP'
  utterance.rate = 1.0
  utterance.pitch = 1.0

  currentUtterance = utterance
  window.speechSynthesis.speak(utterance)
  return true
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  currentUtterance = null
}

export function isSpeechSupported() {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}
