import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Sparkles, CheckCircle2, Loader2, KeyRound, Bot } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"

export default function SocialAiSettings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [provider, setProvider] = useState<"claude" | "deepseek">("claude")
  const [deepseekApiKey, setDeepseekApiKey] = useState("")
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState("")
  const [deepseekModel, setDeepseekModel] = useState("")
  const [claudeApiKey, setClaudeApiKey] = useState("")
  const [claudeModel, setClaudeModel] = useState("")
  const [hasDeepseekKey, setHasDeepseekKey] = useState(false)
  const [hasClaudeKey, setHasClaudeKey] = useState(false)

  useEffect(() => {
    socialAPI.getAiSettings()
      .then(r => {
        const d = r.data
        setProvider(d.provider === "deepseek" ? "deepseek" : "claude")
        setDeepseekApiKey(d.deepseekApiKey || "")
        setDeepseekBaseUrl(d.deepseekBaseUrl || "")
        setDeepseekModel(d.deepseekModel || "")
        setClaudeApiKey(d.claudeApiKey || "")
        setClaudeModel(d.claudeModel || "")
        setHasDeepseekKey(d.hasDeepseekKey)
        setHasClaudeKey(d.hasClaudeKey)
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await socialAPI.updateAiSettings({
        provider,
        deepseekApiKey,
        deepseekBaseUrl,
        deepseekModel,
        claudeApiKey,
        claudeModel,
      })
      setHasDeepseekKey(r.data.hasDeepseekKey)
      setHasClaudeKey(r.data.hasClaudeKey)
      setDeepseekApiKey("")
      setClaudeApiKey("")
      toast.success("Impostazioni AI salvate")
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await socialAPI.aiGenerateCaption("vendita immobiliare in Valpolicella", "")
      toast.success("Test riuscito: l'AI risponde correttamente")
    } catch (err: any) { toast.error(`Test fallito: ${err.message}`) }
    finally { setTesting(false) }
  }

  return (
    <BaseLayout>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/social")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Social
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Impostazioni AI</h1>
            <p className="text-sm text-muted-foreground">Scegli il provider e inserisci la chiave API per Mismo AI</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Provider choice */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> Provider</CardTitle>
                <CardDescription>Quale motore usare per generare contenuti, caption e analisi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProvider("claude")}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${provider === "claude" ? "border-primary bg-primary/5" : "border-input hover:bg-muted"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Claude</span>
                      {provider === "claude" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Anthropic — modelli Sonnet</p>
                    {hasClaudeKey ? <Badge variant="secondary" className="mt-2 text-[10px]">Chiave configurata</Badge> : <Badge variant="outline" className="mt-2 text-[10px]">Nessuna chiave</Badge>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider("deepseek")}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${provider === "deepseek" ? "border-primary bg-primary/5" : "border-input hover:bg-muted"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">DeepSeek</span>
                      {provider === "deepseek" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">OpenAI-compatibile</p>
                    {hasDeepseekKey ? <Badge variant="secondary" className="mt-2 text-[10px]">Chiave configurata</Badge> : <Badge variant="outline" className="mt-2 text-[10px]">Nessuna chiave</Badge>}
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    Salva impostazioni
                  </Button>
                  <Button variant="outline" onClick={handleTest} disabled={testing}>
                    {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Test
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Claude settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Claude (Anthropic)</CardTitle>
                <CardDescription>Chiave API da console.anthropic.com</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Chiave API</Label>
                  <Input
                    type="password"
                    value={claudeApiKey}
                    onChange={e => setClaudeApiKey(e.target.value)}
                    placeholder={hasClaudeKey ? "•••••• (già configurata — lascia vuoto per mantenerla)" : "sk-ant-..."}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modello</Label>
                  <Input value={claudeModel} onChange={e => setClaudeModel(e.target.value)} placeholder="claude-sonnet-4-5-20250929" />
                </div>
              </CardContent>
            </Card>

            {/* DeepSeek settings */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> DeepSeek</CardTitle>
                <CardDescription>Configurazione opzionale — usata solo se selezioni DeepSeek come provider</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Chiave API</Label>
                  <Input
                    type="password"
                    value={deepseekApiKey}
                    onChange={e => setDeepseekApiKey(e.target.value)}
                    placeholder={hasDeepseekKey ? "•••••• (già configurata — lascia vuoto per mantenerla)" : "sk-..."}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input value={deepseekBaseUrl} onChange={e => setDeepseekBaseUrl(e.target.value)} placeholder="https://api.deepseek.com" />
                </div>
                <div className="space-y-2">
                  <Label>Modello</Label>
                  <Input value={deepseekModel} onChange={e => setDeepseekModel(e.target.value)} placeholder="deepseek-chat" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </BaseLayout>
  )
}
