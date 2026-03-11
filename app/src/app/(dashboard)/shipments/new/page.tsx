import { redirect } from 'next/navigation'

// Redirect old /shipments/new to /cargo/new
export default function NewShipmentRedirectPage() {
  redirect('/cargo/new')
}
