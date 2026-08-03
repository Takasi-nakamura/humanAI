// HumanAI - 自律通知システム（クライアント側）
// 実際の「通知すべきか」の判定はバックエンド(Cloud Functions)側の
// HumanAI Engineが会話履歴と長期記憶を見て自律的に行う。
// フロント側の役割は、通知の許可取得とFCMトークンの登録のみ。
import { useCallback, useState } from 'react'
import { getToken } from 'firebase/messaging'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getMessagingIfSupported, VAPID_KEY, db } from '../lib/firebase'

export function useNotifications(uid) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState(null)

  const enableNotifications = useCallback(async () => {
    setError(null)
    if (typeof Notification === 'undefined') {
      setError('この環境は通知に対応していません。')
      return false
    }
    setRegistering(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setError('通知が許可されませんでした。ブラウザの設定から許可してください。')
        return false
      }

      const messaging = await getMessagingIfSupported()
      if (!messaging) {
        setError('この環境はプッシュ通知に対応していません。')
        return false
      }

      const registration = await navigator.serviceWorker.ready
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      })

      if (!token) {
        setError('通知トークンの取得に失敗しました。')
        return false
      }

      if (uid) {
        // Cloud Functions側がこのトークン一覧を参照して通知を送信する
        await setDoc(doc(db, 'users', uid, 'fcmTokens', token), {
          token,
          createdAt: serverTimestamp(),
          userAgent: navigator.userAgent,
        })
        await setDoc(doc(db, 'users', uid, 'settings', 'general'),
          { notificationsEnabled: true }, { merge: true })
      }

      return true
    } catch (e) {
      console.error(e)
      setError('通知の設定中にエラーが発生しました。')
      return false
    } finally {
      setRegistering(false)
    }
  }, [uid])

  return { permission, registering, error, enableNotifications }
}
