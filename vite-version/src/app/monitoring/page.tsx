"use client"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { ExternalLink, Activity } from "lucide-react"

// Uptime Kuma (monitoraggio siti) — sottodominio dedicato
const UPTIME_KUMA_URL = "https://status.studiomismo.com"

export default function MonitoringPage() {
  return (
    <BaseLayout
      title="Monitoraggio"
      description="Stato in tempo reale dei siti tuoi e dei clienti"
    >
      <div className="px-4 lg:px-6 flex flex-col h-full gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            Uptime e tempi di risposta monitorati da Uptime Kuma
          </p>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href={UPTIME_KUMA_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Apri in una scheda
            </a>
          </Button>
        </div>

        <div className="flex-1 rounded-xl border overflow-hidden bg-background">
          <iframe
            src={`${UPTIME_KUMA_URL}/dashboard`}
            title="Monitoraggio siti"
            className="w-full h-full min-h-[75vh]"
            style={{ border: 0 }}
            allow="clipboard-write"
          />
        </div>
      </div>
    </BaseLayout>
  )
}
