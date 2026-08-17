"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, AlertTriangle, Check, Wand2 } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"
import { AiFeedback } from "./ai-feedback"

const QUICK_FEEDBACK = [
  "Tono più formale",
  "Tono più caldo/amichevole",
  "Più breve e incisivo",
  "Più chiaro, meno giri di parole",
  "Aggiungi call-to-action",
  "Troppo promozionale, più autentico",
]

export function ReviewDialog({
  open,
  onOpenChange,
  contactId,
  content,
  caption,
  onApply,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  contactId: number
  content: string
  caption?: string
  onApply: (rewritten: { content: string; caption: string; hashtags: string[] }) => void
}) {
  const [instruction, setInstruction] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ issues: string[]; rewritten: { content: string; caption: string; hashtags: string[] } } | null>(null)

  const handleReview = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await socialAPI.aiReview({ contactId, content, caption: caption || "", instruction: instruction.trim() })
      setResult(res.data)
      // Persist the note as feedback so the AI learns this preference
      if (instruction.trim()) {
        socialAPI.aiFeedback({
          kind: "review",
          rating: -1,
          content: `${content}${caption ? " — " + caption : ""}`,
          contactId,
          note: instruction.trim(),
        }).catch(() => {})
      }
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const apply = () => {
    if (!result) return
    onApply(result.rewritten)
    toast.success("Contenuto riscritto applicato")
    onOpenChange(false)
    setResult(null)
    setInstruction("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> Revisione contenuto con Mismo AI</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Original */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Contenuto attuale</p>
            <p className="text-sm font-medium">{content}</p>
            {caption && <p className="text-xs text-muted-foreground line-clamp-3">{caption}</p>}
          </div>

          {/* Instruction */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Cosa non va? / Come vuoi migliorarlo?</p>
            <Textarea
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder='Es: "il tono è troppo freddo, rendilo più caldo" oppure "troppo lungo, taglia a metà"'
              rows={2}
              className="text-sm"
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_FEEDBACK.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInstruction(prev => prev ? `${prev}; ${q.toLowerCase()}` : q)}
                  className="px-2 py-1 rounded-md border text-xs hover:bg-muted transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={handleReview} disabled={loading || !content.trim()}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {loading ? "Revisionando..." : "Rivedi e riscrivi"}
          </Button>

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {result.issues?.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Problemi rilevati</p>
                  <ul className="space-y-1">
                    {result.issues.map((issue, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">▸</span>{issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg border border-primary/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-primary flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Versione riscritta</p>
                <p className="text-sm font-medium">{result.rewritten.content}</p>
                {result.rewritten.caption && <p className="text-xs text-muted-foreground">{result.rewritten.caption}</p>}
                {result.rewritten.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.rewritten.hashtags.map((h, i) => <Badge key={i} variant="secondary" className="text-[10px]">{h}</Badge>)}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <AiFeedback
                  kind="review"
                  content={`${result.rewritten.content}${result.rewritten.caption ? " — " + result.rewritten.caption : ""}`}
                  contactId={contactId}
                />
                <Button size="sm" onClick={apply}><Check className="h-3.5 w-3.5 mr-1" /> Applica</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
