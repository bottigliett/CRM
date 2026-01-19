import * as React from "react"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Building2, Phone, Save } from "lucide-react"
import { clientAuthAPI } from "@/lib/client-auth-api"
import { toast } from "sonner"

export default function ClientSettingsPage() {
  const [clientData, setClientData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [passwordData, setPasswordData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  React.useEffect(() => {
    loadClientData()
  }, [])

  const loadClientData = async () => {
    try {
      setLoading(true)
      const response = await clientAuthAPI.getMe()
      setClientData(response.data)
    } catch (error) {
      console.error('Error loading client data:', error)
      toast.error('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Le password non coincidono')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('La password deve essere di almeno 8 caratteri')
      return
    }

    try {
      setSaving(true)
      // TODO: Implement password change API
      toast.success('Password aggiornata con successo')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Errore nell\'aggiornamento della password')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ClientLayout title="Impostazioni" description="Caricamento...">
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Caricamento...</div>
        </div>
      </ClientLayout>
    )
  }

  const contact = clientData?.contact

  return (
    <ClientLayout
      title="Impostazioni"
      description="Gestisci il tuo account e le tue preferenze"
    >
      <div className="space-y-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informazioni Account
            </CardTitle>
            <CardDescription>
              I tuoi dati personali e di contatto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome
                </Label>
                <Input value={contact?.name || ''} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input value={contact?.email || ''} disabled className="bg-muted" />
              </div>

              {contact?.phone && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefono
                  </Label>
                  <Input value={contact.phone} disabled className="bg-muted" />
                </div>
              )}

              {contact?.company && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Azienda
                  </Label>
                  <Input value={contact.company} disabled className="bg-muted" />
                </div>
              )}
            </div>

            <Separator />

            <p className="text-sm text-muted-foreground">
              Per modificare questi dati, contatta il nostro team di supporto.
            </p>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Cambia Password</CardTitle>
            <CardDescription>
              Aggiorna la password del tuo account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Attuale</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nuova Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  disabled
                  placeholder="Minimo 8 caratteri"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma Nuova Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  disabled
                  placeholder="Ripeti la nuova password"
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button type="submit" disabled>
                  <Save className="mr-2 h-4 w-4" />
                  Funzionalità in arrivo
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                La funzionalità di cambio password sarà disponibile a breve. Per ora, contatta il supporto per modificare la tua password.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  )
}
