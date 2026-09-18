"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { formsAPI, type Form } from "@/lib/forms-api"
import { FormFillView } from "@/app/forms/fill/components/form-fill-view"

export default function FormPreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return
    formsAPI.get(parseInt(id)).then(r => setForm(r.data)).catch(() => setError("Form non trovato"))
  }, [id])

  if (error) {
    return <div className="min-h-dvh flex items-center justify-center p-6 text-center text-muted-foreground">{error}</div>
  }
  if (!form) {
    return <div className="min-h-dvh flex items-center justify-center p-6 text-muted-foreground">Caricamento…</div>
  }

  return (
    <FormFillView
      name={form.name}
      description={form.description || ""}
      schema={form.schema}
      preview
      onBack={() => navigate(`/forms/builder/${form.id}`)}
    />
  )
}
