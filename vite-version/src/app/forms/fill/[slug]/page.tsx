"use client"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react"
import { formsAPI, type FormSchema, type FormField } from "@/lib/forms-api"

export default function FormFillPage() {
  const { slug } = useParams()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [page, setPage] = useState(0)
  const [review, setReview] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!slug) return
    formsAPI.getPublic(slug)
      .then(r => { setName(r.data.name); setDescription(r.data.description || ""); setSchema(r.data.schema) })
      .catch(() => setError("Form non trovato"))
  }, [slug])

  if (error) {
    return <div className="min-h-dvh flex items-center justify-center p-6 text-center text-muted-foreground">{error}</div>
  }
  if (!schema) {
    return <div className="min-h-dvh flex items-center justify-center p-6 text-muted-foreground">Caricamento…</div>
  }

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
      const condFilled = !!v && String(v).trim() !== ''
      if (f.requiredIf.operator === 'filled' && condFilled) return true
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
    if (!slug) return
    try {
      await formsAPI.submit(slug, answers)
      setDone(true)
    } catch (e: any) { setError(e.message) }
  }

  if (done) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500" />
          <h1 className="text-2xl font-bold">Form inviato</h1>
          <p className="text-muted-foreground">Grazie! La tua risposta è stata registrata correttamente.</p>
        </div>
      </div>
    )
  }

  const setAnswer = (id: string, v: any) => setAnswers(a => ({ ...a, [id]: v }))

  const renderField = (f: FormField) => {
    const v = answers[f.id]
    const req = isFieldRequired(f)
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

  return (
    <div className="min-h-dvh bg-background">
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
              <Button onClick={submit} className="flex-1">Invia</Button>
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
              const req = isFieldRequired(f)
              return (
                <div key={f.id} className="space-y-2">
                  <Label>{f.label}{req && <span className="text-destructive"> *</span>}</Label>
                  {renderField(f)}
                </div>
              )
            })}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-4">
              {page > 0 && <Button variant="outline" onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4 mr-1" /> Indietro</Button>}
              <Button onClick={next} className="flex-1">
                {page < pages.length - 1 ? 'Avanti' : (useReview ? 'Riepilogo' : 'Invia')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
