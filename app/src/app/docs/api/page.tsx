import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Documentation',
  description: 'TIP API documentation for developers',
}

interface Endpoint {
  method: string
  path: string
  description: string
  auth: boolean
  note?: string
  request?: string
  response?: string
}

interface EndpointCategory {
  category: string
  description: string
  endpoints: Endpoint[]
}

const endpoints: EndpointCategory[] = [
  {
    category: 'Authentication',
    description: 'All authenticated endpoints require a valid session from Clerk.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/user',
        description: 'Get current authenticated user',
        auth: true,
        response: `{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "user",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}`,
      },
      {
        method: 'GET',
        path: '/api/v1/user/preferences',
        description: 'Get notification preferences',
        auth: true,
        response: `{
  "preferences": {
    "emailNotifications": true,
    "deliveryAlerts": true,
    "lowBatteryAlerts": true
  }
}`,
      },
      {
        method: 'PATCH',
        path: '/api/v1/user/preferences',
        description: 'Update notification preferences',
        auth: true,
        request: `{
  "emailNotifications": false,
  "deliveryAlerts": true
}`,
        response: `{
  "preferences": {
    "emailNotifications": false,
    "deliveryAlerts": true,
    "lowBatteryAlerts": true
  }
}`,
      },
    ],
  },
  {
    category: 'Shipments',
    description: 'Manage cargo shipments and tracking.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/shipments',
        description: 'List user shipments (supports ?status filter)',
        auth: true,
        response: `{
  "shipments": [
    {
      "id": "clxyz123",
      "name": "Electronics to Berlin",
      "status": "IN_TRANSIT",
      "shareCode": "RYbEAxJF",
      "originAddress": "45 Warehouse Rd, London, UK",
      "destinationAddress": "123 Main St, Berlin, Germany",
      "createdAt": "2025-01-20T14:00:00.000Z",
      "label": {
        "id": "lbl_001",
        "deviceId": "HL-001001",
        "batteryPct": 85,
        "status": "ACTIVE"
      }
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}`,
      },
      {
        method: 'POST',
        path: '/api/v1/shipments',
        description: 'Create a new shipment',
        auth: true,
        request: `{
  "name": "Electronics to Berlin",
  "labelId": "clxyz_label_id",
  "originAddress": "45 Warehouse Rd, London, UK",
  "originLat": 51.5074,
  "originLng": -0.1278,
  "destinationAddress": "123 Main St, Berlin, Germany",
  "destinationLat": 52.5200,
  "destinationLng": 13.4050,
  "photoUrls": []
}`,
        response: `{
  "shipment": {
    "id": "clxyz123",
    "name": "Electronics to Berlin",
    "status": "PENDING",
    "shareCode": "RYbEAxJF",
    "originAddress": "45 Warehouse Rd, London, UK",
    "destinationAddress": "123 Main St, Berlin, Germany",
    "createdAt": "2025-01-20T14:00:00.000Z"
  }
}`,
      },
      {
        method: 'GET',
        path: '/api/v1/shipments/[id]',
        description: 'Get shipment details with locations',
        auth: true,
        response: `{
  "shipment": {
    "id": "clxyz123",
    "name": "Electronics to Berlin",
    "status": "IN_TRANSIT",
    "shareCode": "RYbEAxJF",
    "locations": [
      {
        "id": "loc_001",
        "latitude": 51.5074,
        "longitude": -0.1278,
        "batteryPct": 92,
        "accuracyM": 15,
        "recordedAt": "2025-01-20T15:00:00.000Z"
      }
    ],
    "label": {
      "deviceId": "HL-001001",
      "batteryPct": 85
    }
  }
}`,
      },
      {
        method: 'PATCH',
        path: '/api/v1/shipments/[id]',
        description: 'Update shipment details',
        auth: true,
        request: `{
  "name": "Updated name",
  "shareEnabled": false
}`,
        response: `{
  "shipment": { ... }
}`,
      },
      {
        method: 'DELETE',
        path: '/api/v1/shipments/[id]',
        description: 'Cancel shipment (soft delete)',
        auth: true,
        response: `{
  "success": true
}`,
      },
    ],
  },
  {
    category: 'Labels',
    description: 'Manage tracking labels.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/labels',
        description: 'List available labels for shipment creation',
        auth: true,
        response: `{
  "labels": [
    {
      "id": "lbl_001",
      "deviceId": "HL-001001",
      "status": "SOLD",
      "batteryPct": 100,
      "activatedAt": null
    }
  ]
}`,
      },
    ],
  },
  {
    category: 'Orders',
    description: 'Label purchase and order management.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/orders',
        description: 'List user orders',
        auth: true,
        response: `{
  "orders": [
    {
      "id": "ord_abc123",
      "status": "PAID",
      "quantity": 5,
      "totalAmount": 11000,
      "currency": "USD",
      "trackingNumber": null,
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}`,
      },
      {
        method: 'GET',
        path: '/api/v1/orders/[id]',
        description: 'Get order details with labels',
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/v1/checkout',
        description: 'Create Stripe checkout session',
        auth: true,
        request: `{
  "packType": "team",
  "shippingAddress": {
    "name": "Jane Doe",
    "line1": "123 Main St",
    "city": "London",
    "state": "",
    "postalCode": "SW1A 1AA",
    "country": "GB"
  }
}`,
        response: `{
  "url": "https://checkout.stripe.com/c/pay/cs_...",
  "sessionId": "cs_live_..."
}`,
      },
    ],
  },
  {
    category: 'Public Tracking',
    description: 'Public endpoints for shipment tracking. No authentication required.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/track/[code]',
        description: 'Get public tracking data by share code',
        auth: false,
        response: `{
  "shipment": {
    "name": "Electronics to Berlin",
    "status": "IN_TRANSIT",
    "destinationAddress": "Berlin, Germany",
    "locations": [
      {
        "latitude": 52.3676,
        "longitude": 9.7389,
        "batteryPct": 78,
        "recordedAt": "2025-01-21T08:30:00.000Z"
      }
    ],
    "label": {
      "deviceId": "HL-001001",
      "batteryPct": 78
    }
  }
}`,
      },
    ],
  },
  {
    category: 'Delivery Confirmation',
    description: 'Public endpoint for consignee delivery confirmation.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/track/[code]/confirm',
        description: 'Confirm delivery (by recipient)',
        auth: false,
        request: `{
  "receiverName": "John Smith",
  "notes": "Received in good condition"
}`,
        response: `{
  "success": true,
  "message": "Delivery confirmed"
}`,
      },
    ],
  },
  {
    category: 'Device Integration',
    description: 'Endpoints for device communication.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/device/report',
        description: 'Receive location reports from devices',
        auth: false,
        note: 'Requires device API key in X-API-Key header',
        request: `{
  "deviceId": "HL-001001",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "batteryPct": 85,
  "accuracyM": 10,
  "recordedAt": "2025-01-20T15:00:00.000Z"
}`,
        response: `{
  "success": true,
  "eventId": "evt_abc123"
}`,
      },
      {
        method: 'POST',
        path: '/api/v1/device/activate',
        description: 'Activate a label after QR scan',
        auth: true,
        request: `{
  "labelId": "lbl_001"
}`,
        response: `{
  "label": {
    "id": "lbl_001",
    "status": "ACTIVE",
    "activatedAt": "2025-01-20T14:30:00.000Z"
  }
}`,
      },
    ],
  },
  {
    category: 'Statistics',
    description: 'Dashboard statistics.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/stats',
        description: 'Get dashboard statistics',
        auth: true,
        response: `{
  "activeShipments": 3,
  "totalLabels": 10,
  "deliveredThisMonth": 5,
  "lowBatteryLabels": 1
}`,
      },
    ],
  },
  {
    category: 'Account',
    description: 'Account management and GDPR compliance.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/user/export',
        description: 'Export all user data (GDPR)',
        auth: true,
        response: `{
  "user": { ... },
  "orders": [ ... ],
  "shipments": [ ... ],
  "exportedAt": "2025-01-20T10:00:00.000Z"
}`,
      },
      {
        method: 'DELETE',
        path: '/api/v1/user/delete',
        description: 'Delete account and all data (GDPR)',
        auth: true,
        request: `{
  "confirm": "DELETE"
}`,
        response: `{
  "success": true,
  "message": "Account and all associated data have been permanently deleted."
}`,
      },
    ],
  },
  {
    category: 'Health',
    description: 'Service health and readiness checks.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Health check with dependency status',
        auth: false,
        response: `{
  "status": "healthy",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "dependencies": {
    "database": "connected",
    "stripe": "configured",
    "clerk": "configured"
  }
}`,
      },
      {
        method: 'GET',
        path: '/api/health/ready',
        description: 'Readiness check for deployments',
        auth: false,
        response: `{
  "ready": true
}`,
      },
    ],
  },
  {
    category: 'Webhooks',
    description: 'Webhook endpoints for third-party services.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/webhooks/clerk',
        description: 'Clerk user sync webhook',
        auth: false,
        note: 'Requires Clerk signature verification',
      },
      {
        method: 'POST',
        path: '/api/webhooks/stripe',
        description: 'Stripe payment webhook',
        auth: false,
        note: 'Requires Stripe signature verification',
      },
    ],
  },
]

