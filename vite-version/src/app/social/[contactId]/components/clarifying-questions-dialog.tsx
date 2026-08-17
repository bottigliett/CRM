"use client"

import { useEffect, useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Sparkles, HelpCircle, Send } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"

/**
 * Two-step AI briefing: asks the AI what it needs to know, collects the user's answers,
 * then calls onGenerate(answersText) to produce the content.
 */
export function ClarifyingQuestionsDialog({
  open,
  onOpenChange,
  contactId,
  mode = "ideas",
  title = "Briefing con Mismo AI",
  onGenerate,
  generateLabel = "Genera",
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  contactId: number
  mode?: "ideas" | "calendar" | "shoot"
  title?: string
  onGenerate: (answers: string) => Promise<void> | void
  generateLabel?: string
}) {
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!open) return
    setQuestions([])
    setAnswers({})
    setLoadingQuestions(true)
    socialAPI.aiClarifyingQuestions(contactId, mode)
      .then(r => setQuestions(r.data.questions || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoadingQuestions(false))
  }, [open, contactId, mode])

  const buildAnswers = () =>
    questions.map((q, i) => `${q}\n→ ${answers[i]?.trim() || "(non specificato)"}`).join("\n")

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await onGenerate(buildAnswers())
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><HelpCircle className="h-4 w-4 text-primary" /> {title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loadingQuestions ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nessuna domanda necessaria. Procedi pure.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Rispondi per aiutare l'AI a capire meglio cosa vuoi. Puoi saltare le domande che non ti interessano.</p>
              {questions.map((q, i) => (
                <div key={i} className="space-y-1.5">
                  <p className="text-sm font-medium flex items-start gap-2">
                    <span className="text-primary font-semibold">{i + 1}.</span>{q}
                  </p>
                  <Textarea
                    value={answers[i] || ""}
                    onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))}
                    placeholder="La tua risposta..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleGenerate} disabled={generating || loadingQuestions}>
            {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            {generateLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
