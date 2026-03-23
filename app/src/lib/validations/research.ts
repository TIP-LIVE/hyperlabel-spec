import { z } from 'zod'

// ────────────────────────────────────────
// Lead schemas
// ────────────────────────────────────────

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  linkedIn: z.string().max(500).optional().or(z.literal('')),
  company: z.string().max(200).optional().or(z.literal('')),
  role: z.string().max(200).optional().or(z.literal('')),
  persona: z.enum(['CONSIGNEE', 'FORWARDER', 'SHIPPER']),
  source: z.string().max(100).optional().or(z.literal('')),
  referredBy: z.string().optional().or(z.literal('')),
  screeningNotes: z.string().max(5000).optional().or(z.literal('')),
  pilotInterest: z.number().min(1).max(5).nullable().optional(),
})

export const updateLeadSchema = createLeadSchema.partial().extend({
  giftCardSent: z.boolean().optional(),
  giftCardType: z.string().max(100).optional().or(z.literal('')),
})

export const moveLeadSchema = z.object({
  status: z.enum([
    'SOURCED',
    'CONTACTED',
    'SCREENED',
    'SCHEDULED',
    'COMPLETED',
    'ANALYSED',
    'DECLINED',
    'NO_SHOW',
  ]),
})

// ────────────────────────────────────────
// Task schemas
// ────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional().or(z.literal('')),
  category: z.enum([
    'OUTREACH',
    'SCHEDULING',
    'FOLLOW_UP',
    'GIFT_CARD',
    'ANALYSIS',
    'REVIEW',
  ]),
  leadId: z.string().optional().or(z.literal('')),
  dueDate: z.string().datetime().optional(),
  assignee: z.string().optional().or(z.literal('')),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assignee: z.string().optional(),
})

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type MoveLeadInput = z.infer<typeof moveLeadSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
