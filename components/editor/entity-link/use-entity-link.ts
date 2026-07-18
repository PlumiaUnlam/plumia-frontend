import { useCallback } from "react"
import { useRouter } from "next/navigation"

type UseEntityLinkOptions = {
  projectId: string
}

/** Navega a la página de worldbuilding con la entidad indicada seleccionada. */
export function useEntityLink({ projectId }: UseEntityLinkOptions) {
  const router = useRouter()

  const goToEntity = useCallback(
    (entityId: string) => {
      router.push(
        `/projects/${encodeURIComponent(projectId)}/worldbuilding?entityId=${encodeURIComponent(entityId)}`,
      )
    },
    [router, projectId],
  )

  return { goToEntity }
}
