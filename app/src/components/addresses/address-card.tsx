'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { MoreVertical, Star, StarOff, Pencil, Trash2 } from 'lucide-react'
import { getCountryName } from '@/lib/constants/countries'
import { cn } from '@/lib/utils'

export interface SavedAddressData {
  id: string
  label: string
  name: string
  line1: string
  line2: string | null
  city: string
  state: string | null
  postalCode: string
  country: string
  isDefault: boolean
}

interface AddressCardProps {
  address: SavedAddressData
  onEdit: (address: SavedAddressData) => void
  onRefresh: () => void
}

export function AddressCard({ address, onEdit, onRefresh }: AddressCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleToggleDefault = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/addresses/${address.id}/default`, {
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to update default')
      toast.success(address.isDefault ? 'Default removed' : 'Set as default address')
      onRefresh()
    } catch {
      toast.error('Failed to update default address')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/addresses/${address.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Address deleted')
      onRefresh()
    } catch {
      toast.error('Failed to delete address')
    } finally {
      setLoading(false)
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <Card
        className={cn(
          'relative transition-colors',
          address.isDefault && 'border-primary ring-1 ring-primary'
        )}
      >
        <CardContent className="p-4">
          {/* Header: label + badge + menu */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{address.label}</h3>
              {address.isDefault && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="mr-1 h-3 w-3 fill-current" />
                  Default
                </Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(address)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleDefault} disabled={loading}>
                  {address.isDefault ? (
                    <>
                      <StarOff className="mr-2 h-4 w-4" />
                      Remove Default
                    </>
                  ) : (
                    <>
                      <Star className="mr-2 h-4 w-4" />
                      Set as Default
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Address details */}
          <div className="mt-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{address.name}</p>
            <p>{address.line1}</p>
            {address.line2 && <p>{address.line2}</p>}
            <p>
              {address.city}
              {address.state ? `, ${address.state}` : ''} {address.postalCode}
            </p>
            <p>{getCountryName(address.country)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{address.label}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This address will be permanently removed from your address book. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
