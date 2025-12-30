"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthStore } from "@/store/auth-store"
import { useState, useEffect } from "react"
import { useTheme } from "@/hooks/use-theme"
import { SettingsNav } from "@/components/settings-nav"
import axios from "axios"
import { api } from "@/lib/api"

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const accountFormSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  email: z.string().email("Email non valida"),
  username: z.string().min(3, "Username deve essere almeno 3 caratteri"),
  theme: z.enum(["light", "dark", "system"]),
  language: z.enum(["it", "en"]),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
})

type AccountFormValues = z.infer<typeof accountFormSchema>

export default function AccountSettings() {
  const { user, updateProfile, error, clearError } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null)

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      theme: "system",
      language: "it",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  // Carica i dati dell'utente quando il componente viene montato
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        username: user.username || "",
        theme: (user.theme as "light" | "dark" | "system") || "system",
        language: (user.language as "it" | "en") || "it",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    }
  }, [user, form])

  const { setTheme } = useTheme()

  async function onSubmit(data: AccountFormValues) {
    setIsLoading(true)
    clearError()
    setSuccessMessage(null)

    try {
      const updateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        username: data.username,
        theme: data.theme,
        language: data.language,
      }

      // Aggiungi password solo se l'utente vuole cambiarla
      if (data.newPassword && data.currentPassword) {
        updateData.currentPassword = data.currentPassword
        updateData.newPassword = data.newPassword
      }

      await updateProfile(updateData)

      // Applica il tema immediatamente
      setTheme(data.theme)

      // Resetta i campi password dopo il salvataggio
      form.setValue('currentPassword', '')
      form.setValue('newPassword', '')
      form.setValue('confirmPassword', '')

      setSuccessMessage("Profilo aggiornato con successo!")
    } catch (error) {
      // L'errore è gestito dallo store
    } finally {
      setIsLoading(false)
    }
  }

  async function sendVerificationCode() {
    // Use current email from form if verificationEmail is not set
    const emailToVerify = verificationEmail || form.getValues('email')

    if (!emailToVerify) {
      setVerificationError("Inserisci un'email")
      return
    }

    setIsVerifying(true)
    setVerificationError(null)
    setVerificationSuccess(null)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await axios.post(
        `${API_BASE_URL}/auth/email-verification/send`,
        { email: emailToVerify },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      setVerificationEmail(emailToVerify)
      setCodeSent(true)
      setVerificationSuccess("Codice inviato! Controlla la tua email.")

      // In development mode, show the code in console
      if (response.data.code) {
        console.log('Verification code:', response.data.code)
        setVerificationSuccess(`Codice inviato! (Dev mode: ${response.data.code})`)
      }
    } catch (error: any) {
      setVerificationError(error.response?.data?.message || "Errore durante l'invio del codice")
    } finally {
      setIsVerifying(false)
    }
  }

  async function verifyCode() {
    if (!verificationCode) {
      setVerificationError("Inserisci il codice")
      return
    }

    setIsVerifying(true)
    setVerificationError(null)
    setVerificationSuccess(null)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await axios.post(
        `${API_BASE_URL}/auth/email-verification/verify`,
        {
          email: verificationEmail,
          code: verificationCode
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      setVerificationSuccess("Email verificata e aggiornata con successo!")
      setCodeSent(false)
      setVerificationEmail("")
      setVerificationCode("")

      // Reload user data to update emailVerified badge
      const updatedUser = await api.getCurrentUser()

      // Update localStorage with new user data
      localStorage.setItem('user', JSON.stringify(updatedUser))

      // Update auth store with new user data
      useAuthStore.setState({ user: updatedUser })

      // Update the user in the form
      if (response.data.data?.user) {
        form.setValue('email', response.data.data.user.email)
      }
    } catch (error: any) {
      setVerificationError(error.response?.data?.message || "Codice non valido")
    } finally {
      setIsVerifying(false)
    }
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
                  <h2 className="text-2xl font-bold">Account</h2>
                  <p className="text-sm text-muted-foreground">
                    Aggiorna le tue informazioni personali e le preferenze.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" form="account-form" className="cursor-pointer" disabled={isLoading}>
                    {isLoading ? "Salvataggio..." : "Salva Modifiche"}
                  </Button>
                  <Button variant="outline" type="reset" form="account-form" className="cursor-pointer" disabled={isLoading}>
                    Annulla
                  </Button>
                </div>
              </div>

        <Form {...form}>
          <form id="account-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="bg-green-500/15 text-green-700 dark:text-green-400 text-sm p-3 rounded-md">
                {successMessage}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Informazioni Personali</CardTitle>
                <CardDescription>
                  Aggiorna le tue informazioni personali che verranno visualizzate nel profilo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Inserisci il tuo nome" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cognome</FormLabel>
                        <FormControl>
                          <Input placeholder="Inserisci il tuo cognome" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Email
                        {user?.emailVerified && (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Verificata
                          </span>
                        )}
                        {user && !user.emailVerified && (
                          <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                            Non verificata
                          </span>
                        )}
                      </FormLabel>
                      <div className="space-y-3">
                        <FormControl>
                          <Input type="email" placeholder="Inserisci la tua email" {...field} disabled={isLoading} />
                        </FormControl>

                        {user && !user.emailVerified && (
                          <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                            {verificationError && (
                              <div className="bg-destructive/15 text-destructive text-sm p-2 rounded-md">
                                {verificationError}
                              </div>
                            )}
                            {verificationSuccess && (
                              <div className="bg-green-500/15 text-green-700 dark:text-green-400 text-sm p-2 rounded-md">
                                {verificationSuccess}
                              </div>
                            )}

                            {!codeSent ? (
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  Per verificare la tua email, clicca sul pulsante per ricevere un codice di verifica.
                                </p>
                                <Button
                                  type="button"
                                  onClick={sendVerificationCode}
                                  disabled={isVerifying}
                                  size="sm"
                                  className="w-full"
                                >
                                  {isVerifying ? "Invio..." : "Invia Codice di Verifica"}
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  Codice inviato a {verificationEmail}
                                </p>
                                <div className="flex gap-2">
                                  <Input
                                    type="text"
                                    placeholder="Inserisci codice"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    disabled={isVerifying}
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    onClick={verifyCode}
                                    disabled={isVerifying || !verificationCode}
                                    size="sm"
                                  >
                                    {isVerifying ? "Verifica..." : "Verifica"}
                                  </Button>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCodeSent(false)
                                    setVerificationCode("")
                                  }}
                                >
                                  Annulla
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Inserisci il tuo username" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferenze</CardTitle>
                <CardDescription>
                  Personalizza l'aspetto e il comportamento dell'applicazione.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tema</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          setTheme(value as "light" | "dark" | "system")
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Seleziona un tema" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="light">Chiaro</SelectItem>
                          <SelectItem value="dark">Scuro</SelectItem>
                          <SelectItem value="system">Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lingua</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Seleziona una lingua" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="it">Italiano</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cambia Password</CardTitle>
                <CardDescription>
                  Aggiorna la tua password per mantenere il tuo account sicuro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password Corrente</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Inserisci password corrente" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nuova Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Inserisci nuova password" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conferma Nuova Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Conferma nuova password" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zona Pericolosa</CardTitle>
                <CardDescription>
                  Azioni irreversibili e distruttive.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Elimina Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Elimina permanentemente il tuo account e tutti i dati associati.
                    </p>
                  </div>
                  <Button variant="destructive" type="button" className="cursor-pointer">
                    Elimina Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
