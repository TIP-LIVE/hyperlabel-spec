import { PageHeader } from '@/components/ui/page-header'
import { AddressBookList } from '@/components/addresses/address-book-list'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Address Book | TIP',
  description: 'Manage your saved shipping addresses',
}

export default function AddressBookPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Address Book"
        description="Save and manage your shipping addresses for quick reuse"
      />
      <AddressBookList />
    </div>
  )
}
