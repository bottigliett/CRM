"use client"

import { useEffect, useMemo, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Euro, TrendingUp, TrendingDown, Wallet, Clock } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { developerAnalyticsAPI, type AnalyticsData } from "@/lib/developer-analytics-api"
import { toast } from "sonner"

const eur = (n: number) => `€ ${(n ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function DeveloperAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientSort, setClientSort] = useState<'revenue' | 'euroPerHour'>('revenue')

  useEffect(() => {
    developerAnalyticsAPI.get()
      .then(setData)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const chartData = useMemo(() => (data?.monthly || []).map(m => ({
    ...m,
    label: m.month,
  })), [data])

  const sortedClients = useMemo(() => {
    const c = [...(data?.clients || [])]
    if (clientSort === 'revenue') c.sort((a, b) => b.revenue - a.revenue)
    else c.sort((a, b) => (b.euroPerHour ?? -1) - (a.euroPerHour ?? -1))
    return c
  }, [data, clientSort])

  if (loading) {
    return <BaseLayout title="Analytics"><div className="px-4 lg:px-6">Caricamento…</div></BaseLayout>
  }
  if (!data) {
    return <BaseLayout title="Analytics"><div className="px-4 lg:px-6 text-muted-foreground">Nessun dato.</div></BaseLayout>
  }

  const t = data.totals

  return (
    <BaseLayout title="Analytics aziendale" description="Report privato: ricavi, costi, EBITDA, ore e redditività per cliente (esclusi DIEFFE BROS e MISMO)">
      <div className="px-4 lg:px-6 space-y-4 pb-10">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Fatturato incassato</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2"><Euro className="h-5 w-5 text-muted-foreground" />{t.paidRevenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{t.clients} clienti · {t.eventHours}h tracciate</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Costi totali</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2"><TrendingDown className="h-5 w-5 text-muted-foreground" />{t.expenses.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">di cui tasse {eur(t.taxes)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Margine lordo</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2"><Wallet className="h-5 w-5 text-muted-foreground" />{t.margin.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{t.paidRevenue > 0 ? Math.round((t.margin / t.paidRevenue) * 100) : 0}% del fatturato</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>EBITDA (approssimativo)</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-500" />{t.ebitda.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{t.paidRevenue > 0 ? Math.round((t.ebitda / t.paidRevenue) * 100) : 0}% del fatturato</p></CardContent>
          </Card>
        </div>

        {/* Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Andamento mensile</CardTitle>
            <CardDescription>Fatturato incassato vs costi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v: any) => eur(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Ricavi" stroke="#16a34a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expenses" name="Costi" stroke="#dc2626" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Clients */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Clienti: ricavi e redditività</CardTitle>
                  <CardDescription>Ordinati per {clientSort === 'revenue' ? 'fatturato' : '€/ora'}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setClientSort('revenue')} className={`text-xs px-2 py-1 rounded cursor-pointer ${clientSort === 'revenue' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Fatturato</button>
                  <button onClick={() => setClientSort('euroPerHour')} className={`text-xs px-2 py-1 rounded cursor-pointer ${clientSort === 'euroPerHour' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>€/ora</button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Incassato</TableHead>
                    <TableHead className="text-right">Ore</TableHead>
                    <TableHead className="text-right">€/ora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClients.map(c => (
                    <TableRow key={c.name}>
                      <TableCell className="max-w-[220px] truncate">{c.name}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{c.revenue.toLocaleString('it-IT')}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{c.eventHours || '—'}</TableCell>
                      <TableCell className={`text-right tabular-nums ${c.euroPerHour !== null && c.euroPerHour < 35 ? 'text-red-600 font-semibold' : ''}`}>
                        {c.euroPerHour !== null ? `€${c.euroPerHour}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Time by category */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tempo per processo</CardTitle>
              <CardDescription>Ore tracciate per categoria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {(() => {
                const max = Math.max(...data.timeByCategory.map(c => c.hours), 1)
                return data.timeByCategory.map(c => (
                  <div key={c.category} className="flex items-center gap-2 text-sm">
                    <div className="w-36 shrink-0 truncate">{c.category}</div>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary/70 rounded" style={{ width: `${(c.hours / max) * 100}%` }} />
                    </div>
                    <div className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{c.hours}h</div>
                  </div>
                ))
              })()}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Overdue */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fatture emesse non incassate</CardTitle>
              <CardDescription>Totale {eur(data.overdue.reduce((s, o) => s + o.total, 0))}</CardDescription>
            </CardHeader>
            <CardContent className="p-0 max-h-[380px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Numero</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead className="text-right">Scaduta da</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.overdue.map(o => (
                    <TableRow key={o.invoiceNumber}>
                      <TableCell className="max-w-[180px] truncate">{o.client}</TableCell>
                      <TableCell className="text-muted-foreground">{o.invoiceNumber}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{eur(o.total)}</TableCell>
                      <TableCell className="text-right">
                        {o.overdueDays > 0 ? <Badge variant="destructive">{o.overdueDays}g</Badge> : <Badge variant="outline">in scadenza</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.overdue.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nessuna fattura emessa</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Expense by category */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spese per categoria</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[380px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Mov.</TableHead>
                    <TableHead className="text-right">Totale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.expenseByCategory.map(c => (
                    <TableRow key={c.category}>
                      <TableCell>{c.category}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{c.count}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{eur(c.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Dati calcolati dal database. Esclusioni: DIEFFE BROS e MISMO. Ore "effettive" dei task non tracciate ({t.taskEstHours}h stimate disponibili).
        </p>
      </div>
    </BaseLayout>
  )
}
