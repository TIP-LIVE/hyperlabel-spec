import { redirect } from 'next/navigation'

// Redirect old /shipments to /cargo (primary shipment type)
export default function ShipmentsRedirectPage() {
  redirect('/cargo')
}
