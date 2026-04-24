'use client'

import { Check, X, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

interface ComparisonFeature {
  name: string
  description: string
  tip: boolean | string
  rfid: boolean | string
  bluetooth: boolean | string
  enterprise: boolean | string
}

function buildFeatures(tipCostLabel: string): ComparisonFeature[] {
  return baseFeatures.map((f) =>
    f.name === 'Cost Per Shipment' ? { ...f, tip: tipCostLabel } : f
  )
}

const baseFeatures: ComparisonFeature[] = [
  {
    name: 'No Scanners or Readers Needed',
    description: 'Works with any smartphone camera',
    tip: true,
    rfid: false,
    bluetooth: false,
    enterprise: true,
  },
  {
    name: 'No Subscription Fees',
    description: 'One-time purchase, everything included',
    tip: true,
    rfid: false,
    bluetooth: false,
    enterprise: false,
  },
  {
    name: 'Instant Activation',
    description: 'Ready to track in under 30 seconds',
    tip: '< 30 sec',
    rfid: '5-15 min',
    bluetooth: '2-5 min',
    enterprise: '1-5 min',
  },
  {
    name: 'No Return Logistics',
    description: 'Disposable — no reverse shipping required',
    tip: true,
    rfid: true,
    bluetooth: false,
    enterprise: false,
  },
  {
    name: 'Shareable Tracking Links',
    description: 'Anyone can track — no app or account needed',
    tip: true,
    rfid: false,
    bluetooth: false,
    enterprise: false,
  },
  {
    name: 'Global Coverage',
    description: 'Track across borders on land, sea, and air',
    tip: '180+ countries',
    rfid: 'Facility only',
    bluetooth: '~30m range',
    enterprise: '180+ countries',
  },
  {
    name: 'AI Route Intelligence',
    description: 'Auto-detect flights, vessels, road transport',
    tip: true,
    rfid: false,
    bluetooth: false,
    enterprise: false,
  },
  {
    name: 'Battery Life',
    description: 'Tracking duration per device',
    tip: '60+ days',
    rfid: 'No battery',
    bluetooth: '1-6 months',
    enterprise: '10-60 days',
  },
  {
    name: 'Cost Per Shipment',
    description: 'All-in price to track one shipment',
    tip: 'From $20',
    rfid: '$0.10-2 + reader',
    bluetooth: '$10-30 + gateway',
    enterprise: '$100-500+',
  },
]

const columns = [
  { key: 'tip' as const, label: 'TIP', highlight: true },
  { key: 'rfid' as const, label: 'Traditional RFID' },
  { key: 'bluetooth' as const, label: 'Bluetooth Trackers' },
  { key: 'enterprise' as const, label: 'Enterprise Trackers' },
]

function CellValue({ value, highlight }: { value: boolean | string; highlight?: boolean }) {
  if (typeof value === 'string') {
    return (
      <span className={cn('text-sm', highlight ? 'font-semibold text-white' : 'text-gray-400')}>
        {value}
      </span>
    )
  }
  if (value) {
    return <Check className={cn('mx-auto h-5 w-5', highlight ? 'text-[#00FF2B]' : 'text-[#00FF2B]/70')} />
  }
  return <X className="mx-auto h-5 w-5 text-gray-600" />
}

/* ─── Desktop Table ──────────────────────────────────────────────── */
function DesktopTable({ items }: { items: ComparisonFeature[] }) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/10">
            <TableHead className="w-[260px] text-base text-gray-400">Feature</TableHead>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  'text-center text-base',
                  col.highlight && 'rounded-t-lg border-x border-t border-[#00FF2B]/30 bg-[#00FF2B]/5'
                )}
              >
                {col.highlight && (
                  <span className="mb-1 inline-block rounded-full bg-[#00FF2B] px-3 py-0.5 text-xs font-medium text-black">
                    Best Value
                  </span>
                )}
                <div className={cn('text-gray-300', col.highlight && 'font-bold text-white')}>{col.label}</div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((feature, i) => (
            <TableRow key={feature.name} className={cn('border-white/5', i % 2 === 0 && 'bg-white/[0.02]')}>
              <TableCell className="font-medium text-white">
                <div>{feature.name}</div>
                <div className="text-xs text-gray-500">{feature.description}</div>
              </TableCell>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn('text-center', col.highlight && 'border-x border-[#00FF2B]/30 bg-[#00FF2B]/5')}
                >
                  <CellValue value={feature[col.key]} highlight={col.highlight} />
                </TableCell>
              ))}
            </TableRow>
          ))}
          {/* Bottom border for TIP column */}
          <TableRow className="border-0">
            <TableCell />
            {columns.map((col) => (
              <TableCell
                key={col.key}
                className={cn(col.highlight && 'rounded-b-lg border-x border-b border-[#00FF2B]/30')}
              />
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

/* ─── Mobile Cards ───────────────────────────────────────────────── */
function MobileCards({ items }: { items: ComparisonFeature[] }) {
  return (
    <div className="space-y-4 md:hidden">
      {items.map((feature) => (
        <div key={feature.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="font-semibold text-white">{feature.name}</h3>
          <p className="mt-1 text-xs text-gray-500">{feature.description}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {columns.map((col) => {
              const value = feature[col.key]
              return (
                <div
                  key={col.key}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                    col.highlight
                      ? 'border border-[#00FF2B]/20 bg-[#00FF2B]/10 font-medium'
                      : 'bg-white/[0.03]'
                  )}
                >
                  {typeof value === 'boolean' ? (
                    value ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#00FF2B]" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0 text-gray-600" />
                    )
                  ) : (
                    <Minus className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  )}
                  <div>
                    <div className="text-gray-500">{col.label}</div>
                    {typeof value === 'string' && (
                      <div className={cn('font-medium', col.highlight ? 'text-[#00FF2B]' : 'text-white')}>
                        {value}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ComparisonTable({ tipCostLabel = 'From $20' }: { tipCostLabel?: string }) {
  const items = buildFeatures(tipCostLabel)
  return (
    <>
      <DesktopTable items={items} />
      <MobileCards items={items} />
    </>
  )
}
