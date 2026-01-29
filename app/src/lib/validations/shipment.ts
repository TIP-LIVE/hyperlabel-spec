import { z } from 'zod'

export const createShipmentSchema = z.object({
  name: z.string().min(1, 'Shipment name is required').max(200),
  labelId: z.string().min(1, 'Label ID is required'),
  originAddress: z.string().optional(),
  originLat: z.number().min(-90).max(90).optional(),
  originLng: z.number().min(-180).max(180).optional(),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
})

export const updateShipmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  destinationAddress: z.string().optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLng: z.number().min(-180).max(180).optional(),
  shareEnabled: z.boolean().optional(),
  status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
})

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>
