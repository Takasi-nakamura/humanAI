// HumanAI - Gemini API クライアント
// モデル名はユーザー指定のとおり固定（3.6 Flash / 3.5 Flash Lite）。
// 将来的にモデル名が変わった場合は MODEL_MAP を書き換えるだけで対応可能。

export const MODEL_MAP = {
  '3.6-flash': {
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    description: 'バランス型。標準の会話品質と速度。',
  },
  '3.5-flash-lite': {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite',
    description: '軽量・高速。短い応答やライトな会話向け。',
  },
}

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Gemini API へリクエストを送る低レベル関数
 * @param {Object} opts
 * @param {string} opts.apiKey - ユーザーのGemini APIキー（復号済み）
 * @param {string} opts.modelId - 使用するモデルID
 * @param {Array} opts.contents - Gemini形式の会話履歴
 * @param {string} [opts.systemInstruction] - システムプロンプト
 * @param {number} [opts.temperature]
 * @param {number} [opts.maxOutputTokens]
 * @param {AbortSignal} [opts.signal]
 */
export async function callGemini({
  apiKey,
  modelId,
  contents,
  systemInstruction,
  temperature = 0.9,
  maxOutputTokens = 2048,
  signal,
}) {
  if (!apiKey) {
    throw new Error('APIキーが設定されていません。設定画面から登録してください。')
  }

  const url = `${API_BASE}/${modelId}:generateContent?key=${apiKey}`

  const body = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  }

  if (systemInstruction) {
    body.systemInstruction = {
      role: 'system',
      parts: [{ text: systemInstruction }],
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    let message = `Gemini APIエラー (HTTP ${res.status})`
    try {
      const errJson = await res.json()
      if (errJson?.error?.message) message = errJson.error.message
    } catch {
      // JSON以外のエラー本文は無視
    }
    throw new Error(message)
  }

  const data = await res.json()
  const candidate = data?.candidates?.[0]
  const text = candidate?.parts?.[0]?.text
    ?? candidate?.content?.parts?.map(p => p.text).filter(Boolean).join('\n')
    ?? ''

  return {
    text,
    raw: data,
    finishReason: candidate?.finishReason,
  }
}

/**
 * アプリ内のメッセージ配列（{role, text, attachments}）を
 * Gemini API の contents 形式に変換する
 */
export function toGeminiContents(messages) {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => {
      const parts = []
      if (m.text) parts.push({ text: m.text })
      if (m.attachments?.length) {
        for (const att of m.attachments) {
          if (att.inlineData) {
            parts.push({ inlineData: { mimeType: att.mimeType, data: att.inlineData } })
          }
        }
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: parts.length ? parts : [{ text: '' }],
      }
    })
}
