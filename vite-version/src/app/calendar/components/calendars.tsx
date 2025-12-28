"use client"

import { useState, useEffect } from "react"
import { Check, ChevronRight, Plus, Eye, EyeOff, MoreHorizontal, Settings } from "lucide-react"
import { useNavigate } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { eventsAPI, type EventCategory } from "@/lib/events-api"

interface CalendarsProps {
  onCalendarToggle?: (categoryId: number) => void
  hiddenCategories?: Set<number>
  onCalendarEdit?: (categoryId: number) => void
  onCalendarDelete?: (categoryId: number) => void
  onNewCalendar?: () => void
}

export function Calendars({
  onCalendarToggle,
  hiddenCategories,
  onCalendarEdit,
  onCalendarDelete,
  onNewCalendar
}: CalendarsProps) {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await eventsAPI.getEventCategories()
      setCategories(response.data)
    } catch (error) {
      console.error('Errore nel caricamento categorie:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVisibility = (categoryId: number) => {
    onCalendarToggle?.(categoryId)
  }

  const isCategoryVisible = (categoryId: number) => {
    // If category is in hiddenCategories set, it's hidden
    return !hiddenCategories || !hiddenCategories.has(categoryId)
  }

  return (
    <div className="space-y-4">
      <Collapsible defaultOpen className="group/collapsible">
        <div className="flex items-center justify-between mb-2">
          <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer flex-1">
            <span className="text-sm font-medium">Categorie Eventi</span>
            <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </CollapsibleTrigger>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigate('/calendar/settings')}
            title="Gestisci categorie"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <CollapsibleContent>
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Caricamento...
            </div>
          ) : categories.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Nessuna categoria trovata
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              {categories.map((category) => {
                const isVisible = isCategoryVisible(category.id)
                return (
                  <div key={category.id} className="group/calendar-item">
                    <div className="flex items-center justify-between p-2 hover:bg-accent/50 rounded-md">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Category Color & Visibility Toggle */}
                        <button
                          onClick={() => handleToggleVisibility(category.id)}
                          className={cn(
                            "flex aspect-square size-4 shrink-0 items-center justify-center rounded-sm border transition-all cursor-pointer",
                            isVisible
                              ? "border-transparent text-white"
                              : "border-border bg-transparent"
                          )}
                          style={{
                            backgroundColor: isVisible ? category.color : 'transparent'
                          }}
                        >
                          {isVisible && <Check className="size-3" />}
                        </button>

                        {/* Category Name */}
                        <span
                          className={cn(
                            "flex-1 truncate text-sm cursor-pointer",
                            !isVisible && "text-muted-foreground"
                          )}
                          onClick={() => handleToggleVisibility(category.id)}
                        >
                          {category.name}
                        </span>

                        {/* Event Count */}
                        {category._count && category._count.events > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {category._count.events}
                          </span>
                        )}

                        {/* Visibility Icon */}
                        <div className="opacity-0 group-hover/calendar-item:opacity-100">
                          {isVisible ? (
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>

                        {/* More Options */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div
                              className="h-5 w-5 flex items-center justify-center p-0 opacity-0 group-hover/calendar-item:opacity-100 cursor-pointer hover:bg-accent rounded-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="right">
                            <DropdownMenuItem
                              onClick={() => onCalendarEdit?.(category.id)}
                              className="cursor-pointer"
                            >
                              Modifica categoria
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleVisibility(category.id)}
                              className="cursor-pointer"
                            >
                              {isVisible ? "Nascondi" : "Mostra"} categoria
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onCalendarDelete?.(category.id)}
                              className="cursor-pointer text-destructive"
                            >
                              Elimina categoria
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
