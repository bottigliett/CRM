const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export type FieldType = 'text' | 'email' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'url' | 'tel' | 'spacer' | 'heading'

export interface FormField {
  id: string
  type: FieldType
  label: string
  subtitle?: string
  placeholder?: string
  helpText?: string
  hover?: string
  required: boolean
  options?: string[]
  page: number
  requiredIf?: { fieldId: string; operator: 'filled' | 'empty' }
  x?: number
  y?: number
  spacerHeight?: number
}

export interface FormSchema {
  fields: FormField[]
  pages: { title: string }[]
  settings: { reviewBeforeSubmit: boolean; notifyRoles: string[]; style?: { primaryColor?: string; backgroundColor?: string } }
}

export interface Form {
  id: number
  name: string
  slug: string
  description?: string
  schema: FormSchema
  status: 'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  _count?: { submissions: number }
}

export interface Submission {
  id: number
  formId: number
  data: Record<string, any>
  contactId?: number
  submittedAt: string
  readAt?: string
  form?: { id: number; name: string }
  contact?: { id: number; name: string }
}

function getAuthHeader() {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...options.headers },
  })
  const json = await res.json()
  if (!res.ok || !json.success) throw new Error(json.message || 'Errore API')
  return json
}

export const formsAPI = {
  list: () => request<{ success: boolean; data: Form[] }>('/forms'),
  get: (id: number) => request<{ success: boolean; data: Form }>(`/forms/${id}`),
  create: (data: { name: string; description?: string; schema?: FormSchema }) =>
    request<{ success: boolean; data: Form }>('/forms', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ name: string; description?: string; schema: FormSchema; status: 'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'ARCHIVED'; slug: string }>) =>
    request<{ success: boolean; data: Form }>(`/forms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => request<{ success: boolean }>(`/forms/${id}`, { method: 'DELETE' }),

  // Public (no auth)
  getPublic: (slug: string) => request<{ success: boolean; data: { id: number; name: string; description?: string; schema: FormSchema } }>(`/forms/public/${slug}`),
  submit: (slug: string, data: Record<string, any>) =>
    request<{ success: boolean; data: { id: number } }>(`/forms/public/${slug}/submit`, { method: 'POST', body: JSON.stringify({ data }) }),

  // AI
  aiGenerate: (description: string) =>
    request<{ success: boolean; data: { name: string; description: string; fields: Array<{ type: string; label: string; placeholder?: string; required: boolean; options?: string[] }> } }>(
      '/forms/ai/generate',
      { method: 'POST', body: JSON.stringify({ description }) }
    ),

  // Submissions
  submissions: (formId?: number) => request<{ success: boolean; data: Submission[] }>(formId ? `/forms/${formId}/submissions` : '/forms/submissions'),
  assign: (id: number, contactId: number | null) =>
    request<{ success: boolean; data: Submission }>(`/forms/submissions/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ contactId }) }),
  markRead: (id: number) => request<{ success: boolean; data: Submission }>(`/forms/submissions/${id}/read`, { method: 'PATCH' }),
  removeSubmission: (id: number) => request<{ success: boolean }>(`/forms/submissions/${id}`, { method: 'DELETE' }),
}

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Testo breve' },
  { value: 'textarea', label: 'Testo lungo' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Numero' },
  { value: 'tel', label: 'Telefono' },
  { value: 'url', label: 'Link (URL)' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Menu a tendina' },
  { value: 'radio', label: 'Scelta singola' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'spacer', label: 'Spazio' },
  { value: 'heading', label: 'Sezione (titolo)' },
]
