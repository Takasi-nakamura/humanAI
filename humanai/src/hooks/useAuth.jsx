// HumanAI - 認証コンテキスト
import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut as fbSignOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
  const signInWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const signUpWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password)
  const signOut = () => fbSignOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthはAuthProviderの内部で使用してください')
  return ctx
}
