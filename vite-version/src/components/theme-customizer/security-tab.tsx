"use client"

import { Lock, Unlock } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { usePinProtection } from '@/contexts/pin-protection-context'
import { api } from '@/lib/api'
import { useState, useEffect } from 'react'

export function SecurityTab() {
  const { isProtectionEnabled, enableProtection, disableProtection, isUnlocked, lock } = usePinProtection()
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await api.getCurrentUser()
        setCurrentUser(user)
      } catch (error) {
        console.error('Failed to load user:', error)
      }
    }
    loadUser()
  }, [])

  // Only show PIN protection for SUPER_ADMIN or users with FINANCE_TRACKER access
  const hasFinanceAccess =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.permissions?.some((p: any) =>
      p.moduleName === 'FINANCE_TRACKER' && p.hasAccess
    )

  if (!hasFinanceAccess) {
    return (
      <div className="p-4 space-y-6">
        <div className="text-center text-sm text-muted-foreground py-8">
          Le opzioni di sicurezza sono disponibili solo per gli amministratori con accesso ai dati finanziari.
        </div>
      </div>
    )
  }

  const handleToggleProtection = (enabled: boolean) => {
    if (enabled) {
      enableProtection()
    } else {
      disableProtection()
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* PIN Protection */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Protezione PIN Dati Finanziari</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Proteggi i dati finanziari e il leadboard con un PIN (1258)
            </p>
          </div>
          <Switch
            checked={isProtectionEnabled}
            onCheckedChange={handleToggleProtection}
          />
        </div>

        {isProtectionEnabled && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {isUnlocked ? (
                <>
                  <Unlock className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600">Dati sbloccati</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-600">Dati bloccati</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Con la protezione attiva, i dati finanziari e il leadboard saranno nascosti e richiederanno il PIN per essere visualizzati.
            </p>
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              <strong>PIN:</strong> 1258
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Pagine protette</h4>
        <ul className="text-xs text-muted-foreground space-y-1 ml-4">
          <li>• Finance Tracker (dati finanziari)</li>
          <li>• Leadboard (valori opportunità)</li>
          <li>• Dashboard (sezioni finanziarie)</li>
        </ul>
      </div>
    </div>
  )
}
