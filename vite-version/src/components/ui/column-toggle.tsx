import { useState } from "react"
import { Settings2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Checkbox } from "@/components/ui/checkbox"

export interface ColumnDef {
  id: string
  label: string
}

interface ColumnToggleProps {
  columns: ColumnDef[]
  visibleColumns: Record<string, boolean>
  onToggle: (columnId: string) => void
  onReorder?: (newOrder: string[]) => void
}

function SortableRow({ column, visible, draggable, onToggle }: {
  column: ColumnDef
  visible: boolean
  draggable: boolean
  onToggle: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-default select-none"
    >
      {draggable && (
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-0.5"
          tabIndex={-1}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <Checkbox
        id={`coltog-${column.id}`}
        checked={visible}
        onCheckedChange={() => onToggle(column.id)}
      />
      <label htmlFor={`coltog-${column.id}`} className="text-sm cursor-pointer flex-1">
        {column.label}
      </label>
    </div>
  )
}

export function ColumnToggle({ columns, visibleColumns, onToggle, onReorder }: ColumnToggleProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    if (!onReorder) return
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex(c => c.id === active.id)
      const newIndex = columns.findIndex(c => c.id === over.id)
      const reordered = arrayMove(columns, oldIndex, newIndex)
      onReorder(reordered.map(c => c.id))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 lg:flex cursor-pointer">
          <Settings2 className="mr-2 h-4 w-4" />
          Colonne
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[210px]">
        <DropdownMenuLabel>{onReorder ? "Mostra e ordina colonne" : "Mostra colonne"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={columns.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="py-1">
              {columns.map(col => (
                <SortableRow
                  key={col.id}
                  column={col}
                  visible={visibleColumns[col.id] !== false}
                  draggable={!!onReorder}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
