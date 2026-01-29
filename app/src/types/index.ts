// Re-export Prisma types
export type {
  User,
  Label,
  Shipment,
  LocationEvent,
  Order,
  Notification,
  LabelStatus,
  ShipmentStatus,
  OrderStatus,
} from '@prisma/client'

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Device API types (from label.utec.ua)
export interface DeviceDataOut {
  iccid: string
  imei: string
  latitude: number
  longitude: number
  timestamp: string
  onomondo_latitude?: number
  onomondo_longitude?: number
  battery?: number
  signal_strength?: number
  offline_queue?: Array<{
    timestamp: string
    latitude: number
    longitude: number
    battery_pct?: number
  }>
}

// Tracking page types
export interface TrackingData {
  shipment: {
    id: string
    name: string | null
    status: string
    originAddress: string | null
    destinationAddress: string | null
    createdAt: Date
    deliveredAt: Date | null
  }
  currentLocation: {
    latitude: number
    longitude: number
    recordedAt: Date
    batteryPct: number | null
  } | null
  locationHistory: Array<{
    latitude: number
    longitude: number
    recordedAt: Date
  }>
}

// Shipping address type
export interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode: string
  country: string
}
