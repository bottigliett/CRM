"use client"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { formsAPI, type FormSchema } from "@/lib/forms-api"
import { FormFillView } from "../components/form-fill-view"

export default function FormFillPage() {
  const { slug } = useParams()
  const [data, setData] = useState<{ name: string; description: string; schema: FormSchema } | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!slug) return
    formsAPI.getPublic(slug)
      .then(r => setData({ name: r.data.name, description: r.data.description || "", schema: r.data.schema }))
      .catch(() => setError("Form non trovato"))
  }, [slug])

  if (error) {
    return <div className="min-h-dvh flex items-center justify-center p-6 text-center text-muted-foreground">{error}</div>
  }
  if (!data) {
    return <div className="min-h-dvh flex items-center justify-center p-6 text-muted-foreground">Caricamento…</div>
  }

  return (
    <FormFillView
      name={data.name}
      description={data.description}
      schema={data.schema}
      onSubmitted={async (answers) => { await formsAPI.submit(slug!, answers) }}
    />
  )
}
