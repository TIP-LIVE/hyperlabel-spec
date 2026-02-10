import { z } from 'zod'

export const savedAddressSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100),
  name: z.string().min(1, 'Name is required').max(200),
  line1: z.string().min(1, 'Address is required').max(300),
  line2: z.string().max(300).optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().max(100).optional().or(z.literal('')),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().length(2, 'Select a country'),
})

export const updateSavedAddressSchema = savedAddressSchema.partial()

export type SavedAddressInput = z.infer<typeof savedAddressSchema>
export type UpdateSavedAddressInput = z.infer<typeof updateSavedAddressSchema>
