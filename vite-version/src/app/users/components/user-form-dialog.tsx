"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { api, type User } from "@/lib/api"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const userFormSchema = z.object({
  username: z.string().min(3, {
    message: "Lo username deve contenere almeno 3 caratteri.",
  }),
  email: z.string().email({
    message: "Inserisci un indirizzo email valido.",
  }),
  password: z.string().min(6, {
    message: "La password deve contenere almeno 6 caratteri.",
  }).optional().or(z.literal('')),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "USER", "DEVELOPER"], {
    message: "Seleziona un ruolo.",
  }),
  isActive: z.boolean().default(true),
  permissions: z.array(z.object({
    moduleName: z.string(),
    hasAccess: z.boolean(),
  })).optional(),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface Module {
  name: string
  label: string
  description: string
}

interface UserFormDialogProps {
  onAddUser: (user: UserFormValues) => Promise<void>
  editingUser?: User | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UserFormDialog({ onAddUser, editingUser, open: controlledOpen, onOpenChange }: UserFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [modules, setModules] = useState<Module[]>([])
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen

  const isEditing = !!editingUser

  const form = useForm<UserFormValues>({
    resolver: zodResolver(
      isEditing
        ? userFormSchema.extend({
            password: z.string().min(6).optional().or(z.literal(''))
          })
        : userFormSchema
    ),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "ADMIN",
      isActive: true,
      permissions: [],
    },
  })

  // Load modules
  useEffect(() => {
    loadModules()
  }, [])

  // Check if editing a protected user (DEVELOPER role or username "davide")
  const isProtectedUser = editingUser && (
    editingUser.role === 'DEVELOPER' ||
    editingUser.username.toLowerCase() === 'davide'
  )

  // Reset form when editing user changes
  useEffect(() => {
    if (editingUser) {
      console.log('Editing user permissions:', editingUser.permissions)
      const permissions = editingUser.permissions || []
      form.reset({
        username: editingUser.username,
        email: editingUser.email,
        password: "",
        firstName: editingUser.firstName || "",
        lastName: editingUser.lastName || "",
        role: editingUser.role as "SUPER_ADMIN" | "ADMIN" | "USER" | "DEVELOPER",
        isActive: editingUser.isActive,
        permissions: permissions,
      })
      setSelectedRole(editingUser.role)
    } else {
      form.reset({
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "ADMIN",
        isActive: true,
        permissions: [],
      })
      setSelectedRole("ADMIN")
    }
  }, [editingUser, form, open])

  const loadModules = async () => {
    try {
      const data = await api.getAvailableModules()
      setModules(data)

      // Initialize permissions for all modules if creating new user
      if (!editingUser) {
        const initialPermissions = data.map(module => ({
          moduleName: module.name,
          hasAccess: false,
        }))
        form.setValue('permissions', initialPermissions)
      }
    } catch (error) {
      console.error('Errore nel caricamento moduli:', error)
    }
  }

  const handleRoleChange = (role: string) => {
    setSelectedRole(role)
    form.setValue('role', role as "SUPER_ADMIN" | "ADMIN" | "USER")

    // If changing to ADMIN and no permissions exist, initialize them
    if (role === 'ADMIN') {
      const currentPermissions = form.getValues('permissions') || []
      if (currentPermissions.length === 0) {
        const initialPermissions = modules.map(module => ({
          moduleName: module.name,
          hasAccess: false,
        }))
        form.setValue('permissions', initialPermissions)
      }
    }
  }

  const updatePermission = (moduleName: string, value: boolean) => {
    const currentPermissions = form.getValues('permissions') || []
    const moduleIndex = currentPermissions.findIndex(p => p.moduleName === moduleName)

    if (moduleIndex >= 0) {
      const newPermissions = [...currentPermissions]
      newPermissions[moduleIndex] = {
        ...newPermissions[moduleIndex],
        hasAccess: value,
      }
      form.setValue('permissions', newPermissions)
    } else {
      const newPermission = {
        moduleName,
        hasAccess: value,
      }
      form.setValue('permissions', [...currentPermissions, newPermission])
    }
  }

