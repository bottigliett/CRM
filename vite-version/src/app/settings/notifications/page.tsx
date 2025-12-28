"use client"

import { useState, useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Mail, Calendar, CheckSquare, AlertTriangle } from "lucide-react"
import { SettingsNav } from "@/components/settings-nav"
import { notificationsAPI, type NotificationPreference } from "@/lib/notifications-api"
import { toast } from "sonner"

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await notificationsAPI.getPreferences()
      setPreferences(response.data)
    } catch (error) {
      console.error('Errore nel caricamento delle preferenze:', error)
      toast.error('Errore nel caricamento delle preferenze')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!preferences) return

    try {
      setSaving(true)
      await notificationsAPI.updatePreferences(preferences)
      toast.success('Preferenze salvate con successo')
    } catch (error) {
      console.error('Errore nel salvataggio delle preferenze:', error)
      toast.error('Errore nel salvataggio delle preferenze')
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreference, value: any) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  if (loading) {
    return (
      <BaseLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </BaseLayout>
    )
  }

  if (!preferences) {
    return (
      <BaseLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Errore nel caricamento delle preferenze</p>
        </div>
      </BaseLayout>
    )
  }

  return (
    <BaseLayout>
      <div className="space-y-6 px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-bold">Impostazioni</h1>
          <p className="text-muted-foreground">
            Gestisci le impostazioni e le preferenze del tuo account.
          </p>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-16 lg:space-y-0">
          <aside className="-mx-3 lg:w-48">
            <SettingsNav />
          </aside>
          <div className="flex-1">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Notifiche</h2>
                  <p className="text-sm text-muted-foreground">
                    Configura come e quando ricevere le notifiche.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
                    {saving ? "Salvataggio..." : "Salva Preferenze"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={loadPreferences}
                    disabled={saving}
                    className="cursor-pointer"
                  >
                    Annulla
                  </Button>
                </div>
              </div>

              {/* Email Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Notifiche Email
                  </CardTitle>
                  <CardDescription>
                    Configura le notifiche che desideri ricevere via email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Abilita notifiche email</Label>
                      <p className="text-sm text-muted-foreground">
                        Ricevi notifiche via email
                      </p>
                    </div>
                    <Switch
                      checked={preferences.emailEnabled}
                      onCheckedChange={(checked) => updatePreference('emailEnabled', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-base">Eventi</Label>
                    </div>

                    <div className="pl-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">Promemoria eventi</Label>
                        <Switch
                          checked={preferences.emailEventReminder}
                          onCheckedChange={(checked) => updatePreference('emailEventReminder', checked)}
                          disabled={!preferences.emailEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">Evento assegnato</Label>
                        <Switch
                          checked={preferences.emailEventAssigned}
                          onCheckedChange={(checked) => updatePreference('emailEventAssigned', checked)}
                          disabled={!preferences.emailEnabled}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-base">Task</Label>
                    </div>

                    <div className="pl-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">Task assegnata</Label>
                        <Switch
                          checked={preferences.emailTaskAssigned}
                          onCheckedChange={(checked) => updatePreference('emailTaskAssigned', checked)}
                          disabled={!preferences.emailEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">Scadenza task vicina</Label>
                        <Switch
                          checked={preferences.emailTaskDueSoon}
                          onCheckedChange={(checked) => updatePreference('emailTaskDueSoon', checked)}
                          disabled={!preferences.emailEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">Task in ritardo</Label>
                        <Switch
                          checked={preferences.emailTaskOverdue}
                          onCheckedChange={(checked) => updatePreference('emailTaskOverdue', checked)}
                          disabled={!preferences.emailEnabled}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Browser Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifiche Browser
                  </CardTitle>
                  <CardDescription>
                    Ricevi notifiche nel centro notifiche e come popup del browser.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Abilita notifiche browser</Label>
                      <p className="text-sm text-muted-foreground">
                        Mostra notifiche nel browser e nel centro notifiche
                      </p>
                    </div>
                    <Switch
                      checked={preferences.browserEnabled}
                      onCheckedChange={(checked) => updatePreference('browserEnabled', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-base">Eventi</Label>
                    </div>

                    <div className="pl-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">Promemoria eventi</Label>
                        <Switch
                          checked={preferences.browserEventReminder}
                          onCheckedChange={(checked) => updatePreference('browserEventReminder', checked)}
                          disabled={!preferences.browserEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">Evento assegnato</Label>
                        <Switch
                          checked={preferences.browserEventAssigned}
                          onCheckedChange={(checked) => updatePreference('browserEventAssigned', checked)}
                          disabled={!preferences.browserEnabled}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-base">Task</Label>
                    </div>

                    <div className="pl-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">Task assegnata</Label>
                        <Switch
                          checked={preferences.browserTaskAssigned}
                          onCheckedChange={(checked) => updatePreference('browserTaskAssigned', checked)}
                          disabled={!preferences.browserEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">Scadenza task vicina</Label>
                        <Switch
                          checked={preferences.browserTaskDueSoon}
                          onCheckedChange={(checked) => updatePreference('browserTaskDueSoon', checked)}
                          disabled={!preferences.browserEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">Task in ritardo</Label>
                        <Switch
                          checked={preferences.browserTaskOverdue}
                          onCheckedChange={(checked) => updatePreference('browserTaskOverdue', checked)}
                          disabled={!preferences.browserEnabled}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Centro Notifiche */}
              <Card>
                <CardHeader>
                  <CardTitle>Centro Notifiche</CardTitle>
                  <CardDescription>
                    Controlla la visibilità del centro notifiche nella sidebar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Mostra centro notifiche</Label>
                      <p className="text-sm text-muted-foreground">
                        Visualizza l'icona del centro notifiche nella sidebar
                      </p>
                    </div>
                    <Switch
                      checked={preferences.centerEnabled}
                      onCheckedChange={(checked) => updatePreference('centerEnabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Default Reminder Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Promemoria Predefiniti</CardTitle>
                  <CardDescription>
                    Imposta il comportamento predefinito per i promemoria dei nuovi eventi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Abilita promemoria per nuovi eventi</Label>
                      <p className="text-sm text-muted-foreground">
                        Attiva automaticamente i promemoria quando crei un nuovo evento
                      </p>
                    </div>
                    <Switch
                      checked={preferences.defaultReminderEnabled}
                      onCheckedChange={(checked) => updatePreference('defaultReminderEnabled', checked)}
                    />
                  </div>

                  {preferences.defaultReminderEnabled && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label>Tempo predefinito del promemoria</Label>
                        <Select
                          value={preferences.defaultReminderType || undefined}
                          onValueChange={(value) => updatePreference('defaultReminderType', value)}
                        >
                          <SelectTrigger className="w-full max-w-sm">
                            <SelectValue placeholder="Seleziona il tempo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MINUTES_15">15 minuti prima</SelectItem>
                            <SelectItem value="MINUTES_30">30 minuti prima</SelectItem>
                            <SelectItem value="HOUR_1">1 ora prima</SelectItem>
                            <SelectItem value="DAY_1">1 giorno prima</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Questo sarà il tempo predefinito selezionato quando crei un nuovo evento
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
