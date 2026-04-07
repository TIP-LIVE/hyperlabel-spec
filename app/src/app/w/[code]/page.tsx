import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function ShortLabelRedirect({ params }: PageProps) {
  const { code } = await params
  // 9-digit NNNNNYYYY displayId → pass through as-is.
  // Legacy numeric codes get the `w` prefix restored (tip.live/w/17246198247 → /activate/w17246198247).
  const target = /^\d{9}$/.test(code) ? `/activate/${code}` : `/activate/w${code}`
  redirect(target)
}
