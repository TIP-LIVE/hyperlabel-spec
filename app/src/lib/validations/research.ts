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
// Script schemas
// ────────────────────────────────────────

const sectionQuestionSchema = z.object({
  text: z.string().min(1, 'Question text is required').max(2000),
  probes: z.array(z.string().max(1000)).default([]),
})

const scriptSectionSchema = z.object({
  title: z.string().min(1, 'Section title is required').max(500),
  duration: z.number().min(0).max(120),
  questions: z.array(sectionQuestionSchema).default([]),
})

export const createScriptSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  persona: z.enum(['CONSIGNEE', 'FORWARDER', 'SHIPPER']),
  sections: z.array(scriptSectionSchema).min(1, 'At least one section is required'),
})

export const updateScriptSchema = createScriptSchema.partial()

export const reviewScriptSchema = z.object({
  action: z.enum(['submit', 'approve', 'request-changes']),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

// ────────────────────────────────────────
// Hypothesis schemas
// ────────────────────────────────────────

export const createHypothesisSchema = z.object({
  code: z.string().min(1, 'Code is required').max(10),
  statement: z.string().min(1, 'Statement is required').max(2000),
  successSignal: z.string().min(1, 'Success signal is required').max(2000),
})

export const updateHypothesisSchema = z.object({
  statement: z.string().min(1).max(2000).optional(),
  successSignal: z.string().min(1).max(2000).optional(),
  validating: z.number().min(0).optional(),
  neutral: z.number().min(0).optional(),
  invalidating: z.number().min(0).optional(),
  verdict: z.string().max(2000).nullable().optional(),
})

// ────────────────────────────────────────
// Interview schemas
// ────────────────────────────────────────

export const scheduleInterviewSchema = z.object({
  leadId: z.string().min(1, 'Lead is required'),
  scheduledAt: z.string().datetime({ message: 'Valid datetime is required' }),
  duration: z.number().min(15).max(180).default(60),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

export const updateInterviewSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().min(15).max(180).optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.any().optional(),
  keyQuotes: z.any().optional(),
  hypothesisSignals: z.any().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  recordingUrl: z.string().max(2000).optional().or(z.literal('')),
  transcriptUrl: z.string().max(2000).optional().or(z.literal('')),
})

// ────────────────────────────────────────
// Email schemas
// ────────────────────────────────────────

export const researchEmailTypes = [
  'outreach',
  'scheduled',
  'reminder',
  'thank_you',
  'referral',
] as const

export type ResearchEmailType = (typeof researchEmailTypes)[number]

export const sendResearchEmailSchema = z.object({
  leadId: z.string().min(1, 'Lead is required'),
  type: z.enum(researchEmailTypes),
  subject: z.string().min(1).max(500).optional(),
  customMessage: z.string().max(5000).optional().or(z.literal('')),
})

// ────────────────────────────────────────
// Email template schemas
// ────────────────────────────────────────

export const createEmailTemplateSchema = z.object({
  type: z.enum(researchEmailTypes),
  persona: z.enum(['CONSIGNEE', 'FORWARDER', 'SHIPPER']).nullable().optional(),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required').max(10000),
})

export const updateEmailTemplateSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(10000).optional(),
})

export const reviewEmailTemplateSchema = z.object({
  action: z.enum(['submit', 'approve', 'request-changes']),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type MoveLeadInput = z.infer<typeof moveLeadSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type CreateScriptInput = z.infer<typeof createScriptSchema>
export type UpdateScriptInput = z.infer<typeof updateScriptSchema>
export type ReviewScriptInput = z.infer<typeof reviewScriptSchema>
export type CreateHypothesisInput = z.infer<typeof createHypothesisSchema>
export type UpdateHypothesisInput = z.infer<typeof updateHypothesisSchema>
export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>
export type SendResearchEmailInput = z.infer<typeof sendResearchEmailSchema>
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>
export type ReviewEmailTemplateInput = z.infer<typeof reviewEmailTemplateSchema>
