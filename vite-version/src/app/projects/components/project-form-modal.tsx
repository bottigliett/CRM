"use client"

import { useState, useEffect } from "react"
import { Search, X, Building2, UserCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { projectsAPI, type Project, type CreateProjectData } from "@/lib/projects-api"
import { contactsAPI, type Contact } from "@/lib/contacts-api"

interface ProjectFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  onSuccess?: () => void
}

export function ProjectFormModal({ open, onOpenChange, project, onSuccess }: ProjectFormModalProps) {
  const isEdit = !!project

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contactId: undefined as number | undefined,
    budget: "" as string,
    estimatedHours: "" as string,
  })

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showContactSearch, setShowContactSearch] = useState(false)
  const [contactSearchQuery, setContactSearchQuery] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load contacts when modal opens
  useEffect(() => {
    const loadContacts = async () => {
      if (!open) return

      try {
        setLoading(true)
        const contactsResponse = await contactsAPI.getContacts({ limit: 1000 })
        setContacts(contactsResponse.data.contacts)
      } catch (error) {
        console.error('Errore nel caricamento contatti:', error)
        toast.error('Errore nel caricamento dei clienti')
      } finally {
        setLoading(false)
      }
    }

    loadContacts()
  }, [open])

  // Populate form when editing
  useEffect(() => {
    if (project && open) {
      setFormData({
        name: project.name,
        description: project.description || "",
        contactId: project.contactId,
        budget: project.budget.toString(),
        estimatedHours: project.estimatedHours?.toString() || "",
      })
    } else if (!open) {
      // Reset form when modal closes
      setFormData({
        name: "",
        description: "",
        contactId: undefined,
        budget: "",
        estimatedHours: "",
      })
      setErrors({})
    }
  }, [project, open])

  const selectedContact = contacts.find(c => c.id === formData.contactId)

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contactSearchQuery === "" ||
      contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
      (contact.email?.toLowerCase().includes(contactSearchQuery.toLowerCase()))
    return matchesSearch
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Il nome del progetto è obbligatorio"
    }
    if (!formData.contactId) {
      newErrors.contactId = "Il cliente è obbligatorio"
    }
    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      newErrors.budget = "Il budget deve essere maggiore di 0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      toast.error("Compila tutti i campi obbligatori")
      return
    }

    try {
      setSubmitting(true)

      const data: CreateProjectData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        contactId: formData.contactId!,
        budget: parseFloat(formData.budget),
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      }

      if (isEdit) {
        await projectsAPI.updateProject(project.id, data)
        toast.success("Progetto aggiornato con successo")
      } else {
        await projectsAPI.createProject(data)
        toast.success("Progetto creato con successo")
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Errore nel salvataggio progetto:', error)
      toast.error(error.message || "Errore nel salvataggio del progetto")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica Progetto" : "Nuovo Progetto"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica i dettagli del progetto"
              : "Crea un nuovo progetto per tracciare budget e ore lavorate"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome Progetto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Es: Gestione Social Media Q1 2025"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label>
              Cliente <span className="text-red-500">*</span>
            </Label>
            <Popover open={showContactSearch} onOpenChange={setShowContactSearch}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={showContactSearch}
                  className={cn(
                    "w-full justify-between font-normal",
                    !selectedContact && "text-muted-foreground",
                    errors.contactId && "border-red-500"
                  )}
                >
                  {selectedContact ? (
                    <div className="flex items-center gap-2">
                      {selectedContact.type === 'COMPANY' ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <UserCircle className="h-4 w-4" />
                      )}
                      <span>{selectedContact.name}</span>
                    </div>
                  ) : (
                    <span>Seleziona cliente...</span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <div className="border-b p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca cliente..."
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                    {contactSearchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 w-7 p-0"
                        onClick={() => setContactSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                  {filteredContacts.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Nessun cliente trovato
                    </div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <Button
                        key={contact.id}
                        variant="ghost"
                        className="w-full justify-start font-normal"
                        onClick={() => {
                          setFormData({ ...formData, contactId: contact.id })
                          setShowContactSearch(false)
                          setContactSearchQuery("")
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {contact.type === 'COMPANY' ? (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <UserCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="flex flex-col items-start">
                            <span>{contact.name}</span>
                            {contact.email && (
                              <span className="text-xs text-muted-foreground">
                                {contact.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {errors.contactId && (
              <p className="text-sm text-red-500">{errors.contactId}</p>
            )}
          </div>

          {/* Budget and Estimated Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">
                Budget (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                min="0"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0.00"
                className={errors.budget ? "border-red-500" : ""}
              />
              {errors.budget && (
                <p className="text-sm text-red-500">{errors.budget}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedHours">
                Ore Stimate
              </Label>
              <Input
                id="estimatedHours"
                type="number"
                step="0.5"
                min="0"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrivi il progetto..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? (isEdit ? "Salvataggio..." : "Creazione...")
                : (isEdit ? "Salva Modifiche" : "Crea Progetto")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
