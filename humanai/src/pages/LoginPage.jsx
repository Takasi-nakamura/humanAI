import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { Sparkles, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) {
    navigate('/chat')
    return null
  }

  const handleGoogle = async () => {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle()
      navigate('/chat')
    } catch (e) {
      setError('Googleログインに失敗しました。もう一度お試しください。')
    } finally {
      setBusy(false)
    }
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password)
      }
      navigate('/chat')
    } catch (e) {
      setError(mode === 'signin'
        ? 'ログインに失敗しました。メールアドレスとパスワードをご確認ください。'
        : 'アカウント作成に失敗しました。パスワードは6文字以上で入力してください。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-surface-dark px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-floating mb-4">
            <Sparkles className="text-white" size={26} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">HumanAI</h1>
          <p className="text-sm text-gray-400 mt-1">人間っぽいAI、はじめましょう</p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 border border-surface-border dark:border-surface-darkborder
                     rounded-xl py-3 font-medium hover:bg-surface-soft dark:hover:bg-surface-darksoft transition
                     disabled:opacity-50"
        >
          <GoogleIcon />
          Googleでログイン
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-surface-border dark:bg-surface-darkborder flex-1" />
          <span className="text-xs text-gray-400">または</span>
          <div className="h-px bg-surface-border dark:bg-surface-darkborder flex-1" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              required
              placeholder="メールアドレス"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-3 rounded-xl border border-surface-border dark:border-surface-darkborder
                         bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-300 text-sm"
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              required
              placeholder="パスワード"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-3 rounded-xl border border-surface-border dark:border-surface-darkborder
                         bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-300 text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition disabled:opacity-50"
          >
            {mode === 'signin' ? 'ログイン' : 'アカウント作成'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          {mode === 'signin' ? 'アカウントをお持ちでないですか？' : 'すでにアカウントをお持ちですか？'}{' '}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-brand-500 font-medium"
          >
            {mode === 'signin' ? '新規登録' : 'ログイン'}
          </button>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2 1.4-4.6 2.2-7.7 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.6C41.5 36.4 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  )
}
