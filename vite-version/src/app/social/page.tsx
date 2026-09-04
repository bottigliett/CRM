import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Calendar,
  Send,
  AlertTriangle,
  Search,
  Users,
  Plus,
  Briefcase,
  Folder,
  FolderOpen,
  MoreVertical,
  FolderInput,
  Pencil,
  Trash2,
  ArrowLeft,
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { projectsAPI } from "@/lib/projects-api"
import { toast } from "sonner"

const PLATFORM_DOT: Record<string, string> = {
  INSTAGRAM: "bg-pink-500",
  FACEBOOK: "bg-blue-600",
  LINKEDIN: "bg-sky-600",
  TIKTOK: "bg-gray-800",
}
const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: "IG",
  FACEBOOK: "FB",
  LINKEDIN: "IN",
  TIKTOK: "TT",
}

const LS_KEY = "social_folders"
const WIDGETS_LS = "social_dashboard_widgets"
const GOAL_POSTS = 4

function loadFolders(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]") }
  catch { return [] }
}
function loadWidgets(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(WIDGETS_LS) || "{}") }
  catch { return {} }
}
function saveFolders(f: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(f))
}

export default function SocialDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "posts">("posts")
  const [filterPlatform, setFilterPlatform] = useState("all")
  const [widgets, setWidgets] = useState<Record<string, boolean>>(() => ({
    kpis: true, goalProgress: true,
    ...loadWidgets(),
  }))
  const [showWidgetsDialog, setShowWidgetsDialog] = useState(false)
  const [goal, setGoal] = useState<number>(() => {
    try { return parseInt(localStorage.getItem("social_goal_posts") || String(GOAL_POSTS), 10) || GOAL_POSTS } catch { return GOAL_POSTS }
  })

  const toggleWidget = (key: string) => setWidgets(prev => {
    const n = { ...prev, [key]: !prev[key] }
    localStorage.setItem(WIDGETS_LS, JSON.stringify(n))
    return n
  })
  const updateGoal = (v: number) => {
    const n = Math.max(1, Math.min(100, v))
    setGoal(n)
    localStorage.setItem("social_goal_posts", String(n))
  }

  // Drive-style navigation: null = root, string = inside folder
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)

  // Persisted folder list (includes empty ones)
  const [folderList, setFolderList] = useState<string[]>(loadFolders)

  // Inline rename
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // New folder inline input
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  // Add client dialog
  const [showAdd, setShowAdd] = useState(false)
  const [allProjects, setAllProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addSearch, setAddSearch] = useState("")

  // Move to folder dialog
  const [moveTarget, setMoveTarget] = useState<any>(null)

  // Drag state
  const [dragClientId, setDragClientId] = useState<number | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    socialAPI.getDashboard()
      .then(res => {
        setData(res.data)
        // Merge server folders into local list
        const serverFolders = new Set<string>()
        ;(res.data.clients || []).forEach((c: any) => { if (c.folder) serverFolders.add(c.folder) })
        setFolderList(prev => {
          const merged = new Set([...prev, ...serverFolders])
          const arr = Array.from(merged).sort()
          saveFolders(arr)
          return arr
        })
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const clients: any[] = data?.clients || []
  const existingContactIds = new Set(clients.map((c: any) => c.id))

  // Folder counts
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    clients.forEach((c: any) => {
      if (c.folder) counts[c.folder] = (counts[c.folder] || 0) + 1
    })
    return counts
  }, [clients])

  const totalAccounts = useMemo(() => clients.reduce((s: number, c: any) => s + (c.accountCount || 0), 0), [clients])

  // What to show in the grid
  const visibleItems = useMemo(() => {
    // platform filter
    let base = clients.filter((c: any) =>
      filterPlatform === "all" || (c.accounts || []).some((a: any) => a.platform === filterPlatform)
    )
    // sort
    base = [...base].sort((a: any, b: any) =>
      sortBy === "posts" ? (b.totalPosts || 0) - (a.totalPosts || 0) : (a.name || "").localeCompare(b.name || "")
    )

    if (currentFolder) {
      // Inside a folder: only clients in this folder
      let list = base.filter((c: any) => c.folder === currentFolder)
      if (search) {
        const q = search.toLowerCase()
        list = list.filter((c: any) => c.name?.toLowerCase().includes(q))
      }
      return { folders: [] as string[], clients: list }
    }
    // Root: show folders + unfoldered clients
    let rootClients = base.filter((c: any) => !c.folder)
    if (search) {
      const q = search.toLowerCase()
      rootClients = rootClients.filter((c: any) => c.name?.toLowerCase().includes(q))
    }
    const visibleFolders = search
      ? folderList.filter(f => f.toLowerCase().includes(search.toLowerCase()))
      : folderList
    return { folders: visibleFolders, clients: rootClients }
  }, [clients, currentFolder, folderList, search, filterPlatform, sortBy])

  // --- Folder CRUD ---
  const handleCreateFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    if (folderList.includes(name)) { toast.error("Cartella già esistente"); return }
    const updated = [...folderList, name].sort()
    setFolderList(updated)
    saveFolders(updated)
    setCreatingFolder(false)
    setNewFolderName("")
  }

  const handleRenameFolder = async (oldName: string) => {
    const newName = renameValue.trim()
    if (!newName || newName === oldName) { setRenamingFolder(null); return }
    if (folderList.includes(newName)) { toast.error("Nome già in uso"); return }
    // Rename in local list
    const updated = folderList.map(f => f === oldName ? newName : f).sort()
    setFolderList(updated)
    saveFolders(updated)
    // Update clients server-side
    const clientsInFolder = clients.filter((c: any) => c.folder === oldName)
    if (clientsInFolder.length) {
      try {
        await Promise.all(clientsInFolder.map((c: any) =>
          socialAPI.updateClientConfig(c.id, { folder: newName })
        ))
        fetchData()
      } catch (err: any) { toast.error(err.message) }
    }
    if (currentFolder === oldName) setCurrentFolder(newName)
    setRenamingFolder(null)
    toast.success("Cartella rinominata")
  }

  const handleDeleteFolder = async (folderName: string) => {
    // Remove from local list
    const updated = folderList.filter(f => f !== folderName)
    setFolderList(updated)
    saveFolders(updated)
    // Unassign clients
    const clientsInFolder = clients.filter((c: any) => c.folder === folderName)
    if (clientsInFolder.length) {
      try {
        await Promise.all(clientsInFolder.map((c: any) =>
          socialAPI.updateClientConfig(c.id, { folder: null })
        ))
        fetchData()
      } catch (err: any) { toast.error(err.message) }
    }
    if (currentFolder === folderName) setCurrentFolder(null)
    toast.success("Cartella eliminata")
  }

  // --- Move client ---
  const handleMoveClient = async (clientId: number, folder: string | null) => {
    try {
      await socialAPI.updateClientConfig(clientId, { folder })
      setMoveTarget(null)
      toast.success(folder ? `Spostato in "${folder}"` : "Rimosso dalla cartella")
      fetchData()
    } catch (err: any) { toast.error(err.message) }
  }

  // --- Drag & Drop ---
  const onDragStart = (clientId: number) => setDragClientId(clientId)
  const onDragEnd = () => { setDragClientId(null); setDragOverFolder(null) }
  const onDropOnFolder = async (folderName: string) => {
    if (dragClientId === null) return
    setDragOverFolder(null)
    setDragClientId(null)
    await handleMoveClient(dragClientId, folderName)
  }
  const onDropOnRoot = async () => {
    if (dragClientId === null) return
    setDragClientId(null)
    await handleMoveClient(dragClientId, null)
  }

  // --- Add client ---
  const handleOpenAdd = async () => {
    setShowAdd(true)
    setSelectedProjectId("")
    setAddSearch("")
    if (allProjects.length) return
    setLoadingProjects(true)
    try {
      const res = await projectsAPI.getProjects({ status: "ACTIVE" })
      setAllProjects(res.data || [])
    } catch (err: any) { toast.error(err.message) }
    finally { setLoadingProjects(false) }
  }

  const handleAddClient = async () => {
    if (!selectedProjectId) return
    const project = allProjects.find((p: any) => String(p.id) === selectedProjectId)
    if (!project) return
    setAdding(true)
    try {
      // If we're inside a folder, assign client to that folder
      await socialAPI.registerClient(project.contactId, currentFolder || undefined)
      toast.success("Cliente aggiunto")
      setShowAdd(false)
      fetchData()
    } catch (err: any) { toast.error(err.message) }
    finally { setAdding(false) }
  }

  const availableProjects = allProjects.filter((p: any) => !existingContactIds.has(p.contactId))

  return (
    <BaseLayout title="Social Media" description="Gestione social media clienti">
      <div className="px-4 lg:px-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Failed posts alert */}
            {data?.failedPosts?.length > 0 && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" /> Post non pubblicati ({data.failedPosts.length})
                  </CardTitle>
                  <CardDescription>Clicca per aprire il cliente e correggere/ripubblicare.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {data.failedPosts.map((p: any) => {
                    const err = p.targets?.map((t: any) => t.errorMessage).filter(Boolean)[0]
                    const retry = async (e: any) => {
                      e.stopPropagation()
                      try {
                        await socialAPI.retryPost(p.id)
                        toast.success("Ripubblicazione avviata")
                        fetchData()
                      } catch (err: any) { toast.error(err.message) }
                    }
                    return (
                      <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <button onClick={() => navigate(`/social/${p.contactId}`)} className="flex flex-wrap items-center gap-2 text-left hover:underline flex-1 min-w-0">
                          <span className="font-medium truncate max-w-[300px]">{p.content}</span>
                          <span className="text-muted-foreground shrink-0">— {p.contact?.name || "Cliente"}</span>
                          {err && <span className="text-red-600 dark:text-red-400 shrink-0 truncate max-w-[240px]">({err})</span>}
                        </button>
                        <Button size="sm" variant="outline" className="shrink-0" onClick={retry}>Riprova</Button>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {currentFolder ? (
                  <>
                    <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setCurrentFolder(null)}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Tutte le cartelle
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" /> {currentFolder}
                    </h2>
                    <span className="text-sm text-muted-foreground">({visibleItems.clients.length})</span>
                  </>
                ) : (
                  <div>
                    <h2 className="text-lg font-semibold">Clienti Social</h2>
                    <p className="text-sm text-muted-foreground">{clients.length} clienti, {folderList.length} cartelle</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                {/* Platform filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      {filterPlatform === "all" ? "Tutti i social" : PLATFORM_LABEL[filterPlatform]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilterPlatform("all")}>Tutti i social</DropdownMenuItem>
                    {Object.entries(PLATFORM_LABEL).map(([key]) => (
                      <DropdownMenuItem key={key} onClick={() => setFilterPlatform(key)}>
                        <span className={`w-2.5 h-2.5 rounded-full mr-2 ${PLATFORM_DOT[key] || "bg-gray-400"}`} /> {key === "INSTAGRAM" ? "Instagram" : key === "FACEBOOK" ? "Facebook" : key === "LINKEDIN" ? "LinkedIn" : "TikTok"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Sort toggle */}
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSortBy(s => s === "posts" ? "name" : "posts")}>
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortBy === "posts" ? "Per post" : "Per nome"}
                </Button>
                {/* Chart management */}
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowWidgetsDialog(true)}>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Grafici
                </Button>
                {!currentFolder && (
                  <Button variant="outline" size="sm" onClick={() => setCreatingFolder(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Cartella
                  </Button>
                )}
                <Button size="sm" onClick={handleOpenAdd}>
                  <Plus className="h-4 w-4 mr-2" /> Cliente
                </Button>
              </div>
            </div>

            {/* Folders row */}
            {(!currentFolder && (visibleItems.folders.length > 0 || creatingFolder)) && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* New folder inline */}
                {creatingFolder && (
                  <Card className="border-dashed border-2">
                    <CardContent className="flex items-center gap-3 py-4 px-4">
                      <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                      <Input
                        className="h-7 text-sm flex-1"
                        placeholder="Nome cartella..."
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleCreateFolder()
                          if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName("") }
                        }}
                        autoFocus
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Folder tiles */}
                {visibleItems.folders.map(f => {
                  const folderClients = clients.filter((c: any) => c.folder === f)
                  const count = folderClients.length
                  const preview = folderClients.slice(0, 3).map((c: any) => c.name).join(", ")
                  const extra = count > 3 ? ` e altri ${count - 3}` : ""
                  return (
                    <Card
                      key={`folder-${f}`}
                      className={`cursor-pointer transition-all hover:bg-muted/50 group ${
                        dragOverFolder === f ? "ring-2 ring-primary bg-primary/5" : ""
                      }`}
                      onClick={() => {
                        if (renamingFolder === f) return
                        setCurrentFolder(f)
                        setSearch("")
                      }}
                      onDragOver={e => { e.preventDefault(); setDragOverFolder(f) }}
                      onDragLeave={() => setDragOverFolder(null)}
                      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDropOnFolder(f) }}
                    >
                      <CardContent className="py-4 px-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                            {renamingFolder === f ? (
                              <Input
                                className="h-7 text-sm"
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => {
                                  e.stopPropagation()
                                  if (e.key === "Enter") handleRenameFolder(f)
                                  if (e.key === "Escape") setRenamingFolder(null)
                                }}
                                autoFocus
                              />
                            ) : (
                              <p className="text-sm font-medium truncate">{f}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-muted-foreground">{count} clienti</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => { setRenamingFolder(f); setRenameValue(f) }}>
                                  <Pencil className="h-4 w-4 mr-2" /> Rinomina
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteFolder(f)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        {!renamingFolder && (
                          <p className="text-xs text-muted-foreground truncate pl-7">
                            {count ? `${preview}${extra}` : "Cartella vuota"}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Client cards grid — compact at root, expanded inside folders */}
            <div
              className={`grid gap-4 ${currentFolder ? "sm:grid-cols-1 lg:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}`}
              onDragOver={e => { if (!currentFolder) e.preventDefault() }}
              onDrop={!currentFolder ? onDropOnRoot : undefined}
            >
              {visibleItems.clients.map((client: any) => (
                <Card
                  key={`client-${client.id}`}
                  className="cursor-pointer hover:ring-2 hover:ring-primary/20 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group animate-in fade-in"
                  draggable
                  onDragStart={() => onDragStart(client.id)}
                  onDragEnd={onDragEnd}
                  onClick={() => navigate(`/social/${client.id}`)}
                >
                  {currentFolder ? (
                    /* --- Expanded card inside folder --- */
                    <CardContent className="py-5 px-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg shrink-0">
                            {client.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{client.name}</p>
                            {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setMoveTarget(client)}>
                              <FolderInput className="h-4 w-4 mr-2" /> Sposta in cartella...
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMoveClient(client.id, null)}>
                              <ArrowLeft className="h-4 w-4 mr-2" /> Rimuovi dalla cartella
                            </DropdownMenuItem>
                            {client.project && (
                              <DropdownMenuItem onClick={() => navigate(`/projects/${client.project.id}`)}>
                                <Briefcase className="h-4 w-4 mr-2" /> Vai al progetto
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {client.accounts?.length > 0 ? (
                            client.accounts.map((a: any) => (
                              <span
                                key={a.id}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold text-white ${PLATFORM_DOT[a.platform] || "bg-gray-400"}`}
                                title={a.platformName}
                              >
                                {PLATFORM_LABEL[a.platform] || "?"}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Nessun account collegato</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{client.totalPosts || 0} post</span>
                          {client.project && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" /> {client.project.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  ) : (
                    /* --- Compact card at root --- */
                    <CardContent className="py-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                            {client.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.totalPosts || 0} post</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setMoveTarget(client)}>
                              <FolderInput className="h-4 w-4 mr-2" /> Sposta in cartella...
                            </DropdownMenuItem>
                            {client.project && (
                              <DropdownMenuItem onClick={() => navigate(`/projects/${client.project.id}`)}>
                                <Briefcase className="h-4 w-4 mr-2" /> Vai al progetto
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {client.accounts?.length > 0 ? (
                          client.accounts.map((a: any) => (
                            <span
                              key={a.id}
                              className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold text-white ${PLATFORM_DOT[a.platform] || "bg-gray-400"}`}
                              title={a.platformName}
                            >
                              {PLATFORM_LABEL[a.platform] || "?"}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Nessun account</span>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {/* Empty state */}
            {!visibleItems.folders.length && !visibleItems.clients.length && !creatingFolder && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground font-medium">
                    {search ? "Nessun risultato" : currentFolder ? "Cartella vuota" : "Nessun cliente social"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {search ? "Prova con un termine diverso" : currentFolder ? "Trascina qui i clienti dalla vista principale" : "Aggiungi un cliente per iniziare"}
                  </p>
                  {!search && !currentFolder && (
                    <Button className="mt-4" onClick={handleOpenAdd}>
                      <Plus className="h-4 w-4 mr-2" /> Aggiungi Cliente
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Stats */}
            {widgets.kpis && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-300">
              <Card className="border-l-4 border-l-primary hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardDescription className="text-sm font-medium">Post Programmati</CardDescription>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-3xl font-bold">{data?.stats?.scheduledCount ?? 0}</div></CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardDescription className="text-sm font-medium">Pubblicati (7gg)</CardDescription>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-3xl font-bold">{data?.stats?.publishedThisWeek ?? 0}</div></CardContent>
              </Card>
              <Card className="border-l-4 border-l-destructive hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardDescription className="text-sm font-medium">Errori</CardDescription>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent><div className="text-3xl font-bold text-destructive">{data?.stats?.failedCount ?? 0}</div></CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardDescription className="text-sm font-medium">Account Collegati</CardDescription>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-3xl font-bold">{totalAccounts}</div></CardContent>
              </Card>
            </div>
            )}

            {/* Goal progress — N post per cliente */}
            {widgets.goalProgress && (
            <Card className="animate-in fade-in duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Obiettivo {goal} post / cliente</CardTitle>
                <CardDescription>Raggiungimento dell'obiettivo mensile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...clients].sort((a: any, b: any) => (b.totalPosts || 0) - (a.totalPosts || 0)).map((c: any) => {
                  const count = c.totalPosts || 0
                  const pct = Math.min(100, Math.round((count / goal) * 100))
                  const reached = count >= goal
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium truncate">{c.name}</span>
                        <span className={`text-xs font-semibold ${reached ? "text-green-600" : "text-muted-foreground"}`}>
                          {count}/{goal} post{reached ? " ✓" : ""}
                        </span>
                      </div>
                      <Progress value={pct} className={`h-2.5 ${reached ? "[&_[data-slot=progress-indicator]]:bg-green-500" : ""}`} />
                    </div>
                  )
                })}
                {clients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nessun cliente</p>
                )}
              </CardContent>
            </Card>
            )}

            {/* Add Client Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Aggiungi Cliente Social</DialogTitle>
              {currentFolder && (
                <p className="text-sm text-muted-foreground mt-1">
                  Verrà aggiunto alla cartella <strong>{currentFolder}</strong>
                </p>
              )}
            </DialogHeader>
            <div className="py-2">
              {loadingProjects ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : availableProjects.length > 0 ? (
                <div className="space-y-3">
                  {availableProjects.length > 5 && (
                    <Input
                      placeholder="Cerca progetto..."
                      value={addSearch}
                      onChange={e => setAddSearch(e.target.value)}
                      className="mb-1"
                    />
                  )}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {availableProjects
                      .filter(p => !addSearch || p.name?.toLowerCase().includes(addSearch.toLowerCase()) || p.contact?.name?.toLowerCase().includes(addSearch.toLowerCase()))
                      .map((p: any) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-all ${
                          selectedProjectId === String(p.id)
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-muted/50 border-border"
                        }`}
                        onClick={() => setSelectedProjectId(String(p.id))}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold text-sm shrink-0">
                          {(p.contact?.name || p.name)?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.contact?.name || "—"}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 truncate">
                              <Briefcase className="h-3 w-3 shrink-0" /> {p.name}
                            </span>
                            {p.contact?.type && (
                              <span className="shrink-0">{p.contact.type}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Tutti i progetti attivi sono già associati.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Annulla</Button>
              <Button onClick={handleAddClient} disabled={!selectedProjectId || adding}>
                {adding ? "Aggiungendo..." : "Aggiungi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Move to Folder Dialog */}
        <Dialog open={!!moveTarget} onOpenChange={open => { if (!open) setMoveTarget(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sposta &quot;{moveTarget?.name}&quot;</DialogTitle>
            </DialogHeader>
            <div className="space-y-1 py-2 max-h-64 overflow-y-auto">
              <button
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted text-sm flex items-center gap-2 ${!moveTarget?.folder ? "bg-primary/10 text-primary" : ""}`}
                onClick={() => handleMoveClient(moveTarget.id, null)}
              >
                <Folder className="h-4 w-4 opacity-50" /> Nessuna cartella (radice)
              </button>
              {folderList.map(f => (
                <button
                  key={f}
                  className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted text-sm flex items-center gap-2 ${moveTarget?.folder === f ? "bg-primary/10 text-primary" : ""}`}
                  onClick={() => handleMoveClient(moveTarget.id, f)}
                >
                  <FolderOpen className="h-4 w-4 text-blue-500" /> {f}
                  <span className="ml-auto text-xs text-muted-foreground">{folderCounts[f] || 0}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Widget management dialog — choose which charts to show */}
        <Dialog open={showWidgetsDialog} onOpenChange={setShowWidgetsDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Gestione Grafici</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {/* Goal config */}
              <div className="rounded-md border p-3 space-y-2">
                <Label className="text-xs font-medium">Obiettivo post / cliente (al mese)</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => updateGoal(goal - 1)}>-</Button>
                  <Input
                    type="number" min={1} max={100}
                    className="h-8 text-center"
                    value={goal}
                    onChange={e => updateGoal(parseInt(e.target.value) || 1)}
                  />
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => updateGoal(goal + 1)}>+</Button>
                </div>
              </div>

              {/* Widget toggles */}
              {[
                { key: "kpis", label: "KPI (statistiche rapide)" },
                { key: "goalProgress", label: `Obiettivo ${goal} post / cliente` },
              ].map(w => (
                <label key={w.key} className="flex items-center gap-2.5 cursor-pointer rounded-md p-2 hover:bg-muted/50 transition-colors">
                  <Checkbox checked={widgets[w.key]} onCheckedChange={() => toggleWidget(w.key)} />
                  <span className="text-sm">{w.label}</span>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowWidgetsDialog(false)}>Chiudi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BaseLayout>
  )
}
