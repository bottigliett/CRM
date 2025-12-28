"use client"

import { Lock, Unlock } from "lucide-react"
import { useState, useEffect } from "react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePinProtection } from "@/contexts/pin-protection-context"
import { PinUnlockDialog } from "@/components/pin-unlock-dialog"
import { api } from "@/lib/api"
import { toast } from "sonner"

export function NavPinProtection() {
  const { isProtectionEnabled, isUnlocked, lock, enableProtection } = usePinProtection()
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await api.getCurrentUser()
        setCurrentUser(userData)
      } catch (error) {
        console.error('Failed to load user:', error)
      }
    }
    loadUser()
  }, [])

  const hasFinanceAccess =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.permissions?.some((p: any) =>
      p.moduleName === 'FINANCE_TRACKER' && p.hasAccess
    )

  // Don't show if user doesn't have finance access
  if (!hasFinanceAccess) {
    return null
  }

  const handleToggle = () => {
    if (!isProtectionEnabled) {
      // Enable protection and lock immediately
      enableProtection()
      toast.success('Protezione dati attivata e bloccata')
    } else if (isUnlocked) {
      // Lock the data
      lock()
      toast.success('Dati bloccati')
    } else {
      // Open PIN dialog to unlock
      setPinDialogOpen(true)
    }
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Sicurezza</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleToggle} className="cursor-pointer">
              {isProtectionEnabled && !isUnlocked ? (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>Sblocca Dati</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Blocca Dati</span>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
      <PinUnlockDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} />
    </>
  )
}
