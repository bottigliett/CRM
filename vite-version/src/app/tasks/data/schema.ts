import { z } from "zod"

export const taskCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  _count: z.object({
    tasks: z.number(),
  }).optional(),
})

export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().optional().nullable(),
  contactId: z.number().optional().nullable(),
  categoryId: z.number().optional().nullable(),
  assignedTo: z.number(),
  createdBy: z.number(),
  priority: z.enum(['P1', 'P2', 'P3']),
  status: z.enum(['TODO', 'IN_PROGRESS', 'PENDING', 'COMPLETED']),
  deadline: z.string(),
  estimatedHours: z.number().optional().nullable(),
  actualHours: z.number().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.number().optional().nullable(),
  visibleToClient: z.boolean(),
  isArchived: z.boolean(),
  archivedAt: z.string().optional().nullable(),
  archivedBy: z.number().optional().nullable(),
  isFavorite: z.boolean().optional(),
  contact: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
  }).optional().nullable(),
  category: taskCategorySchema.optional().nullable(),
  assignedUser: z.object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().optional().nullable(),
  }).optional().nullable(),
  creator: z.object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
  }).optional().nullable(),
  teamMembers: z.array(z.object({
    userId: z.number(),
    user: z.object({
      id: z.number(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().optional().nullable(),
    }),
  })).optional().nullable(),
})

export type Task = z.infer<typeof taskSchema>
export type TaskCategory = z.infer<typeof taskCategorySchema>
