'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Copy, Send, Check } from 'lucide-react'

interface Props {
  shipmentId: string
  shareLink: string
  onClose: () => void
}

/**
 * Modal shown right after a dispatch is created with blank receiver details.
 * Gives the buyer a copyable share link and a one-field form to email it
 * directly to the receiver.
 */
export function ShareReceiverLinkModal({ shipmentId, shareLink, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState(
    "Hi! Please add your shipping address so I can send you the TIP tracking labels."
  )
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — select and copy manually')
    }
  }

  const send = async () => {
    if (!email) return
    setSending(true)
    try {
      const res = await fetch(`/api/v1/dispatch/${shipmentId}/send-share-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, note }),
      })
      if (res.ok) {
        setSent(true)
        toast.success('Share link sent to receiver')
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to send email')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share with receiver</DialogTitle>
          <DialogDescription>
            Send this link to the person receiving the labels. They&apos;ll fill in their own
            delivery details — no account needed. Link expires in 14 days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Copyable link */}
          <div className="space-y-1.5">
            <Label>Share link</Label>
            <div className="flex gap-2">
              <Input value={shareLink} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Send via email */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="receiver-share-email">Send by email</Label>
              <Input
                id="receiver-share-email"
                type="email"
                placeholder="receiver@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sent}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receiver-share-note">Message (optional)</Label>
              <Input
                id="receiver-share-note"
                placeholder="Hi — here's the link to share your shipping address."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={sent}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={send}
              disabled={!email || sending || sent}
            >
              {sending ? (
                'Sending…'
              ) : sent ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Sent
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Send email
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
