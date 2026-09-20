"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 cursor-pointer text-foreground"
      onClick={() => {
        const isDark = document.documentElement.classList.contains("dark")
        setTheme(isDark ? "light" : "dark")
      }}
      title="Cambia sfondo (chiaro/scuro)"
    >
      <Moon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Sun className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Cambia sfondo</span>
    </Button>
  )
}
