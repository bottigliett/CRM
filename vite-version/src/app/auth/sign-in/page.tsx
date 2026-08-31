"use client"

import { LoginForm1 } from "./components/login-form-1"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function Page() {
  const navigate = useNavigate()

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md">
            <Logo size={24} />
          </div>
          Mismo Studio
        </a>
        <LoginForm1 />
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/client/activate')}
          >
            <User className="mr-2 h-4 w-4" />
            Nuovo Cliente
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Primo accesso? Attiva il tuo account con username e codice di attivazione
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <a href="/privacy" target="_blank" rel="noopener" className="underline hover:text-foreground">Privacy Policy</a>
          <a href="/terms" target="_blank" rel="noopener" className="underline hover:text-foreground">Terms of Service</a>
        </div>
      </div>
    </div>
  )
}
