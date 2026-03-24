import type { Metadata } from 'next'
import { LabelGeneratorForm } from '@/components/admin/label-generator-form'

export const metadata: Metadata = {
  title: 'Generate Labels',
  description: 'Generate TIP label PDFs with unique QR codes',
}

export default function GenerateLabelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generate Labels</h1>
        <p className="text-muted-foreground">
          Generate print-ready label PDFs with unique QR codes and serial numbers.
          Each label will be registered in inventory.
        </p>
      </div>
      <LabelGeneratorForm />
    </div>
  )
}
