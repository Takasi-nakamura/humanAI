// HumanAI - Firebase 初期化
// README の手順に従い、Firebase コンソールで取得した設定値を
// .env ファイルに記入してください（.env.example を参照）。
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// FCM (通知) はブラウザが対応している場合のみ初期化する
export async function getMessagingIfSupported() {
  try {
    const supported = await isSupported()
    if (!supported) return null
    return getMessaging(app)
  } catch (e) {
    console.warn('FCM未対応環境です:', e)
    return null
  }
}

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY
