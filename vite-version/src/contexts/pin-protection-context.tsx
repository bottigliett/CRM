import React, { createContext, useContext, useState, useEffect } from 'react'

interface PinProtectionContextType {
  isProtectionEnabled: boolean
  isUnlocked: boolean
  enableProtection: () => void
  disableProtection: () => void
  unlock: (pin: string) => boolean
  lock: () => void
}

const PinProtectionContext = createContext<PinProtectionContextType | undefined>(undefined)

const CORRECT_PIN = '1258'
const STORAGE_KEY = 'pin_protection_enabled'
const SESSION_UNLOCK_KEY = 'pin_unlocked'

export function PinProtectionProvider({ children }: { children: React.ReactNode }) {
  const [isProtectionEnabled, setIsProtectionEnabled] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)

  // Load protection state from localStorage and unlock state from sessionStorage
  useEffect(() => {
    const savedProtection = localStorage.getItem(STORAGE_KEY)
    if (savedProtection === 'true') {
      setIsProtectionEnabled(true)
    }

    const savedUnlock = sessionStorage.getItem(SESSION_UNLOCK_KEY)
    if (savedUnlock === 'true') {
      setIsUnlocked(true)
    }
  }, [])

  const enableProtection = () => {
    setIsProtectionEnabled(true)
    setIsUnlocked(false)
    localStorage.setItem(STORAGE_KEY, 'true')
    sessionStorage.removeItem(SESSION_UNLOCK_KEY)
  }

  const disableProtection = () => {
    setIsProtectionEnabled(false)
    setIsUnlocked(false)
    localStorage.setItem(STORAGE_KEY, 'false')
    sessionStorage.removeItem(SESSION_UNLOCK_KEY)
  }

  const unlock = (pin: string): boolean => {
    if (pin === CORRECT_PIN) {
      setIsUnlocked(true)
      sessionStorage.setItem(SESSION_UNLOCK_KEY, 'true')
      return true
    }
    return false
  }

  const lock = () => {
    setIsUnlocked(false)
    sessionStorage.removeItem(SESSION_UNLOCK_KEY)
  }

  return (
    <PinProtectionContext.Provider
      value={{
        isProtectionEnabled,
        isUnlocked,
        enableProtection,
        disableProtection,
        unlock,
        lock,
      }}
    >
      {children}
    </PinProtectionContext.Provider>
  )
}

export function usePinProtection() {
  const context = useContext(PinProtectionContext)
  if (context === undefined) {
    throw new Error('usePinProtection must be used within a PinProtectionProvider')
  }
  return context
}
