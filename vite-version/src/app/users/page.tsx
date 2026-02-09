"use client"

import { useState, useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card } from "@/components/ui/card"
import { StatCards } from "./components/stat-cards"
import { DataTable } from "./components/data-table"
import { api, type User } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { usePinProtection } from "@/contexts/pin-protection-context"
import { ProtectedData } from "@/components/protected-data"
import { PinUnlockDialog } from "@/components/pin-unlock-dialog"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

interface UserFormValues {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  role: string
  permissions?: Array<{
    moduleName: string
    hasAccess: boolean
  }>
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const { user: currentUser } = useAuthStore()
  const { isProtectionEnabled, isUnlocked } = usePinProtection()
  const navigate = useNavigate()

  // Check if user is SUPER_ADMIN or DEVELOPER
  useEffect(() => {
    if (currentUser && currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'DEVELOPER') {
      toast.error('Non hai i permessi per accedere a questa pagina')
      navigate('/dashboard')
    }
  }, [currentUser, navigate])

  // Load users
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      console.log('Loading users...')
      const data = await api.getAllUsers()
      console.log('Users loaded:', data)
      setUsers(data)
    } catch (error: any) {
      console.error('Error loading users:', error)
      toast.error(error.message || 'Errore nel caricamento degli utenti')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (userData: UserFormValues) => {
    try {
      const newUser = await api.createUser(userData)
      setUsers(prev => [newUser, ...prev])
      toast.success('Utente creato con successo')
    } catch (error: any) {
      toast.error(error.message || 'Errore nella creazione dell\'utente')
      throw error
    }
  }

  const handleUpdateUser = async (userId: number, userData: Partial<UserFormValues>) => {
    try {
      const updatedUser = await api.updateUserById(userId, userData)
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u))
      toast.success('Utente aggiornato con successo')
    } catch (error: any) {
      toast.error(error.message || 'Errore nell\'aggiornamento dell\'utente')
      throw error
    }
  }

  const handleDeleteUser = async (userId: number) => {
    try {
      await api.deleteUserById(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('Utente eliminato con successo')
    } catch (error: any) {
      toast.error(error.message || 'Errore nell\'eliminazione dell\'utente')
      throw error
    }
  }

  if (currentUser && currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'DEVELOPER') {
    return null
  }

  const shouldProtectData = isProtectionEnabled && !isUnlocked

  return (
    <BaseLayout
      title="Gestione Utenti"
      description="Gestisci gli utenti e i loro permessi"
    >
      {shouldProtectData ? (
        <div className="flex items-center justify-center min-h-[60vh] px-4 lg:px-6">
          <Card className="w-full max-w-md">
            <ProtectedData onUnlock={() => setPinDialogOpen(true)} />
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="@container/main px-4 lg:px-6">
            <StatCards users={users} />
          </div>

          <div className="@container/main px-4 lg:px-6 mt-8 lg:mt-12">
            <DataTable
              users={users}
              loading={loading}
              onDeleteUser={handleDeleteUser}
              onUpdateUser={handleUpdateUser}
              onAddUser={handleAddUser}
            />
          </div>
        </div>
      )}

      <PinUnlockDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
      />
    </BaseLayout>
  )
}
