"use client"

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

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

class BackendSyncError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "BackendSyncError"
  }
}

async function requestBackendUser(idToken: string): Promise<BackendUser> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new BackendSyncError(
      response.status,
      `Failed to sync user with backend (${response.status}): ${errorText}`,
    )
  }

  const data = (await response.json()) as { user: BackendUser }
  return data.user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<BackendUser | null>(null)
  const [loading, setLoading] = useState(true)
  const syncInFlightRef = useRef<Promise<void> | null>(null)

  const syncBackendUser = useCallback((fbUser: FirebaseUser) => {
    if (syncInFlightRef.current) return syncInFlightRef.current

    const sync = (async () => {
      let token = await fbUser.getIdToken()
      let backendUser: BackendUser

      try {
        backendUser = await requestBackendUser(token)
      } catch (error) {
        if (!(error instanceof BackendSyncError) || error.status !== 401) {
          throw error
        }

        token = await fbUser.getIdToken(true)
        backendUser = await requestBackendUser(token)
      }

      document.cookie = `__session=${token}; path=/; max-age=604800; SameSite=Lax`
      setUser(backendUser)
    })().finally(() => {
      syncInFlightRef.current = null
    })

    syncInFlightRef.current = sync
    return sync
  }, [])

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)

      try {
        if (fbUser) {
          await syncBackendUser(fbUser)
        } else {
          document.cookie = "__session=; path=/; max-age=0"
          setUser(null)
        }
      } catch (error) {
        console.error("Error syncing Firebase user with backend:", error)
        document.cookie = "__session=; path=/; max-age=0"
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [syncBackendUser])

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    await syncBackendUser(credential.user)
  }

  const register = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    )
    await syncBackendUser(credential.user)
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
  }

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) {
      return null
    }

    return auth.currentUser.getIdToken()
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, user, loading, login, register, logout, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
