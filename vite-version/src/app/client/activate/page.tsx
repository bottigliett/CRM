import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { clientAuthAPI, type ClientAccess } from '@/lib/client-auth-api'
import { toast } from 'sonner'
import {
  CheckCircle,
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  Key,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Logo } from '@/components/logo'

type Step = 1 | 2 | 3 | 4 | 'success'

export default function ClientActivationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  // Determine if using token-based or manual flow
  const isManualFlow = !token

  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [clientData, setClientData] = useState<ClientAccess | null>(null)
  const [email, setEmail] = useState('')

  // Manual flow: Step 1 - Username
  const [username, setUsername] = useState('')
  const [usernameVerified, setUsernameVerified] = useState(false)

  // Manual flow: Step 2 - Activation code
  const [activationCode, setActivationCode] = useState('')
  const [activationCodeVerified, setActivationCodeVerified] = useState(false)

  // Step 3 (token flow) / Step 4 (manual flow) - Password
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Token flow only
  const [verificationCode, setVerificationCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  useEffect(() => {
    if (token) {
      // Token-based flow
      verifyActivationToken()
    }
  }, [token])

  // TOKEN FLOW FUNCTIONS
  const verifyActivationToken = async () => {
    if (!token) return

    try {
      setLoading(true)
      const response = await clientAuthAPI.verifyToken(token)
      setClientData(response.data.clientAccess)
      setEmail(response.data.email)
      setUsername(response.data.clientAccess.username)
      toast.success('Token verificato con successo')
    } catch (error: any) {
      console.error('Token verification failed:', error)
      toast.error(error.message || 'Token non valido o scaduto')
      setTimeout(() => navigate('/client/login'), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    if (!token || !email) {
      toast.error('Email non disponibile')
      return
    }

    try {
      setLoading(true)
      await clientAuthAPI.sendVerificationCode(token, email)
      setCodeSent(true)
      toast.success(`Codice inviato a ${email}`)
    } catch (error: any) {
      console.error('Send code failed:', error)
      toast.error(error.message || "Errore nell'invio del codice")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!token || !verificationCode) {
      toast.error('Inserisci il codice di verifica')
      return
    }

    try {
      setLoading(true)
      await clientAuthAPI.verifyCode(token, verificationCode)
      toast.success('Email verificata con successo')
      setCurrentStep(3)
    } catch (error: any) {
      console.error('Code verification failed:', error)
      toast.error(error.message || 'Codice non valido')
    } finally {
      setLoading(false)
    }
  }

  // MANUAL FLOW FUNCTIONS
  const handleVerifyUsername = async () => {
    if (!username.trim()) {
      toast.error('Inserisci il tuo username')
      return
    }

    try {
      setLoading(true)
      const response = await clientAuthAPI.verifyUsername(username)
      setClientData(response.data.clientAccess)
      setEmail(response.data.email)
      setUsernameVerified(true)
      toast.success('Username trovato!')
      setCurrentStep(2)
    } catch (error: any) {
      console.error('Username verification failed:', error)
      toast.error(error.message || 'Username non trovato o già attivato')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyActivationCode = async () => {
    if (!activationCode.trim()) {
      toast.error('Inserisci il codice di attivazione')
      return
    }

    try {
      setLoading(true)
      await clientAuthAPI.verifyActivationCode(username, activationCode)
      setActivationCodeVerified(true)
      toast.success('Codice di attivazione verificato!')
      setCurrentStep(3)
    } catch (error: any) {
      console.error('Activation code verification failed:', error)
      toast.error(error.message || 'Codice di attivazione non valido')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteActivation = async () => {
    if (isManualFlow) {
      // Manual flow: username already set
      if (!password) {
        toast.error('Inserisci la password')
        return
      }
    } else {
      // Token flow: needs username
      if (!username || !password) {
        toast.error('Compila tutti i campi')
        return
      }
    }

    if (password !== confirmPassword) {
      toast.error('Le password non corrispondono')
      return
    }

    if (password.length < 8) {
      toast.error('La password deve contenere almeno 8 caratteri')
      return
    }

    try {
      setLoading(true)
      let response

      if (isManualFlow) {
        // Manual flow activation
        response = await clientAuthAPI.completeManualActivation(username, activationCode, password)
      } else {
        // Token-based flow activation
        response = await clientAuthAPI.completeActivation(token!, username, password)
      }

      // Store token and redirect to client dashboard
      localStorage.setItem('client_auth_token', response.data.token)

      setCurrentStep('success')
      toast.success('Attivazione completata!')

      setTimeout(() => {
        navigate('/client/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Activation failed:', error)
      toast.error(error.message || "Errore nell'attivazione")
    } finally {
      setLoading(false)
    }
  }

  const renderManualFlowStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className='space-y-4'>
            <div className='text-center space-y-2'>
              <div className='mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center'>
                <User className='h-6 w-6 text-blue-600' />
              </div>
              <h3 className='text-lg font-semibold'>Inserisci Username</h3>
              <p className='text-sm text-muted-foreground'>
                Inserisci lo username che ti è stato fornito
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='username'>Username</Label>
              <div className='relative'>
                <User className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                <Input
                  id='username'
                  placeholder='username'
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className='pl-10'
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <Button
              onClick={handleVerifyUsername}
              disabled={loading || !username.trim()}
              className='w-full'
              size='lg'
            >
              {loading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Verifica in corso...
                </>
              ) : (
                'Continua'
              )}
            </Button>
          </div>
        )

      case 2:
        return (
          <div className='space-y-4'>
            <div className='text-center space-y-2'>
              <div className='mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center'>
                <Mail className='h-6 w-6 text-green-600' />
              </div>
              <h3 className='text-lg font-semibold'>Verifica Email e Codice</h3>
              <p className='text-sm text-muted-foreground'>
                Conferma la tua email e inserisci il codice di attivazione
              </p>
            </div>

            {clientData && (
              <Alert>
                <AlertDescription>
                  <div className='space-y-1'>
                    <p><strong>Nome:</strong> {clientData.contact.name}</p>
                    <p><strong>Username:</strong> {username}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <div className='relative'>
                <Mail className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                <Input
                  id='email'
                  type='email'
                  placeholder='tua@email.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='pl-10'
                  disabled={loading}
                />
              </div>
              <p className='text-xs text-muted-foreground'>
                Modifica l'email se necessario
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='activationCode'>Codice di Attivazione</Label>
              <div className='relative'>
                <Key className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                <Input
                  id='activationCode'
                  placeholder='Inserisci il codice di attivazione'
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  className='pl-10'
                  disabled={loading}
                  autoFocus
                />
              </div>
              <p className='text-xs text-muted-foreground'>
                Il codice ti è stato fornito dal team
              </p>
            </div>

            <Button
              onClick={handleVerifyActivationCode}
              disabled={loading || !activationCode.trim()}
              className='w-full'
              size='lg'
            >
              {loading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Verifica in corso...
                </>
              ) : (
                'Verifica Codice'
              )}
            </Button>

            <Button
              variant='ghost'
              onClick={() => setCurrentStep(1)}
              disabled={loading}
              className='w-full'
              size='sm'
            >
              Torna Indietro
            </Button>
          </div>
        )

      case 3:
        return (
          <div className='space-y-4'>
            <div className='text-center space-y-2'>
              <div className='mx-auto w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center'>
                <Lock className='h-6 w-6 text-purple-600' />
              </div>
              <h3 className='text-lg font-semibold'>Crea Password</h3>
              <p className='text-sm text-muted-foreground'>
                Scegli una password sicura per il tuo account
              </p>
            </div>

            <Alert>
              <AlertDescription>
                <div className='space-y-1 text-sm'>
                  <p><strong>Username:</strong> {username}</p>
                  <p><strong>Email:</strong> {email || 'Non configurata'}</p>
                </div>
              </AlertDescription>
            </Alert>

            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='password'>Password</Label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='password'
                    type='password'
                    placeholder='Minimo 8 caratteri'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='pl-10'
                    disabled={loading}
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='confirmPassword'>Conferma Password</Label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='confirmPassword'
                    type='password'
                    placeholder='Ripeti la password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className='pl-10'
                    disabled={loading}
                  />
                </div>
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <Alert variant='destructive'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertDescription>
                    Le password non corrispondono
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleCompleteActivation}
                disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                className='w-full'
                size='lg'
              >
                {loading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Attivazione in corso...
                  </>
                ) : (
                  'Completa Attivazione'
                )}
              </Button>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className='space-y-4'>
            <div className='text-center space-y-2'>
              <div className='mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center'>
                <CheckCircle className='h-8 w-8 text-green-600' />
              </div>
              <h3 className='text-xl font-semibold'>Attivazione Completata!</h3>
              <p className='text-sm text-muted-foreground'>
                Il tuo account è stato attivato con successo
              </p>
              <p className='text-sm text-muted-foreground'>
                Sarai reindirizzato alla dashboard...
              </p>
            </div>
          </div>
        )
    }
  }

  const renderTokenFlowStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className='space-y-4'>
            <div className='text-center space-y-2'>
              <div className='mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center'>
                <CheckCircle className='h-6 w-6 text-green-600' />
              </div>
              <h3 className='text-lg font-semibold'>Benvenuto!</h3>
              <p className='text-sm text-muted-foreground'>
                Il tuo account è pronto per essere attivato
              </p>
            </div>

            {clientData && (
              <Alert>
                <AlertDescription>
                  <div className='space-y-1'>
                    <p><strong>Nome:</strong> {clientData.contact.name}</p>
                    <p><strong>Email:</strong> {email}</p>
                    {clientData.projectName && (
                      <p><strong>Progetto:</strong> {clientData.projectName}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => setCurrentStep(2)}
              className='w-full'
              size='lg'
            >
              Inizia Attivazione
            </Button>
          </div>
        )

      case 2:
        return (
          <div className='space-y-4'>
            <div className='text-center space-y-2'>
              <div className='mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center'>
                <Mail className='h-6 w-6 text-blue-600' />
              </div>
              <h3 className='text-lg font-semibold'>Verifica Email</h3>
              <p className='text-sm text-muted-foreground'>
                Conferma la tua email per continuare
              </p>
            </div>

            <Alert>
              <AlertDescription>
                Invieremo un codice di verifica a <strong>{email}</strong>
              </AlertDescription>
            </Alert>

            {!codeSent ? (
              <Button
                onClick={handleSendCode}
                disabled={loading}
                className='w-full'
                size='lg'
              >
                {loading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Mail className='mr-2 h-4 w-4' />
                    Invia Codice
                  </>
                )}
              </Button>
            ) : (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='code'>Codice di Verifica</Label>
                  <Input
                    id='code'
                    placeholder='Inserisci il codice a 6 cifre'
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    className='text-center text-2xl tracking-widest'
                  />
                </div>

                <Button
                  onClick={handleVerifyCode}
                  disabled={loading || !verificationCode || verificationCode.length !== 6}
                  className='w-full'
                  size='lg'
                >
                  {loading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Verifica in corso...
                    </>
                  ) : (
                    'Verifica Codice'
                  )}
                </Button>

                <Button
                  variant='ghost'
                  onClick={handleSendCode}
                  disabled={loading}
                  className='w-full'
                  size='sm'
                >
                  Invia nuovo codice
                </Button>
              </div>
            )}
          </div>
        )

      case 3:
        return (
          <div className='space-y-4'>
            <div className='text-center space-y-2'>
              <div className='mx-auto w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center'>
                <Lock className='h-6 w-6 text-purple-600' />
              </div>
              <h3 className='text-lg font-semibold'>Crea Credenziali</h3>
              <p className='text-sm text-muted-foreground'>
                Scegli username e password per accedere
              </p>
            </div>

            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='username'>Username</Label>
                <div className='relative'>
                  <User className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='username'
                    placeholder='username'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className='pl-10'
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
                    placeholder='Minimo 8 caratteri'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='pl-10'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='confirmPassword'>Conferma Password</Label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='confirmPassword'
                    type='password'
                    placeholder='Ripeti la password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className='pl-10'
                  />
                </div>
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <Alert variant='destructive'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertDescription>
                    Le password non corrispondono
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleCompleteActivation}
                disabled={loading || !username || !password || !confirmPassword || password !== confirmPassword}
                className='w-full'
                size='lg'
              >
                {loading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Attivazione in corso...
                  </>
                ) : (
                  'Completa Attivazione'
                )}
              </Button>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className='space-y-4'>
            <div className='text-center space-y-2'>
              <div className='mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center'>
                <CheckCircle className='h-8 w-8 text-green-600' />
              </div>
              <h3 className='text-xl font-semibold'>Attivazione Completata!</h3>
              <p className='text-sm text-muted-foreground'>
                Il tuo account è stato attivato con successo
              </p>
              <p className='text-sm text-muted-foreground'>
                Sarai reindirizzato alla dashboard...
              </p>
            </div>
          </div>
        )
    }
  }

  const getStepCount = () => isManualFlow ? 3 : 3
  const getCurrentStepNumber = () => (currentStep === 'success' ? getStepCount() : currentStep)

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-4'>
          <a
            href='/'
            className='flex items-center gap-2 justify-center text-lg font-bold'
          >
            <div className='flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground'>
              <Logo size={24} />
            </div>
            Mismo Studio
          </a>
          <div className='space-y-1'>
            <CardTitle className='text-2xl font-bold text-center'>
              {isManualFlow ? 'Attivazione Account' : 'Attivazione Account'}
            </CardTitle>
            <CardDescription className='text-center'>
              {isManualFlow
                ? 'Attiva il tuo account con username e codice'
                : 'Segui i passaggi per attivare il tuo accesso'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading && currentStep === 1 && !isManualFlow ? (
            <div className='flex flex-col items-center justify-center py-8 space-y-4'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <p className='text-sm text-muted-foreground'>
                Verifica token in corso...
              </p>
            </div>
          ) : (
            <>
              {/* Progress Indicator */}
              {currentStep !== 'success' && (
                <div className='mb-6'>
                  <div className='flex items-center justify-between'>
                    {Array.from({ length: getStepCount() }, (_, i) => i + 1).map((step) => (
                      <div
                        key={step}
                        className={`flex items-center ${
                          step < getStepCount() ? 'flex-1' : ''
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                            getCurrentStepNumber() >= step
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted bg-muted text-muted-foreground'
                          }`}
                        >
                          {step}
                        </div>
                        {step < getStepCount() && (
                          <div
                            className={`h-[2px] flex-1 mx-2 ${
                              getCurrentStepNumber() > step ? 'bg-primary' : 'bg-muted'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isManualFlow ? renderManualFlowStep() : renderTokenFlowStep()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