  const getPermissionValue = (moduleName: string): boolean => {
    const permissions = form.watch('permissions') || []
    const permission = permissions.find(p => p.moduleName === moduleName)
    return permission ? permission.hasAccess : false
  }

  async function onSubmit(data: UserFormValues) {
    try {
      setLoading(true)

      // Filter out permissions if role is not ADMIN
      const submitData = {
        ...data,
        permissions: data.role === 'ADMIN' ? data.permissions : undefined,
        password: data.password || undefined, // Don't send empty password
      }

      await onAddUser(submitData)
      form.reset()
      setOpen(false)
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi Utente
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifica Utente' : 'Aggiungi Nuovo Utente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica i dati dell\'utente. Lascia la password vuota per mantenerla invariata.'
              : 'Crea un nuovo account utente. Gli utenti ADMIN possono accedere solo ai moduli selezionati.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Informazioni Base</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username *</FormLabel>
                        <FormControl>
                          <Input placeholder="username" {...field} disabled={isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input placeholder="email@esempio.it" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isEditing ? 'Nuova Password (opzionale)' : 'Password *'}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={isEditing ? "Lascia vuoto per non modificare" : "Minimo 6 caratteri"}
                          type="password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Mario" {...field} />
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
                          <Input placeholder="Rossi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruolo *</FormLabel>
                        <Select
                          onValueChange={handleRoleChange}
                          defaultValue={field.value}
                          value={selectedRole}
                          disabled={isProtectedUser}
                        >
                          <FormControl>
                            <SelectTrigger className="cursor-pointer w-full">
                              <SelectValue placeholder="Seleziona ruolo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {/* DEVELOPER non è selezionabile - viene mostrato solo se l'utente è già DEVELOPER */}
                            {selectedRole === 'DEVELOPER' && (
                              <SelectItem value="DEVELOPER">Developer</SelectItem>
                            )}
                            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="USER">Utente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {selectedRole === 'DEVELOPER' && 'Accesso sviluppatore con strumenti di debug'}
                          {selectedRole === 'SUPER_ADMIN' && 'Accesso completo a tutte le funzionalità'}
                          {selectedRole === 'ADMIN' && 'Accesso limitato ai moduli selezionati'}
                          {selectedRole === 'USER' && 'Accesso base di sola lettura'}
                          {isProtectedUser && <span className="block text-amber-600 mt-1">Il ruolo di questo utente non può essere modificato</span>}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={isProtectedUser ? true : field.value}
                            onCheckedChange={field.onChange}
                            disabled={isProtectedUser}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Account Attivo
                          </FormLabel>
                          <FormDescription>
                            {isProtectedUser
                              ? <span className="text-amber-600">Questo account non può essere disattivato</span>
                              : "L'utente può accedere al sistema"
                            }
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {selectedRole === 'ADMIN' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Permessi Moduli</h3>
                      <p className="text-sm text-muted-foreground">
                        Seleziona i moduli a cui l'admin può accedere e definisci i permessi per ciascuno
                      </p>
                    </div>

                    <div className="space-y-3">
                      {modules.map((module) => {
                        const hasAccess = getPermissionValue(module.name)

                        return (
                          <Card key={module.name} className={hasAccess ? 'border-primary' : ''}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base">{module.label}</CardTitle>
                                  <CardDescription className="text-xs">{module.description}</CardDescription>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${module.name}-access`}
                                    checked={hasAccess}
                                    onCheckedChange={(checked) =>
                                      updatePermission(module.name, checked as boolean)
                                    }
                                  />
                                  <label
                                    htmlFor={`${module.name}-access`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    Ha accesso
                                  </label>
                                </div>
                              </div>
                            </CardHeader>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                  Annulla
                </Button>
                <Button type="submit" className="cursor-pointer" disabled={loading}>
                  {loading ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Crea Utente'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
