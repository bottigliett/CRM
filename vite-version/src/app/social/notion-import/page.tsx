"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Database, Download, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"

interface PreviewClient {
  category: string
  clientName: string
  postCount: number
  excluded: boolean
  matched: string | null
}

export default function NotionImportPage() {
  const navigate = useNavigate()
  const [preview, setPreview] = useState<{ totalPosts: number; clients: PreviewClient[] } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; total: number; unmatchedClients: string[]; byClient: { client: string; contact: string; imported: number }[] } | null>(null)

  const handleScan = async () => {
    setScanning(true)
    setPreview(null)
    setResult(null)
    try {
      const res = await socialAPI.notionPreview()
      setPreview(res.data)
    } catch (err: any) { toast.error(err.message) }
    finally { setScanning(false) }
  }

  const handleImport = async () => {
    setImporting(true)
    setResult(null)
    try {
      const res = await socialAPI.notionImport()
      setResult(res.data)
      toast.success(`Import completato: ${res.data.imported} create, ${res.data.skipped} aggiornate`)
    } catch (err: any) { toast.error(err.message) }
    finally { setImporting(false) }
  }

  const importableCount = preview ? preview.clients.filter(c => !c.excluded && c.matched).reduce((s, c) => s + c.postCount, 0) : 0
  const excludedCount = preview ? preview.clients.filter(c => c.excluded).reduce((s, c) => s + c.postCount, 0) : 0

  return (
    <BaseLayout title="Importa da Notion" description="Importa i CED dei clienti da Notion a Mismo (solo lettura)">
      <div className="px-4 lg:px-6 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/social")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Social
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Importa da Notion</h1>
            <p className="text-sm text-muted-foreground">Copia i CED dei clienti da Notion nel CED di Mismo</p>
          </div>
        </div>

        {/* Safety banner */}
        <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="py-3 flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Operazione in <strong>sola lettura</strong> su Notion: nulla viene modificato o cancellato su Notion. I dati vengono solo <strong>letti</strong> e copiati come idee qui su Mismo.
            </p>
          </CardContent>
        </Card>

        {/* Scan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> Scansione Notion</CardTitle>
            <CardDescription>Legge la struttura dei CED e mostra cosa verrà importato, prima di procedere</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleScan} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Database className="h-4 w-4 mr-1" />}
              Scansiona Notion
            </Button>

            {preview && (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="secondary">{preview.totalPosts} post trovati</Badge>
                  <Badge variant="outline" className="text-emerald-600">{importableCount} importabili</Badge>
                  {excludedCount > 0 && <Badge variant="outline" className="text-muted-foreground">{excludedCount} esclusi</Badge>}
                </div>

                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">Cliente Notion</th>
                        <th className="px-3 py-2 font-medium">Contatto CRM</th>
                        <th className="px-3 py-2 font-medium text-right">Post</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.clients.map((c, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{c.clientName}</td>
                          <td className="px-3 py-2">
                            {c.excluded ? (
                              <span className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Escluso (ex cliente)</span>
                            ) : c.matched ? (
                              <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {c.matched}</span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Nessun match</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{c.postCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button onClick={handleImport} disabled={importing || importableCount === 0} className="bg-emerald-600 hover:bg-emerald-700">
                  {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  Importa {importableCount} idee
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card className="border-emerald-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Import completato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{result.imported}</div><div className="text-xs text-muted-foreground">Idee create</div></div>
                <div className="rounded-lg border p-3 text-center"><div className="text-2xl font-bold">{result.skipped}</div><div className="text-xs text-muted-foreground">Aggiornate (già presenti)</div></div>
                <div className="rounded-lg border p-3 text-center"><div className="text-2xl font-bold">{result.total}</div><div className="text-xs text-muted-foreground">Totale esaminato</div></div>
              </div>

              {result.unmatchedClients.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-3">
                  <p className="text-sm font-medium text-amber-700">Clienti senza match (non importati):</p>
                  <p className="text-sm text-amber-600">{result.unmatchedClients.join(", ")}</p>
                </div>
              )}

              <Button variant="outline" onClick={() => navigate("/social")}>Vai alla dashboard Social</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </BaseLayout>
  )
}
