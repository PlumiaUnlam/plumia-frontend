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
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
} from "firebase/auth"
import { usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"
import { messageForError } from "@/helpers/auth-errors"
import {
  ACCOUNT_DELETED_MESSAGE,
  api,
  ApiError,
  BackendSyncError,
  EmailNotVerifiedError,
  parseBackendMessage,
  SessionUnavailableError,
} from "@/services/api.service"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api"

// Worker de Cloudflare que dispara el mail de recuperación. Se expone como
// NEXT_PUBLIC_* porque el fetch corre en el browser y Next inlinea estas
// variables en el bundle en tiempo de build.
const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ?? "https://api-auth.plumia.com.ar"

// El formulario lee la propiedad `code` para armar mensajes (mismo contrato
// que usaba el SDK de Firebase). Devolvemos un Error con `code` en vez de un
// objeto plano para no perder el stack trace.
function authError(code: string) {
  const error = new Error(code) as Error & { code: string }
  error.code = code
  return error
}

// Llamada única al Worker de autenticación. `action` decide el flujo:
// "password-reset" o "verify-email". Siempre devuelve 200 { ok: true } aunque
// la cuenta no exista (el Worker no filtra qué correos están registrados),
// así que solo mapeamos fallos reales de red o de la API.
async function postToAuthWorker(body: Record<string, string>) {
  let response: Response

  try {
    response = await fetch(AUTH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch {
    // fetch solo rechaza por problema de red o CORS, no por status HTTP.
    throw authError("auth/network-request-failed")
  }

  if (response.status === 429) {
    throw authError("auth/too-many-requests")
  }

  if (!response.ok) {
    throw authError("auth/internal-error")
  }
}

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

export interface RegisterInput {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  user: BackendUser | null
  loading: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<{ needsVerification: boolean }>
  loginWithGoogle: () => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  resendVerificationEmail: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  // Seteado cuando la cuenta se creó bien pero el mail de verificación no se
  // pudo enviar: /verify-email lo muestra para que el usuario reintente.
  verificationEmailError: string | null
  clearVerificationEmailError: () => void
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  updateUserProfile: (profile: {
    displayName: string
    photoURL: string | null
  }) => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: "select_account" })

async function requestBackendUser(
  idToken: string,
  profile?: { firstName: string; lastName: string; username?: string },
): Promise<BackendUser> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, ...profile }),
  })

  if (!response.ok) {
    // Guardamos solo el `message` de NestJS: es lo único que matchea el
    // mapper de helpers/api-errors.ts. El cuerpo entero solo sirve en consola.
    throw new BackendSyncError(
      response.status,
      parseBackendMessage(await response.text()),
    )
  }

  const data = (await response.json()) as { user: BackendUser }
  return data.user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isSharedReader = pathname.startsWith("/shared/")
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<BackendUser | null>(null)
  const [loading, setLoading] = useState(true)
  // Seteado en register() si la cuenta se creó pero el mail de verificación no
  // salió: /verify-email lo muestra para que el usuario pueda reintentar.
  const [verificationEmailError, setVerificationEmailError] = useState<
    string | null
  >(null)
  const syncInFlightRef = useRef<Promise<void> | null>(null)
  // El listener de onIdTokenChanged dispara un sync sin perfil justo después de
  // createUserWithEmailAndPassword. Si ese sync gana la carrera, el usuario se
  // crea sin nombre ni username en el backend. Guardamos el perfil antes de
  // crear la cuenta para que cualquier sync que llegue lo incluya.
  const pendingProfileRef = useRef<{
    firstName: string
    lastName: string
    username: string
  } | null>(null)

  const syncBackendUser = useCallback(
    async (
      fbUser: FirebaseUser,
      profile?: { firstName: string; lastName: string; username?: string },
    ) => {
      if (syncInFlightRef.current) return syncInFlightRef.current

      const payload = profile ?? pendingProfileRef.current ?? undefined

      const sync = (async () => {
        let token = await fbUser.getIdToken()
        let backendUser: BackendUser

        try {
          backendUser = await requestBackendUser(token, payload)
        } catch (error) {
          if (!(error instanceof BackendSyncError) || error.status !== 401) {
            throw error
          }

          token = await fbUser.getIdToken(true)
          backendUser = await requestBackendUser(token, payload)
        }

        document.cookie = `__session=${token}; path=/; max-age=604800; SameSite=Lax`
        setUser(backendUser)
      })().finally(() => {
        syncInFlightRef.current = null
      })

      syncInFlightRef.current = sync
      return sync
    },
    [],
  )

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)

      try {
        if (fbUser) {
          if (isSharedReader) {
            setUser(null)
          } else {
            await syncBackendUser(fbUser)
          }
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
  }, [isSharedReader, syncBackendUser])

  // Devolvemos `needsVerification` en vez de lanzar: un correo sin verificar
  // no es un fallo de credenciales sino un estado que /verify-email sabe
  // resolver, y la sesión de Firebase ya quedó armada acá. El sync se hace igual
  // porque POST /auth/login es @Public() en el backend y no exige verificar.
  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password)

    try {
      await syncBackendUser(credential.user)
    } catch (error) {
      // La cuenta ya no existe de nuestro lado pero su identidad sigue viva en
      // Firebase: no hay sesión posible, así que se corta también la de
      // Firebase para no dejarla ahí reintentando un sync que siempre falla.
      if (
        error instanceof BackendSyncError &&
        error.backendMessage === ACCOUNT_DELETED_MESSAGE
      ) {
        await signOut(auth)
      }
      throw error
    }

    return { needsVerification: !credential.user.emailVerified }
  }

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider)
  }

  const register = async ({
    firstName,
    lastName,
    username,
    email,
    password,
  }: RegisterInput) => {
    pendingProfileRef.current = { firstName, lastName, username }

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      )

      await updateFirebaseProfile(credential.user, { displayName: username })

      // El envío del mail NO bloquea el registro: la cuenta ya existe en
      // Firebase, así que si el Worker falla guardamos el mensaje y /verify-email
      // lo muestra con un botón de reenvío. Solo propagamos errores de creación.
      try {
        await postToAuthWorker({
          email: credential.user.email ?? email,
          action: "verify-email",
        })
        setVerificationEmailError(null)
      } catch (error) {
        console.error("No se pudo enviar el mail de verificación:", error)
        setVerificationEmailError(messageForError(error))
      }

      // updateProfile no renueva el ID token: hay que forzar el refresco para
      // que el backend reciba los claims actualizados.
      await credential.user.getIdToken(true)

      await syncBackendUser(credential.user)
    } finally {
      pendingProfileRef.current = null
    }
  }

  const resendVerificationEmail = async () => {
    const currentUser = auth.currentUser

    if (!currentUser?.email) {
      throw new Error("No hay una sesión activa")
    }

    await postToAuthWorker({
      email: currentUser.email,
      action: "verify-email",
    })
    setVerificationEmailError(null)
  }

  const sendPasswordReset = async (email: string) => {
    await postToAuthWorker({ email, action: "password-reset" })
  }

  const clearVerificationEmailError = useCallback(() => {
    setVerificationEmailError(null)
  }, [])

  const refreshSession = useCallback(async () => {
    const currentUser = auth.currentUser

    if (!currentUser) {
      throw new Error("No hay una sesión activa")
    }

    await currentUser.getIdToken(true)
    await syncBackendUser(currentUser)
  }, [syncBackendUser])

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setVerificationEmailError(null)
  }

  // Supresión de la cuenta (Ley 25.326, art. 16): el backend borra el
  // contenido y anonimiza la fila; recién después se cierra la sesión local.
  const deleteAccount = async () => {
    try {
      await api.delete("/users/me")
    } catch (error) {
      // Quedarse adentro solo tiene sentido cuando sabemos que no se borró
      // nada: un 500 (falló la transacción), un correo sin verificar (el guard
      // corta antes de tocar la base) o un token que Firebase ni siquiera pudo
      // entregar (no llegó a haber request).
      //
      // Todo lo demás deja la cuenta borrada o en un estado que no se arregla
      // reintentando: el 502 confirmado, la fila que ya era tombstone, y sobre
      // todo un corte de red, donde no tenemos ninguna forma de saber si la
      // supresión llegó a completarse. Ahí cerrar la sesión es lo único que
      // evita dejarlo operando dentro de una cuenta que ya no existe.
      const noSeBorroNada =
        (error instanceof ApiError && error.status === 500) ||
        error instanceof EmailNotVerifiedError ||
        error instanceof SessionUnavailableError

      if (!noSeBorroNada) {
        await logout()
      }
      throw error
    }

    await logout()
  }

  const updateUserProfile = async ({
    displayName,
    photoURL,
  }: {
    displayName: string
    photoURL: string | null
  }) => {
    const currentUser = auth.currentUser

    if (!currentUser) {
      throw new Error("No hay una sesión activa")
    }

    await updateFirebaseProfile(currentUser, { displayName, photoURL })
    const updatedUser = await api.patch<BackendUser>("/users/me", {
      displayName,
      avatarUrl: photoURL,
    })
    setUser(updatedUser)
  }

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) {
      return null
    }

    return auth.currentUser.getIdToken()
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        login,
        loginWithGoogle,
        register,
        resendVerificationEmail,
        sendPasswordReset,
        verificationEmailError,
        clearVerificationEmailError,
        refreshSession,
        logout,
        deleteAccount,
        updateUserProfile,
        getIdToken,
      }}
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
