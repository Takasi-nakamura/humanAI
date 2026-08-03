// HumanAI - Firebase Cloud Messaging Service Worker
// バックグラウンド（ブラウザ非アクティブ時）にプッシュ通知を受信するためのファイル。
// vite-plugin-pwa の自動生成SWとは別に、ルート直下に静的配置する必要がある。
//
// 【重要】下記の firebaseConfig は、.env の値をビルド時に埋め込めないため
// (Service Workerはモジュールバンドル対象外)、README の手順に従い
// 実際の値に書き換えてください。

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'HumanAI'
  const options = {
    body: payload.notification?.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: payload.data,
  }
  self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow('./')
    })
  )
})
