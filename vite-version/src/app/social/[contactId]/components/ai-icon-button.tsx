"use client"

import { Button } from "@/components/ui/button"
import { Loader2, Sparkles } from "lucide-react"

/**
 * Icon-only AI action button — sober outline style, no gradient.
 * Shows an AI symbol (Sparkles) and a tooltip; replaces the old gradient text buttons.
 */
export function AiIconButton({
  onClick,
  loading = false,
  title = "Mismo AI",
  className = "h-7 w-7",
  icon,
}: {
  onClick: () => void
  loading?: boolean
  title?: string
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className={`${className} shrink-0`}
      onClick={onClick}
      disabled={loading}
      title={title}
      aria-label={title}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (icon ?? <Sparkles className="h-4 w-4" />)}
    </Button>
  )
}
