import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle,
  Circle,
  CircleOff,
  HelpCircle,
  Timer,
} from "lucide-react"

export const labels = [
  {
    value: "bug",
    label: "Bug",
  },
  {
    value: "feature",
    label: "Feature",
  },
  {
    value: "documentation",
    label: "Documentation",
  },
]

export const statuses = [
  {
    value: "TODO",
    label: "Da Fare",
    icon: Circle,
  },
  {
    value: "IN_PROGRESS",
    label: "In Corso",
    icon: Timer,
  },
  {
    value: "PENDING",
    label: "In Attesa",
    icon: HelpCircle,
  },
  {
    value: "COMPLETED",
    label: "Completato",
    icon: CheckCircle,
  },
]

export const priorities = [
  {
    label: "P1 - Alta",
    value: "P1",
    icon: ArrowUp,
  },
  {
    label: "P2 - Media",
    value: "P2",
    icon: ArrowRight,
  },
  {
    label: "P3 - Bassa",
    value: "P3",
    icon: ArrowDown,
  },
]
