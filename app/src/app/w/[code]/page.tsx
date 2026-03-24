import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function ShortLabelRedirect({ params }: PageProps) {
  const { code } = await params
  redirect(`/activate/w${code}`)
}