const methodColors: Record<string, string> = {
  GET: 'bg-green-500/20 text-green-700',
  POST: 'bg-blue-500/20 text-blue-700',
  PATCH: 'bg-yellow-500/20 text-yellow-700',
  DELETE: 'bg-red-500/20 text-red-700',
}

export default function ApiDocsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">API Documentation</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          TIP API reference for integrating cargo tracking into your logistics workflow.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="rounded bg-muted px-3 py-2 font-mono text-sm">
            https://tip.live
          </code>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            Most endpoints require authentication via Clerk session cookies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Authenticated requests must include a valid session cookie from Clerk.
            For server-to-server communication, use the Clerk Backend API to verify sessions.
          </p>
          <p className="text-sm text-muted-foreground">
            Device endpoints use API key authentication via the <code className="rounded bg-muted px-1">X-API-Key</code> header.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            API requests are rate-limited to protect service stability. Limits are applied per IP address for public endpoints
            and per authenticated user for private endpoints.
          </p>
          <div className="space-y-2">
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li><strong>Authenticated endpoints</strong> — 100 requests per minute</li>
              <li><strong>Public tracking endpoints</strong> — 30 requests per minute per IP</li>
              <li><strong>Device report endpoint</strong> — 10 requests per minute per device</li>
              <li><strong>Checkout / payment</strong> — 5 requests per minute</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            When you exceed the limit, the API returns <code className="rounded bg-muted px-1">429 Too Many Requests</code>.
            Wait for the window to reset before retrying.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {endpoints.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <CardTitle>{category.category}</CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {category.endpoints.map((endpoint, idx) => (
                  <div key={idx} className="space-y-3">
                    {/* Endpoint header */}
                    <div className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={methodColors[endpoint.method]}>
                          {endpoint.method}
                        </Badge>
                        <code className="break-all font-mono text-sm">{endpoint.path}</code>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{endpoint.description}</span>
                        {endpoint.auth && (
                          <Badge variant="outline" className="text-xs">
                            Auth
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Note */}
                    {endpoint.note && (
                      <p className="ml-4 text-xs text-muted-foreground italic">
                        {endpoint.note}
                      </p>
                    )}

                    {/* Request example */}
                    {endpoint.request && (
                      <div className="ml-4">
                        <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Request Body
                        </p>
                        <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-green-400">
                          {endpoint.request}
                        </pre>
                      </div>
                    )}

                    {/* Response example */}
                    {endpoint.response && (
                      <div className="ml-4">
                        <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Response
                        </p>
                        <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-green-400">
                          {endpoint.response}
                        </pre>
                      </div>
                    )}

                    {/* Divider between endpoints (except last) */}
                    {idx < category.endpoints.length - 1 && (
                      <div className="border-b" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Error Responses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All error responses follow a consistent JSON format:
          </p>
          <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-red-400">
{`{
  "error": "Error message describing what went wrong",
  "details": {           // Optional — present on validation errors
    "fieldErrors": {
      "name": ["Shipment name is required"]
    }
  }
}`}
          </pre>
          <div className="space-y-2">
            <p className="text-sm font-medium">Common HTTP Status Codes:</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li><strong>200</strong> — Success</li>
              <li><strong>201</strong> — Created (new resource)</li>
              <li><strong>400</strong> — Bad Request (validation error or missing confirmation)</li>
              <li><strong>401</strong> — Unauthorized (missing or invalid auth)</li>
              <li><strong>403</strong> — Forbidden (insufficient permissions)</li>
              <li><strong>404</strong> — Not Found</li>
              <li><strong>429</strong> — Too Many Requests (rate limited)</li>
              <li><strong>500</strong> — Internal Server Error</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
