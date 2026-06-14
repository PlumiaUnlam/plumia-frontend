"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onIdTokenChanged,
  type User as FirebaseUser,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

export interface BackendUser {
  id: string
  name: string
  lastname: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: "AUTHOR" | "READER"
  plan: "FREE" | "PRO"
  createdAt: string
  updatedAt: string
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  user: BackendUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<BackendUser | null>(null)
  const [loading, setLoading] = useState(true)

  const syncBackendUser = async (idToken: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })
      if (!res.ok) return
      const data = await res.json()
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        const token = await fbUser.getIdToken()
        document.cookie = `__session=${token}; path=/; max-age=604800; SameSite=Lax`
        await syncBackendUser(token)
      } else {
        document.cookie = "__session=; path=/; max-age=0"
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const token = await cred.user.getIdToken()
    await syncBackendUser(token)
  }

  const register = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const token = await cred.user.getIdToken()
    await syncBackendUser(token)
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
  }

  const getIdToken = async (): Promise<string | null> => {
    if (!firebaseUser) return null
    return firebaseUser.getIdToken()
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, login, register, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
