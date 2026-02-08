'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ToggleRoleButtonProps {
  userId: string
  currentRole: string
}

export function ToggleRoleButton({ userId, currentRole }: ToggleRoleButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isAdmin = currentRole === 'admin'
  const newRole = isAdmin ? 'user' : 'admin'

  const handleToggle = async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (res.ok) {
        toast.success(`User role updated to ${newRole}`)
        router.refresh()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Error toggling role:', error)
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-gray-700 text-gray-300"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : isAdmin ? (
            <ShieldOff className="mr-1 h-3 w-3" />
          ) : (
            <ShieldCheck className="mr-1 h-3 w-3" />
          )}
          {isAdmin ? 'Remove Admin' : 'Make Admin'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-gray-800 bg-gray-900">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            {isAdmin ? 'Remove Admin Role' : 'Grant Admin Role'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isAdmin
              ? 'This user will lose access to the admin panel. They will only be able to use the regular dashboard.'
              : 'This user will gain full access to the admin panel, including user management, order fulfillment, and device monitoring.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-gray-700 text-gray-300">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleToggle}
            className={isAdmin ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isAdmin ? 'Remove Admin' : 'Make Admin'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
