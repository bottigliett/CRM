"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { priorities, statuses } from "../data/data"
import type { Task } from "../data/schema"
import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"

export const createColumns = (onViewTask?: (task: Task) => void, onTaskUpdated?: (task: Task) => void): ColumnDef<Task>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px] cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px] cursor-pointer"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => <div className="w-[60px]">#{row.getValue("id")}</div>,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Titolo" />
    ),
    cell: ({ row }) => {
      const task = row.original

      return (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            {task.isFavorite && (
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
            )}
            {task.category && (
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: task.category.color }}
              />
            )}
            <span className="max-w-[400px] truncate font-medium">
              {row.getValue("title")}
            </span>
          </div>
          {task.description && (
            <span className="max-w-[400px] truncate text-xs text-muted-foreground">
              {task.description}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoria" />
    ),
    cell: ({ row }) => {
      const task = row.original

      if (!task.category) return null

      return (
        <Badge variant="outline" className="cursor-pointer">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: task.category.color }}
            />
            {task.category.name}
          </div>
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const task = row.original
      return task.category ? value.includes(task.category.id) : false
    },
  },
  {
    accessorKey: "assignedUser",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Responsabile" />
    ),
    cell: ({ row }) => {
      const task = row.original

      if (!task.assignedUser) return null

      return (
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-[10px]">
              {task.assignedUser.firstName?.[0]}{task.assignedUser.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">
            {task.assignedUser.firstName} {task.assignedUser.lastName}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "contact",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cliente" />
    ),
    cell: ({ row }) => {
      const task = row.original

      if (!task.contact) return <span className="text-muted-foreground text-sm">-</span>

      return (
        <span className="text-sm">{task.contact.name}</span>
      )
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stato" />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("status")
      )

      if (!status) {
        return null
      }

      return (
        <div className="flex w-[110px] items-center">
          {status.icon && (
            <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">{status.label}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priorità" />
    ),
    cell: ({ row }) => {
      const priority = priorities.find(
        (priority) => priority.value === row.getValue("priority")
      )

      if (!priority) {
        return null
      }

      return (
        <div className="flex items-center">
          {priority.icon && (
            <priority.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">{priority.label}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "deadline",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Scadenza" />
    ),
    cell: ({ row }) => {
      const task = row.original
      const deadline = new Date(task.deadline)
      const isOverdue = deadline < new Date() && task.status !== 'COMPLETED'

      return (
        <span className={`text-sm ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
          {format(deadline, "dd/MM/yyyy", { locale: it })}
        </span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} onViewTask={onViewTask} onTaskUpdated={onTaskUpdated} />,
  },
]

// Default export for backward compatibility
export const columns = createColumns()
