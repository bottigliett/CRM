"use client"

import { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Link2 } from "lucide-react"
import { FIELD_TYPES, type FormField, type FieldType } from "@/lib/forms-api"

export function LogicMap({
  fields,
  connections,
  onConnect,
  onRemove,
  onAddFieldAt,
  onMoveField,
  onEditField,
  fieldLabel,
}: {
  fields: FormField[]
  connections: any[]
  onConnect: (sourceId: string, targetId: string) => void
  onRemove: (targetId: string) => void
  onAddFieldAt: (type: string, x: number, y: number) => void
  onMoveField: (id: string, x: number, y: number) => void
  onEditField?: (fieldId: string) => void
  fieldLabel: (fieldId: string) => string
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const NODE_W = 190
  const NODE_H = 64

  const pos = (f: any, i: number) => ({
    x: f.x ?? 40 + (i % 4) * (NODE_W + 60),
    y: f.y ?? 40 + Math.floor(i / 4) * (NODE_H + 60),
  })

  const canvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const addType = e.dataTransfer.getData('application/x-add-field')
    const move = e.dataTransfer.getData('application/x-move-node')
    if (addType) onAddFieldAt(addType, Math.max(0, x - NODE_W / 2), Math.max(0, y - NODE_H / 2))
    else if (move) {
      try { const { id, ox, oy } = JSON.parse(move); onMoveField(id, Math.max(0, x - ox), Math.max(0, y - oy)) } catch {}
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <style>{`@keyframes dashmove { to { stroke-dashoffset: -24; } } .logic-cable { stroke-dasharray: 8 6; animation: dashmove 1s linear infinite; }`}</style>
        <div className="flex gap-4">
          <div className="w-40 shrink-0 space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-1">Trascina un campo sulla tavola</div>
            {FIELD_TYPES.map(ft => (
              <div key={ft.value} draggable
                onClick={() => onAddFieldAt(ft.value, 40 + (fields.length % 4) * 240, 40 + Math.floor(fields.length / 4) * 130)}
                onDragStart={e => e.dataTransfer.setData('application/x-add-field', ft.value)}
                className="rounded-md border px-2 py-1.5 text-xs cursor-pointer hover:bg-muted">
                {ft.label}
              </div>
            ))}
          </div>

          <div
            ref={canvasRef}
            className="relative flex-1 rounded-lg border overflow-auto"
            style={{ minHeight: 560, backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
            onDragOver={e => e.preventDefault()}
            onDrop={canvasDrop}
          >
            <div className="relative" style={{ width: 1400, height: 900 }}>
              <svg className="absolute inset-0 z-0" width="1400" height="900" style={{ pointerEvents: 'none' }}>
                <defs>
                  <marker id="logicarrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="#888" />
                  </marker>
                </defs>
                {connections.map((c: any, i: number) => {
                  const sf = fields.find(x => x.id === c.requiredIf.fieldId)
                  const tf = fields.find(x => x.id === c.id)
                  if (!sf || !tf) return null
                  const sp = pos(sf, fields.indexOf(sf))
                  const tp = pos(tf, fields.indexOf(tf))
                  const x1 = sp.x + NODE_W
                  const y1 = sp.y + NODE_H / 2
                  const x2 = tp.x
                  const y2 = tp.y + NODE_H / 2
                  const mx = (x1 + x2) / 2
                  const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
                  return <path key={i} d={path} className="logic-cable" fill="none" stroke="#888" strokeWidth="2" markerEnd="url(#logicarrow)" />
                })}
              </svg>

              {fields.map((f: any, i: number) => {
                const p = pos(f, i)
                const conn = connections.find((c: any) => c.id === f.id)
                const src = conn ? fields.find(x => x.id === conn.requiredIf.fieldId) : null
                return (
                  <div key={f.id}
                    className="absolute z-10"
                    style={{ left: p.x, top: p.y, width: NODE_W }}
                    draggable
                    onDragStart={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      e.dataTransfer.setData('application/x-move-node', JSON.stringify({ id: f.id, ox: e.clientX - rect.left, oy: e.clientY - rect.top }))
                      e.dataTransfer.setData('text/plain', f.id)
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const sid = e.dataTransfer.getData('application/x-connect'); if (sid) onConnect(sid, f.id) }}
                  >
                    <div className="rounded-lg border bg-background shadow-sm p-3 cursor-grab active:cursor-grabbing">
                      <button onClick={() => onEditField && onEditField(f.id)} className="text-left cursor-pointer w-full">
                        <div className="font-medium text-sm truncate">{f.label || '(senza titolo)'}</div>
                        <div className="text-xs text-muted-foreground">{FIELD_TYPES.find(t => t.value === f.type)?.label || f.type}</div>
                      </button>
                      {conn && src && (
                        <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          ← "{fieldLabel(conn.requiredIf.fieldId)}"
                          <button onClick={() => onRemove(f.id)} className="ml-1 hover:text-red-600 cursor-pointer">✕</button>
                        </div>
                      )}
                    </div>
                    <div draggable
                      onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('application/x-connect', f.id); e.dataTransfer.setData('text/plain', f.id) }}
                      className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border bg-background shadow flex items-center justify-center cursor-crosshair hover:bg-muted"
                      title="Trascina su un altro blocco per collegare">
                      <Link2 className="h-3 w-3" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
