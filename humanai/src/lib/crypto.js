// HumanAI - APIキー暗号化ユーティリティ
// ブラウザのlocalStorageにAPIキーを平文で置かないよう、
// ユーザーのUID（＋固定ソルト）から導出した鍵でAES暗号化して保存する。
// ※完全なサーバーサイド秘匿ではないが、ローカル保存の最低限のセキュリティ対策として実装。
import CryptoJS from 'crypto-js'

const APP_SALT = 'humanai-static-salt-v1'

function deriveKey(uid) {
  return CryptoJS.SHA256(`${uid}:${APP_SALT}`).toString()
}

export function encryptApiKey(plainText, uid) {
  if (!plainText) return ''
  const key = deriveKey(uid || 'local-guest')
  return CryptoJS.AES.encrypt(plainText, key).toString()
}

export function decryptApiKey(cipherText, uid) {
  if (!cipherText) return ''
  try {
    const key = deriveKey(uid || 'local-guest')
    const bytes = CryptoJS.AES.decrypt(cipherText, key)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch (e) {
    console.error('APIキーの復号に失敗しました:', e)
    return ''
  }
}
