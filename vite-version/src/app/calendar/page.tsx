"use client"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Calendar } from "./components/calendar"

export default function CalendarPage() {
  return (
    <BaseLayout
      title="Calendario"
      description="Gestisci il tuo calendario e gli eventi"
    >
      <div className="px-4 lg:px-6">
        <Calendar events={[]} eventDates={[]} />
      </div>
    </BaseLayout>
  )
}
