'use client'

import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Loader2 } from 'lucide-react'
import { AddressCard, type SavedAddressData } from '@/components/addresses/address-card'
import { AddressFormDialog } from '@/components/addresses/address-form-dialog'
import type { SavedAddressInput } from '@/lib/validations/address'

export function AddressBookList() {
  const [addresses, setAddresses] = useState<SavedAddressData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<
    (SavedAddressInput & { id: string }) | undefined
  >(undefined)

  const fetchAddresses = useCallback(async (q = '') => {
    try {
      const url = q
        ? `/api/v1/addresses?q=${encodeURIComponent(q)}`
        : '/api/v1/addresses'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setAddresses(data.addresses)
      }
    } catch {
      // silently fail; user sees empty state
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAddresses(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchAddresses])

  const handleRefresh = () => {
    fetchAddresses(search)
  }

  const handleEdit = (address: SavedAddressData) => {
    setEditingAddress({
      id: address.id,
      label: address.label,
      name: address.name,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      state: address.state ?? '',
      postalCode: address.postalCode,
      country: address.country,
    })
    setDialogOpen(true)
  }

  const handleAddNew = () => {
    setEditingAddress(undefined)
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      {/* Toolbar: search + add button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search addresses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Address
        </Button>
      </div>

      {/* Grid of address cards */}
      {addresses.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {search
            ? 'No addresses match your search.'
            : 'No saved addresses yet. Add your first one!'}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleEdit}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <AddressFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingAddress(undefined)
        }}
        onSuccess={handleRefresh}
        initialData={editingAddress}
      />
    </>
  )
}
