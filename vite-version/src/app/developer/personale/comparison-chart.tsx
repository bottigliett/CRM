"use client"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { personalAPI } from "@/lib/personal-api"
import { BarChart3 } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

export function ComparisonChart() {
  const [granularity, setGranularity] = useState<"monthly" | "yearly">("monthly")
  const [comparison, setComparison] = useState<Array<{ period: string; davide: number; stefano: number }>>([])

  useEffect(() => {
    personalAPI.getComparison(granularity).then(r => setComparison(r.data)).catch(() => {})
  }, [granularity])

  const chartData = useMemo(() => comparison.map(c => ({ name: c.period, Davide: c.davide, Stefano: c.stefano })), [comparison])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Confronto fatturato</CardTitle>
          <CardDescription>Davide vs Stefano — solo fatture pagate</CardDescription>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["monthly", "yearly"] as const).map(g => (
            <button key={g} onClick={() => setGranularity(g)} className={`px-3 py-1.5 text-xs font-medium rounded-md ${granularity === g ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              {g === "monthly" ? "Mensile" : "Annuale"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `€ ${v.toLocaleString("it-IT")}`} />
            <Legend />
            <Bar dataKey="Davide" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Stefano" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
