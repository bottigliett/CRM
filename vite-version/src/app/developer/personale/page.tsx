"use client"

import { useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/auth-store"
import { Lock } from "lucide-react"
import InvoicesPage from "./invoices-page"

const UNLOCK_CODE = "1212"

export default function DeveloperPersonale() {
  const user = useAuthStore(s => s.user)
  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState("")
  const [wrong, setWrong] = useState(false)

  const isDev = user?.role === "DEVELOPER" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"

  const tryUnlock = () => { if (code === UNLOCK_CODE) { setUnlocked(true); setWrong(false) } else setWrong(true) }

  if (!isDev) {
    return <BaseLayout title="Accesso negato"><div className="px-4 lg:px-6 py-16 text-center text-muted-foreground">Accesso riservato.</div></BaseLayout>
  }

  if (!unlocked) {
    return (
      <BaseLayout title="Area riservata">
        <div className="px-4 lg:px-6 flex flex-col items-center justify-center py-24">
          <div className="rounded-2xl border p-8 w-full max-w-sm text-center space-y-4">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Area riservata</h2>
            <p className="text-sm text-muted-foreground">Inserisci il codice di sblocco</p>
            <Input type="password" value={code} onChange={e => { setCode(e.target.value); setWrong(false) }} onKeyDown={e => e.key === "Enter" && tryUnlock()} placeholder="••••" autoFocus className="text-center text-lg tracking-widest" />
            {wrong && <p className="text-xs text-red-500">Codice errato</p>}
            <Button className="w-full" onClick={tryUnlock}>Sblocca</Button>
          </div>
        </div>
      </BaseLayout>
    )
  }

  return <InvoicesPage />
}
