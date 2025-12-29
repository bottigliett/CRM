"use client"

import type { Row } from "@tanstack/react-table"
import { MoreHorizontal, Eye, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { labels } from "../data/data"
import { taskSchema, type Task } from "../data/schema"
import { tasksAPI } from "@/lib/tasks-api"
import { toast } from "sonner"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  onViewTask?: (task: Task) => void
  onTaskUpdated?: (task: Task) => void
}

export function DataTableRowActions<TData>({
  row,
  onViewTask,
  onTaskUpdated,
}: DataTableRowActionsProps<TData>) {
  const task = taskSchema.parse(row.original)

  const handleToggleFavorite = async () => {
    try {
      const response = await tasksAPI.toggleFavorite(task.id, !task.isFavorite)
      if (response.success) {
        onTaskUpdated?.(response.data)
        toast.success(task.isFavorite ? 'Rimosso dai preferiti' : 'Aggiunto ai preferiti')
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      toast.error('Errore nell\'aggiornamento del preferito')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo task?')) return

    try {
      const response = await tasksAPI.deleteTask(task.id)
      if (response.success) {
        toast.success('Task eliminato con successo')
        // Trigger a refresh by calling onTaskUpdated with null or refetch
        window.location.reload() // Simple solution for now
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast.error('Errore nell\'eliminazione del task')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted cursor-pointer"
        >
          <MoreHorizontal />
          <span className="sr-only">Apri menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => onViewTask?.(task)}
        >
          <Eye className="mr-2 h-4 w-4" />
          Visualizza
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">Modifica</DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">Crea copia</DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleToggleFavorite}>
          <Star className={`mr-2 h-4 w-4 ${task.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          {task.isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">Etichette</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={task.label}>
              {labels.map((label) => (
                <DropdownMenuRadioItem key={label.value} value={label.value} className="cursor-pointer">
                  {label.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={handleDelete}>
          Elimina
          <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
