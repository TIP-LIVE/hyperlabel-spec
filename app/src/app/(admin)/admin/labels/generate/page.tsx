import type { Metadata } from 'next'
import { LabelProvisionForm } from '@/components/admin/label-provision-form'

export const metadata: Metadata = {
  title: 'Provision Label',
  description: 'Scan a modem QR to create a print-ready TIP label',
}

export default function ProvisionLabelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Provision Label</h1>
        <p className="text-muted-foreground">
          Scan the QR code printed on the modem PCB to extract its IMEI, then
          create a single print-ready sticker PDF. One label at a time.
        </p>
      </div>
      <LabelProvisionForm />
    </div>
  )
}
