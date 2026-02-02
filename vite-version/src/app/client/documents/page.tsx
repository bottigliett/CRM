import * as React from "react"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderOpen, FileText, Receipt, ExternalLink, Download } from "lucide-react"
import { clientAuthAPI } from "@/lib/client-auth-api"
import { toast } from "sonner"

export default function ClientDocumentsPage() {
  const [clientData, setClientData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadClientData()
  }, [])

  const loadClientData = async () => {
    try {
      setLoading(true)
      const response = await clientAuthAPI.getMe()
      setClientData(response.data)
    } catch (error) {
      console.error('Error loading client data:', error)
      toast.error('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  const folders = [
    {
      name: clientData?.driveFolderLinkTitle || 'Cartella Principale',
      description: 'Accedi alla cartella principale del progetto',
      icon: FolderOpen,
      link: clientData?.driveFolderLink,
      color: 'text-blue-500',
    },
    {
      name: clientData?.documentsFolderTitle || 'Documenti',
      description: 'Contratti, specifiche e documentazione',
      icon: FileText,
      link: clientData?.documentsFolder,
      color: 'text-green-500',
    },
    {
      name: clientData?.assetsFolderTitle || 'Assets',
      description: 'File grafici, immagini e risorse',
      icon: Download,
      link: clientData?.assetsFolder,
      color: 'text-purple-500',
    },
    {
      name: clientData?.invoiceFolderTitle || 'Fatture',
      description: 'Documenti fiscali e fatture',
      icon: Receipt,
      link: clientData?.invoiceFolder,
      color: 'text-orange-500',
    },
  ]

  if (loading) {
    return (
      <ClientLayout title="Documenti" description="Accedi ai tuoi file e cartelle">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Caricamento...</p>
          </div>
        </div>
      </ClientLayout>
    )
  }

  const hasAnyFolder = folders.some(f => f.link)

  return (
    <ClientLayout
      title="I Tuoi Documenti"
      description="Accedi rapidamente alle tue cartelle Drive"
    >
      <div className="px-4 lg:px-6 space-y-6">
        {!hasAnyFolder ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessuna Cartella Configurata</h3>
                <p className="text-sm text-muted-foreground">
                  Le cartelle Drive non sono ancora state configurate per il tuo account. <br />
                  Contatta il supporto per maggiori informazioni.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {folders.map((folder) => {
              if (!folder.link) return null

              const Icon = folder.icon

              return (
                <Card key={folder.name} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-background border ${folder.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {folder.name}
                    </CardTitle>
                    <CardDescription>{folder.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <a
                        href={folder.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Apri in Drive
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Info Card */}
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-base">Come Accedere ai Documenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Clicca su una delle cartelle sopra per accedere ai tuoi file su Google Drive
            </p>
            <p>
              • Assicurati di essere autenticato con l'account Google corretto
            </p>
            <p>
              • Se non riesci ad accedere a una cartella, contatta il supporto
            </p>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  )
}
