import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Conserva la composición con los menús y describe el botón también al enfocarlo. */
export function ToolbarButton({ title, ...props }: ComponentProps<typeof Button>) {
  if (!title) return <Button {...props} />

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...props} />
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>{title}</TooltipContent>
    </Tooltip>
  )
}
