"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, CheckCircle2, ArrowLeft, Eye, Pencil, Link2 } from "lucide-react"
import type { FormSchema, FormField } from "@/lib/forms-api"

export function FormFillView({
  name,
  description,
  schema,
  preview = false,
  onBack,
  onSubmitted,
  onEditField,
  onConnectClick,
}: {
  name: string
  description: string
  schema: FormSchema
  preview?: boolean
  onBack?: () => void
  onSubmitted?: (answers: Record<string, any>) => Promise<void>
  onEditField?: (fieldId: string) => void
  onConnectClick?: (fieldId: string) => void
}) {
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [page, setPage] = useState(0)
  const [review, setReview] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const pages = schema.pages.length ? schema.pages : [{ title: "Form" }]
  const fields = schema.fields.filter(f => f.page === page)
  const useReview = schema.settings.reviewBeforeSubmit

  const isFieldVisible = (f: FormField): boolean => {
    if (!f.requiredIf) return true
    const v = answers[f.requiredIf.fieldId]
    return f.requiredIf.operator === 'filled' ? !!v && String(v).trim() !== '' : !v || String(v).trim() === ''
  }

  const isFieldRequired = (f: FormField): boolean => {
    if (!isFieldVisible(f)) return false
    if (f.required) return true
    if (f.requiredIf) {
      const v = answers[f.requiredIf.fieldId]
      if (f.requiredIf.operator === 'filled' && !!v && String(v).trim() !== '') return true
    }
    return false
  }

  const validatePage = (): boolean => {
    for (const f of fields) {
      if (isFieldRequired(f)) {
        const v = answers[f.id]
        if (v === undefined || v === null || String(v).trim() === '' || (Array.isArray(v) && v.length === 0)) {
          setError(`Compila il campo obbligatorio: "${f.label}"`)
          return false
        }
      }
    }
    setError("")
    return true
  }

  const next = () => {
    if (!validatePage()) return
    if (page < pages.length - 1) setPage(page + 1)
    else if (useReview) setReview(true)
    else submit()
  }

  const submit = async () => {
    if (preview) { setDone(true); return }
    if (onSubmitted) {
      try { await onSubmitted(answers); setDone(true) } catch (e: any) { setError(e.message) }
    }
  }

  if (done) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500" />
          <h1 className="text-2xl font-bold">{preview ? 'Fine anteprima' : 'Form inviato'}</h1>
          <p className="text-muted-foreground">{preview ? 'Questa è solo un\'anteprima: il form non è stato inviato.' : 'Grazie! La tua risposta è stata registrata correttamente.'}</p>
          {preview && onBack && <Button onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Torna al builder</Button>}
        </div>
      </div>
    )
  }

  const setAnswer = (id: string, v: any) => setAnswers(a => ({ ...a, [id]: v }))

  const renderField = (f: FormField) => {
    const v = answers[f.id]
    const base = "w-full"
    switch (f.type) {
      case 'textarea': return <Textarea value={v || ''} onChange={e => setAnswer(f.id, e.target.value)} placeholder={f.placeholder} className={base} />
      case 'select': return (
        <Select value={v || ''} onValueChange={val => setAnswer(f.id, val)}>
          <SelectTrigger className={base}><SelectValue placeholder={f.placeholder || 'Seleziona…'} /></SelectTrigger>
          <SelectContent>{(f.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      )
      case 'radio': return (
        <RadioGroup value={v || ''} onValueChange={val => setAnswer(f.id, val)} className="space-y-2">
          {(f.options || []).map(o => (
            <label key={o} className="flex items-center gap-2 text-sm"><RadioGroupItem value={o} />{o}</label>
          ))}
        </RadioGroup>
      )
      case 'checkbox': return (
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!v} onCheckedChange={c => setAnswer(f.id, !!c)} />{f.placeholder || 'Sì'}</label>
      )
      case 'date': return <Input type="date" value={v || ''} onChange={e => setAnswer(f.id, e.target.value)} className={base} />
      case 'number': return <Input type="number" value={v || ''} onChange={e => setAnswer(f.id, e.target.value)} placeholder={f.placeholder} className={base} />
      default: return <Input type={f.type === 'tel' ? 'tel' : f.type} value={v || ''} onChange={e => setAnswer(f.id, e.target.value)} placeholder={f.placeholder} className={base} />
    }
  }

  const primaryColor = schema.settings.style?.primaryColor
  const backgroundColor = schema.settings.style?.backgroundColor

  return (
    <div className="min-h-dvh" style={{ backgroundColor: backgroundColor || undefined }}>
      {preview && (
        <div className="border-b bg-muted/50">
          <div className="max-w-xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground"><Eye className="h-4 w-4" /> Anteprima del form</span>
            {onBack && <Button variant="ghost" size="sm" onClick={onBack} className="cursor-pointer"><ArrowLeft className="h-4 w-4 mr-1" /> Esci</Button>}
          </div>
        </div>
      )}
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{name}</h1>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>

        {review ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Riepilogo</h2>
            {schema.fields.map(f => (
              <div key={f.id} className="border-b pb-3">
                <div className="text-sm text-muted-foreground">{f.label}</div>
                <div className="font-medium whitespace-pre-wrap">{Array.isArray(answers[f.id]) ? answers[f.id].join(', ') : (answers[f.id] || '—')}</div>
              </div>
            ))}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setReview(false)}><ChevronLeft className="h-4 w-4 mr-1" /> Indietro</Button>
              <Button onClick={submit} className="flex-1" style={primaryColor ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}>{preview ? 'Concludi anteprima' : 'Invia'}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {pages.length > 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{page + 1}</span> / {pages.length}
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-foreground" style={{ width: `${((page + 1) / pages.length) * 100}%` }} /></div>
              </div>
            )}

            {fields.map(f => {
              if (!isFieldVisible(f)) return null
              if (f.type === 'spacer') {
                return <div key={f.id} style={{ height: f.spacerHeight || 24 }} className="group/fill relative">
                  {onEditField && (
                    <button onClick={() => onEditField(f.id)} className="absolute -top-1 right-0 opacity-0 group-hover/fill:opacity-100 text-muted-foreground hover:text-foreground cursor-pointer" title="Modifica spazio"><Pencil className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              }
              const req = isFieldRequired(f)
              return (
                <div key={f.id} className="space-y-2 group/fill" title={f.hover || undefined}>
                  <div className="flex items-center gap-2">
                    <Label>{f.label}{req && <span className="text-destructive"> *</span>}</Label>
                    {onEditField && (
                      <button
                        onClick={() => onEditField(f.id)}
                        className="opacity-0 group-hover/fill:opacity-100 transition-opacity text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Modifica campo"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onConnectClick && (
                      <button
                        onClick={() => onConnectClick(f.id)}
                        className="opacity-0 group-hover/fill:opacity-100 transition-opacity text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Collega"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {f.subtitle && <p className="text-sm text-muted-foreground -mt-1">{f.subtitle}</p>}
                  {renderField(f)}
                  {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
                </div>
              )
            })}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-4">
              {page > 0 && <Button variant="outline" onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4 mr-1" /> Indietro</Button>}
              <Button onClick={next} className="flex-1" style={primaryColor ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}>
                {page < pages.length - 1 ? 'Avanti' : (useReview ? 'Riepilogo' : (preview ? 'Concludi anteprima' : 'Invia'))}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
