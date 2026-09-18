"use client"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Link2, Info } from "lucide-react"

const LIINKS_URL = "https://www.liinks.it/mismo"

export default function LiinksPage() {
  return (
    <BaseLayout
      title="Liinks"
      description="Link in bio delle pagine Instagram (liinks.it)"
    >
      <div className="px-4 lg:px-6">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Liinks
            </CardTitle>
            <CardDescription>
              Strumento per creare i link in bio delle pagine Instagram.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Liinks non consente di essere incorporato in un iframe (blocca con
                X-Frame-Options), quindi si apre in una nuova scheda.
              </p>
            </div>
            <Button asChild size="lg" className="w-full cursor-pointer">
              <a href={LIINKS_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Apri Liinks (nuova scheda)
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
