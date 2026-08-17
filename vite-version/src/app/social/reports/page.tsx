import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2, ExternalLink, FileText } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export default function GeneralSocialReports() {
  const navigate = useNavigate()

  const [reports, setReports] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState("all")

  useEffect(() => {
    socialAPI.getDashboard()
      .then(res => setClients(res.data.clients || []))
      .catch(() => {})
  }, [])

  const fetchReports = () => {
    setLoading(true)
    const cid = filterClient !== "all" ? parseInt(filterClient) : undefined
    socialAPI.getReports(cid)
      .then(res => setReports(res.data || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReports() }, [filterClient])

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await socialAPI.updateReport(id, { isActive: !isActive })
      toast.success(isActive ? "Report disattivato" : "Report attivato")
      setReports(prev => prev.map(r => r.id === id ? { ...r, isActive: !isActive } : r))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Eliminare questo report?")) return
    try {
      await socialAPI.deleteReport(id)
      toast.success("Report eliminato")
      setReports(prev => prev.filter(r => r.id !== id))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <BaseLayout title="Report Generale" description="Tutti i report schedulati per i clienti social">
      <div className="px-4 lg:px-6 space-y-6 animate-in fade-in duration-300">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tutti i clienti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i clienti</SelectItem>
              {clients.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Schedulati</CardTitle>
            <CardDescription className="mt-1">Gestisci i report automatici di tutti i clienti</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : reports.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Nome Report</TableHead>
                      <TableHead className="hidden md:table-cell">Frequenza</TableHead>
                      <TableHead className="hidden sm:table-cell">Prossimo Invio</TableHead>
                      <TableHead>Attivo</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                              {(r.contact?.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-sm">{r.contact?.name || `#${r.contactId}`}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary">
                            {r.frequency === "WEEKLY" ? "Settimanale" : r.frequency === "BIWEEKLY" ? "Bisettimanale" : "Mensile"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {r.nextSendAt ? format(new Date(r.nextSendAt), "dd MMM yyyy", { locale: it }) : "—"}
                        </TableCell>
                        <TableCell>
                          <Switch checked={r.isActive} onCheckedChange={() => handleToggleActive(r.id, r.isActive)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-0.5">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/social/${r.contactId}/reports`)}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-medium">Nessun report configurato</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Vai nella sezione report di un cliente per crearne uno
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
