"use client"

import { Button } from "@/components/ui/button"
import { Home, Compass } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function NotFoundError() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="select-none text-[7rem] font-black leading-none tracking-tighter text-foreground md:text-[9rem]">
        404
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Pagina non trovata</h1>
        <p className="text-muted-foreground max-w-md">
          La pagina che stai cercando non esiste o è stata spostata. Controlla
          l'indirizzo oppure torna alla dashboard.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button onClick={() => navigate("/dashboard")} className="cursor-pointer">
          <Home className="h-4 w-4 mr-2" />
          Torna alla Dashboard
        </Button>
        <Button variant="outline" onClick={() => navigate("/")} className="cursor-pointer">
          <Compass className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>
    </div>
  )
}
