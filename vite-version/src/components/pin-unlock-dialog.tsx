import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'
import { usePinProtection } from '@/contexts/pin-protection-context'
import { toast } from 'sonner'

interface PinUnlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PinUnlockDialog({ open, onOpenChange }: PinUnlockDialogProps) {
  const [pin, setPin] = useState('')
  const { unlock } = usePinProtection()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (unlock(pin)) {
      toast.success('Dati sbloccati con successo')
      onOpenChange(false)
      setPin('')
    } else {
      toast.error('PIN errato')
      setPin('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Sblocca Dati Finanziari
          </DialogTitle>
          <DialogDescription>
            Inserisci il PIN per visualizzare i dati finanziari e il leadboard
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="Inserisci PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-2xl tracking-widest"
              autoFocus
              autoComplete="off"
              data-form-type="other"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPin('')
                onOpenChange(false)
              }}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button type="submit" className="flex-1" disabled={pin.length !== 4}>
              Sblocca
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
