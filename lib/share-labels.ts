import type { SharePermission, ShareSummary } from "@/types/sharing"

export const permissionLabels: Record<SharePermission, string> = {
  READ_ONLY: "Solo lectura",
  COMMENT: "Puede comentar",
}

export function getShareStatusLabel(status: ShareSummary["status"]) {
  switch (status) {
    case "PENDING":
      return "Pendiente"
    case "ACCEPTED":
      return "Aceptada"
    case "REVOKED":
      return "Revocada"
  }
}
