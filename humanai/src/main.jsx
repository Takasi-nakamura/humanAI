import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './hooks/useAuth.jsx'
import { SettingsProvider } from './hooks/useSettings.jsx'
import './index.css'

// HashRouterを使用: GitHub Pagesなど静的ホスティングでも
// リロード時の404を起こさずルーティングできるようにするため
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
)
