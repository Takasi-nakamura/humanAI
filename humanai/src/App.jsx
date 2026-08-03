import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

function LoadingScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-surface-dark">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
        <p className="text-sm text-gray-400">読み込み中…</p>
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="/chat/:sessionId?" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}
