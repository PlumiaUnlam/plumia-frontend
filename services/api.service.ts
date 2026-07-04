import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"
const DEV_USER_EMAIL = "user@example.com"
const DEV_USER_PASSWORD = "user1234"

async function getToken(): Promise<string> {
  if (!auth.currentUser) {
    await signInWithEmailAndPassword(auth, DEV_USER_EMAIL, DEV_USER_PASSWORD)
  }

  const token = await auth.currentUser?.getIdToken()

  if (!token) {
    throw new Error("No se pudo obtener el token de Firebase")
  }

  return token
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${token}`,
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  console.log(`${path} status:`, response.status)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error ${response.status}: ${errorText}`)
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T
  }

  const data = (await response.json()) as T
  console.log(`${path} response:`, data)

  return data
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
