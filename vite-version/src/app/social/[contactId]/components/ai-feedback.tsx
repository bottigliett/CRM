"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"

/**
 * Thumbs-up / thumbs-down rating for AI-generated output.
 * Sends feedback to the backend so the AI learns the user's preferences over time.
 */
export function AiFeedback({
  kind,
  content,
  contactId,
  className = "",
}: {
  kind: string
  content: string
  contactId?: number
  className?: string
}) {
  const [rated, setRated] = useState<1 | -1 | null>(null)
  const [sending, setSending] = useState(false)

  const rate = async (rating: 1 | -1) => {
    if (sending) return
    setRated(rating)
    setSending(true)
    try {
      await socialAPI.aiFeedback({ kind, rating, content, ...(contactId ? { contactId } : {}) })
      toast.success(rating === 1 ? "Grazie! Feedback registrato 👍" : "Grazie! Ne terrò conto 👎")
    } catch {
      // revert on failure
      setRated(null)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`} title="Valuta la qualità dell'AI">
      <button
        type="button"
        onClick={() => rate(1)}
        className={`p-1 rounded-md transition-colors ${rated === 1 ? "text-green-600 bg-green-50 dark:bg-green-950" : "text-muted-foreground hover:text-green-600 hover:bg-muted"}`}
        aria-label="Mi piace"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => rate(-1)}
        className={`p-1 rounded-md transition-colors ${rated === -1 ? "text-red-600 bg-red-50 dark:bg-red-950" : "text-muted-foreground hover:text-red-600 hover:bg-muted"}`}
        aria-label="Non mi piace"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
