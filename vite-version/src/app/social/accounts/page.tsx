import { useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, RefreshCw, Unplug, Link2 } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { contactsAPI } from "@/lib/contacts-api"
import { toast } from "sonner"

const PLATFORM_BADGE: Record<string, string> = {
  INSTAGRAM: "bg-pink-500",
  FACEBOOK: "bg-blue-600",
  LINKEDIN: "bg-sky-600",
  TIKTOK: "bg-zinc-800",
}

const OAUTH_PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "tiktok", label: "TikTok" },
]

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      socialAPI.getAccounts(),
      contactsAPI.getContacts({ type: 'CLIENT', limit: 500 }).then(r => r.data.contacts || []),
    ])
      .then(([accRes, clientsList]) => {
        setAccounts(accRes.data || [])
        setClients(clientsList)
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleConnect = async (platform: string) => {
    try {
      const res = await socialAPI.startOAuth(platform) // GLOBAL: no contactId
      window.location.href = res.data.authUrl
    } catch (err: any) { toast.error(err.message) }
  }

  const handleAssign = async (accountId: number, contactId: number | null) => {
    try {
      await socialAPI.moveAccount(accountId, contactId)
      toast.success(contactId ? "Account assegnato al cliente" : "Account spostato nel pool (non assegnato)")
      fetchData()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDisconnect = async (accountId: number) => {
    try {
      await socialAPI.disconnectAccount(accountId)
      toast.success("Account disconnesso")
      fetchData()
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <BaseLayout title="Account Social" description="Collega una volta il tuo profilo admin, poi assegna ogni account al cliente giusto">
      <div className="px-4 lg:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Collega Account (globale)
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {OAUTH_PLATFORMS.map(p => (
                <DropdownMenuItem key={p.key} onClick={() => handleConnect(p.key)}>
                  <Link2 className="h-4 w-4 mr-2" /> {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Aggiorna
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account collegati</CardTitle>
            <CardDescription>
              Gli account non assegnati stanno nel "pool". Usa il menu a tendina per assegnarli a un cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Caricamento…</p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nessun account collegato. Clicca "Collega Account" per importare tutte le Pagine del tuo profilo admin.
              </p>
            ) : (
              <div className="space-y-2">
                {accounts.map((acc: any) => (
                  <div key={acc.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${PLATFORM_BADGE[acc.platform] || "bg-gray-400"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{acc.platformName || acc.platform}</span>
                          <Badge variant="outline" className="text-[10px]">{acc.platform}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {acc.contact?.name || "Non assegnato"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={acc.contactId ? String(acc.contactId) : "none"}
                        onValueChange={v => handleAssign(acc.id, v === "none" ? null : parseInt(v))}
                      >
                        <SelectTrigger className="h-8 w-52 text-xs">
                          <SelectValue placeholder="Assegna a cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Non assegnato</SelectItem>
                          {clients.map((c: any) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleDisconnect(acc.id)} title="Disconnetti">
                        <Unplug className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
