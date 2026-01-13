import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { clientAuthAPI } from '@/lib/client-auth-api'
import { toast } from 'sonner'
import { User, Lock, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ClientLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if already authenticated
    if (clientAuthAPI.isAuthenticated()) {
      navigate('/client/dashboard')
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Inserisci username e password')
      return
    }

    try {
      setLoading(true)
      const response = await clientAuthAPI.login(username, password)

      toast.success(`Benvenuto ${response.data.clientAccess.contact.name}!`)
      navigate('/client/dashboard')
    } catch (error: any) {
      console.error('Login failed:', error)
      setError(error.message || 'Credenziali non valide')
      toast.error('Login fallito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-2xl font-bold text-center'>
            Area Cliente
          </CardTitle>
          <CardDescription className='text-center'>
            Accedi al tuo portale riservato
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className='space-y-4'>
            {error && (
              <Alert variant='destructive'>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className='space-y-2'>
              <Label htmlFor='username'>Username</Label>
              <div className='relative'>
                <User className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                <Input
                  id='username'
                  type='text'
                  placeholder='Il tuo username'
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className='pl-10'
                  autoComplete='username'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <div className='relative'>
                <Lock className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                <Input
                  id='password'
                  type='password'
                  placeholder='La tua password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className='pl-10'
                  autoComplete='current-password'
                />
              </div>
            </div>

            <Button
              type='submit'
              className='w-full'
              size='lg'
              disabled={loading || !username || !password}
            >
              {loading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Accesso in corso...
                </>
              ) : (
                'Accedi'
              )}
            </Button>
          </CardContent>
        </form>
        <CardFooter className='flex flex-col space-y-3'>
          <Button
            variant='outline'
            className='w-full'
            onClick={() => navigate('/client/activate')}
            disabled={loading}
          >
            <User className='mr-2 h-4 w-4' />
            Nuovo Cliente
          </Button>
          <div className='text-xs text-center text-muted-foreground'>
            Primo accesso? Attiva il tuo account con username e codice di attivazione
          </div>
          <div className='text-xs text-center text-muted-foreground'>
            Problemi di accesso?{' '}
            <a href='mailto:support@example.com' className='text-primary hover:underline'>
              Contatta il supporto
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
