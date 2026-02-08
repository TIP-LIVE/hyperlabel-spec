'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'

interface ShareLinkButtonProps {
  shareCode: string
  trackingUrl: string
  className?: string
}

export function ShareLinkButton({ shareCode, trackingUrl, className }: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl)
      setCopied(true)
      toast.success('Tracking link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Tracking Link</DialogTitle>
          <DialogDescription>
            Share this link with your consignee so they can track the shipment without creating
            an account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-white p-4">
            <QRCodeSVG
              value={trackingUrl}
              size={160}
              level="M"
              includeMargin={false}
            />
            <p className="text-xs text-gray-500">
              Scan to track shipment
            </p>
          </div>

          {/* Tracking Link */}
          <div className="space-y-2">
            <Label>Tracking Link</Label>
            <div className="flex gap-2">
              <Input value={trackingUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={copyToClipboard} aria-label="Copy tracking link">
                {copied ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Share Code */}
          <div className="space-y-2">
            <Label>Share Code</Label>
            <p className="rounded-lg bg-muted px-3 py-2 font-mono text-sm">{shareCode}</p>
            <p className="text-xs text-muted-foreground">
              Your consignee can use this code on the tracking page
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={copyToClipboard} className="flex-1 gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy Link
            </Button>
            <Button variant="outline" asChild>
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
