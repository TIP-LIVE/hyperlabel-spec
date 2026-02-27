import { z } from 'zod'

// Shared address fields
const addressFields = {
  originAddress: z.string().default(''),
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destinationAddress: z.string().default(''),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
}

/** Create a CARGO_TRACKING shipment (single label, track cargo) */
export const createCargoShipmentSchema = z.object({
  type: z.literal('CARGO_TRACKING').default('CARGO_TRACKING'),
  name: z.string().min(1, 'Cargo name is required').max(200),
  labelId: z.string().min(1, 'Label ID is required'),
  ...addressFields,
  consigneeEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  consigneePhone: z.string().max(30).optional().or(z.literal('')),
  photoUrls: z.array(z.string()).max(5).optional(),
})

/** Create a LABEL_DISPATCH shipment (multiple labels, ship from warehouse) */
export const createDispatchShipmentSchema = z.object({
  type: z.literal('LABEL_DISPATCH'),
  name: z.string().min(1, 'Dispatch name is required').max(200),
  labelIds: z.array(z.string().min(1)).min(1, 'Select at least one label'),
  ...addressFields,
})

/** Combined create schema — accepts either type */
export const createShipmentSchema = z.discriminatedUnion('type', [
  createCargoShipmentSchema,
  createDispatchShipmentSchema,
])

export const updateShipmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  destinationAddress: z.string().optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLng: z.number().min(-180).max(180).optional(),
  shareEnabled: z.boolean().optional(),
  status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
  consigneePhone: z.string().max(30).optional(),
})

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>
export type CreateCargoShipmentInput = z.infer<typeof createCargoShipmentSchema>
export type CreateDispatchShipmentInput = z.infer<typeof createDispatchShipmentSchema>
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>
