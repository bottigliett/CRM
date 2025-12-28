import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProtectedDataProps {
  onUnlock: () => void
  compact?: boolean
  noPadding?: boolean
}

export function ProtectedData({ onUnlock, compact = false, noPadding = false }: ProtectedDataProps) {
  if (compact) {
    return (
      <div className={`flex flex-col items-center justify-center ${noPadding ? 'py-3 px-4' : 'py-6 px-4'}`}>
        <div className="rounded-full bg-muted p-3 mb-3">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground text-center mb-3">
          Dati protetti da PIN
        </p>
        <Button onClick={onUnlock} variant="default" size="sm">
          <Lock className="mr-2 h-3 w-3" />
          Sblocca Dati
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Dati Protetti</h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
        I dati finanziari sono protetti da PIN. Clicca il pulsante per sbloccarli.
      </p>
      <Button onClick={onUnlock} variant="default">
        <Lock className="mr-2 h-4 w-4" />
        Sblocca Dati
      </Button>
    </div>
  )
}
