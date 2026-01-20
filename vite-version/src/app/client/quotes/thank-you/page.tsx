import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Instagram, Globe } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function ThankYouPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>
          <CardTitle className="text-3xl font-light">
            Grazie per la fiducia!
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-8 text-center">
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground">
              Siamo entusiasti di iniziare questa collaborazione con te.
            </p>
            <p className="text-base text-muted-foreground">
              Ti contatteremo entro <strong>2 giorni lavorativi</strong> per discutere i prossimi passi e organizzare tutto nel dettaglio.
            </p>
          </div>

          <div className="border-t border-border pt-8">
            <h3 className="text-lg font-medium mb-6">Seguici sui nostri canali</h3>
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => window.open('https://www.instagram.com/studiomismo/', '_blank')}
              >
                <Instagram className="h-5 w-5" />
                Instagram
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => window.open('https://studiomismo.com', '_blank')}
              >
                <Globe className="h-5 w-5" />
                Sito Web
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-8">
            <p className="text-sm text-muted-foreground mb-4">
              A presto!
              <br />
              <strong>Il Team di Studio Mismo</strong>
            </p>
            <Button
              variant="default"
              onClick={() => navigate('/client/dashboard')}
            >
              Torna alla Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
