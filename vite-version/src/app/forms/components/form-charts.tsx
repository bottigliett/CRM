"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import type { FormField, Submission } from "@/lib/forms-api"

function fieldValues(field: FormField, submissions: Submission[]): string[] {
  const out: string[] = []
  for (const s of submissions) {
    const v = (s.data as any)?.[field.id]
    if (v == null || v === '') continue
    if (Array.isArray(v)) {
      for (const x of v) if (x != null && x !== '') out.push(String(x))
    } else {
      out.push(String(v))
    }
  }
  return out
}

function respondedCount(field: FormField, submissions: Submission[]): number {
  return submissions.filter(s => {
    const v = (s.data as any)?.[field.id]
    if (v == null) return false
    if (Array.isArray(v)) return v.length > 0
    return v !== ''
  }).length
}

function FieldChart({ field, submissions }: { field: FormField; submissions: Submission[] }) {
  const values = useMemo(() => fieldValues(field, submissions), [field, submissions])
  const responded = useMemo(() => respondedCount(field, submissions), [field, submissions])
  const [showAll, setShowAll] = useState(false)

  if (responded === 0) return null

  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1)
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const max = entries[0]?.[1] || 1

  const nums = field.type === 'number' ? values.map(Number).filter(n => !isNaN(n)) : []
  const numeric = nums.length > 0

  const visible = showAll ? entries : entries.slice(0, 15)
  const hidden = entries.length - visible.length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{field.label || '(senza titolo)'}</CardTitle>
        <p className="text-sm text-muted-foreground">{responded} {responded === 1 ? 'risposta' : 'risposte'}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {numeric && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Min <strong className="text-foreground">{Math.min(...nums)}</strong></span>
            <span>Max <strong className="text-foreground">{Math.max(...nums)}</strong></span>
            <span>Media <strong className="text-foreground">{(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)}</strong></span>
          </div>
        )}
        <div className="overflow-x-auto pb-1">
          <div className="flex items-end gap-2 min-w-max">
            {visible.map(([value, count]) => {
              const pct = ((count / responded) * 100).toFixed(0)
              const h = Math.max((count / max) * 120, 4)
              return (
                <div key={value} className="flex flex-col items-center justify-end" style={{ width: 92, height: 168 }} title={`${value}: ${count} (${pct}%)`}>
                  <span className="text-[11px] font-medium tabular-nums leading-none">{count}</span>
                  <span className="text-[9px] text-muted-foreground tabular-nums leading-none mb-0.5">{pct}%</span>
                  <div className="w-12 rounded-t bg-primary/80" style={{ height: h }} />
                  <div className="w-full px-1 text-[10px] text-muted-foreground truncate text-center mt-1 leading-tight" title={value}>{value}</div>
                </div>
              )
            })}
          </div>
        </div>
        {hidden > 0 && (
          <button onClick={() => setShowAll(true)} className="text-xs text-muted-foreground hover:underline cursor-pointer">Mostra altri {hidden} valori</button>
        )}
      </CardContent>
    </Card>
  )
}

export function FormCharts({ fields, submissions }: { fields: FormField[]; submissions: Submission[] }) {
  const chartable = fields.filter(f => f.type !== 'spacer' && f.type !== 'heading')

  const byDay = useMemo(() => {
    const m = new Map<string, number>()
    const sorted = [...submissions].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    for (const s of sorted) {
      const d = format(new Date(s.submittedAt), 'dd MMM', { locale: it })
      m.set(d, (m.get(d) || 0) + 1)
    }
    return [...m.entries()]
  }, [submissions])
  const maxDay = Math.max(...byDay.map(([, c]) => c), 1)
  const BAR_MAX = 110

  if (submissions.length === 0) {
    return <p className="text-muted-foreground py-12 text-center">Nessuna risposta.</p>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Andamento generale</CardTitle>
          <p className="text-sm text-muted-foreground">{submissions.length} {submissions.length === 1 ? 'risposta' : 'risposte'} totali</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1">
            {byDay.map(([day, count]) => {
              const h = Math.max((count / maxDay) * BAR_MAX, 4)
              return (
                <div key={day} className="flex-1 min-w-0 flex flex-col items-center justify-end" style={{ height: BAR_MAX + 18 }} title={`${day}: ${count}`}>
                  <span className="text-[10px] text-muted-foreground tabular-nums leading-none mb-0.5">{count}</span>
                  <div className="w-full rounded-t bg-primary/80" style={{ height: h }} />
                </div>
              )
            })}
          </div>
          <div className="flex gap-1 mt-1">
            {byDay.map(([day]) => (
              <div key={day} className="flex-1 min-w-0 text-[10px] text-muted-foreground truncate text-center">{day}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      {chartable.map(f => <FieldChart key={f.id} field={f} submissions={submissions} />)}
    </div>
  )
}
