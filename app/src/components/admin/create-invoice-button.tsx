'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { FileText, Loader2, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

const schema = z.object({
  orgId: z.string().min(1, 'Organisation is required'),
  quantity: z.number().int().min(1, 'At least 1').max(1000),
  totalAmount: z.number().min(0),
  currency: z.string().length(3),
})

type FormValues = z.infer<typeof schema>

interface CreateInvoiceButtonProps {
  /** orgId → display name, from Clerk */
  orgNames: Record<string, string>
}

export function CreateInvoiceButton({ orgNames }: CreateInvoiceButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { orgId: '', quantity: 1, totalAmount: 0, currency: 'GBP' },
  })

  const selectedOrgId = watch('orgId')
  const currency = watch('currency')

  const orgOptions = useMemo(() => {
    const entries = Object.entries(orgNames).map(([id, name]) => ({ id, name }))
    entries.sort((a, b) => a.name.localeCompare(b.name))
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
    )
  }, [orgNames, search])

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      reset({ orgId: '', quantity: 1, totalAmount: 0, currency: 'GBP' })
      setSearch('')
    }
  }

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: data.orgId,
          quantity: data.quantity,
          totalAmount: Math.round((Number.isFinite(data.totalAmount) ? data.totalAmount : 0) * 100),
          currency: data.currency,
        }),
      })

      if (res.ok) {
        toast.success(
          `Invoice created: ${data.quantity} dispatch slot${data.quantity > 1 ? 's' : ''} for ${orgNames[data.orgId] ?? data.orgId}`,
        )
        setOpen(false)
        router.refresh()
      } else {
        const error = await res.json().catch(() => ({ error: 'Request failed' }))
        toast.error(error.error || 'Failed to create invoice')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-border text-foreground">
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Invoice / Order</DialogTitle>
          <DialogDescription>
            Creates a PAID order that gives the organisation N dispatch slots. Use for invoice-paid
            corporate clients or free samples. Amount can be 0.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-search">Organisation</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="org-search"
                placeholder="Search organisations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border bg-muted pl-8 text-foreground"
              />
            </div>
            <Select
              value={selectedOrgId || ''}
              onValueChange={(v) => setValue('orgId', v, { shouldValidate: true })}
            >
              <SelectTrigger className="border-border bg-muted text-foreground">
                <SelectValue placeholder="Select organisation" />
              </SelectTrigger>
              <SelectContent>
                {orgOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No matches</div>
                ) : (
                  orgOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.orgId && <p className="text-sm text-destructive">{errors.orgId.message}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity (labels)</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={1000}
                {...register('quantity', { valueAsNumber: true })}
                className="border-border bg-muted font-mono text-foreground"
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalAmount">Amount ({currency})</Label>
              <Input
                id="totalAmount"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                {...register('totalAmount', { valueAsNumber: true })}
                className="border-border bg-muted font-mono text-foreground"
              />
              <p className="text-xs text-muted-foreground">0 for free samples</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={(v) => setValue('currency', v)}
            >
              <SelectTrigger id="currency" className="border-border bg-muted text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
