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
  const isFormDataBody =
    typeof FormData !== "undefined" && options.body instanceof FormData
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${token}`,
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorText = await response.text()
    try {
      const parsed = JSON.parse(errorText)
      if (parsed.message) errorText = parsed.message
    } catch {}
    throw new Error(errorText)
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T
  }

  const responseText = await response.text()
  if (!responseText.trim()) {
    return undefined as T
  }

  return JSON.parse(responseText) as T
}

export const api = {
  get: <T>(path: string, options: Pick<RequestInit, "signal"> = {}) =>
    request<T>(path, options),
  post: <T>(
    path: string,
    body: unknown,
    options: Pick<RequestInit, "signal"> = {},
  ) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),
  postFormData: <T>(
    path: string,
    body: FormData,
    options: Pick<RequestInit, "signal"> = {},
  ) => request<T>(path, { method: "POST", body, ...options }),
  patch: <T>(
    path: string,
    body: unknown,
    options: Pick<RequestInit, "signal"> = {},
  ) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      ...options,
    }),
  delete: <T>(path: string, options: Pick<RequestInit, "signal"> = {}) =>
    request<T>(path, { method: "DELETE", ...options }),
}
