import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Documentation',
  description: 'HyperLabel API documentation for developers',
}

const endpoints = [
  {
    category: 'Authentication',
    description: 'All authenticated endpoints require a valid session from Clerk.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/user',
        description: 'Get current authenticated user',
        auth: true,
      },
      {
        method: 'GET',
        path: '/api/v1/user/preferences',
        description: 'Get notification preferences',
        auth: true,
      },
      {
        method: 'PATCH',
        path: '/api/v1/user/preferences',
        description: 'Update notification preferences',
        auth: true,
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
      },
      {
        method: 'POST',
        path: '/api/v1/shipments',
        description: 'Create a new shipment',
        auth: true,
      },
      {
        method: 'GET',
        path: '/api/v1/shipments/[id]',
        description: 'Get shipment details with locations',
        auth: true,
      },
      {
        method: 'PATCH',
        path: '/api/v1/shipments/[id]',
        description: 'Update shipment details',
        auth: true,
      },
      {
        method: 'DELETE',
        path: '/api/v1/shipments/[id]',
        description: 'Cancel shipment (soft delete)',
        auth: true,
      },
    ],
  },
  {
    category: 'Labels',
    description: 'Manage GPS tracking labels.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/labels',
        description: 'List available labels for shipment creation',
        auth: true,
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
      },
    ],
  },
  {
    category: 'Public Tracking',
    description: 'Public endpoints for shipment tracking.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/track/[code]',
        description: 'Get public tracking data by share code',
        auth: false,
      },
    ],
  },
  {
    category: 'Device Integration',
    description: 'Endpoints for GPS device communication.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/device/report',
        description: 'Receive location reports from devices',
        auth: false,
        note: 'Requires device API key',
      },
      {
        method: 'POST',
        path: '/api/v1/device/activate',
        description: 'Activate a label after QR scan',
        auth: true,
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
      },
      {
        method: 'GET',
        path: '/api/health/ready',
        description: 'Readiness check for deployments',
        auth: false,
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
        note: 'Requires Clerk signature',
      },
      {
        method: 'POST',
        path: '/api/webhooks/stripe',
        description: 'Stripe payment webhook',
        auth: false,
        note: 'Requires Stripe signature',
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
          HyperLabel API reference for integrating GPS tracking into your logistics workflow.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="rounded bg-muted px-3 py-2 font-mono text-sm">
            https://hyperlabel.io
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

      <div className="space-y-8">
        {endpoints.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <CardTitle>{category.category}</CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {category.endpoints.map((endpoint, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={methodColors[endpoint.method]}>
                        {endpoint.method}
                      </Badge>
                      <code className="font-mono text-sm">{endpoint.path}</code>
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
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
{`{
  "error": "Error message",
  "details": { ... }  // Optional validation details
}`}
          </pre>
          <div className="space-y-2">
            <p className="text-sm font-medium">Common HTTP Status Codes:</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li><strong>200</strong> - Success</li>
              <li><strong>400</strong> - Bad Request (validation error)</li>
              <li><strong>401</strong> - Unauthorized (missing/invalid auth)</li>
              <li><strong>403</strong> - Forbidden (insufficient permissions)</li>
              <li><strong>404</strong> - Not Found</li>
              <li><strong>500</strong> - Internal Server Error</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
