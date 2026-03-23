import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { InterviewRunner } from '@/components/admin/research/interview-runner'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Interview Runner',
  description: 'Run a research interview',
}

export default async function InterviewRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const interview = await db.researchInterview.findUnique({
    where: { id },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          role: true,
          persona: true,
          status: true,
          screeningNotes: true,
          pilotInterest: true,
        },
      },
    },
  })

  if (!interview) {
    notFound()
  }

  // Find the approved script for this lead's persona
  const script = await db.researchScript.findFirst({
    where: {
      persona: interview.lead.persona,
      status: 'APPROVED',
    },
    orderBy: { version: 'desc' },
  })

  // Load hypotheses for signal tracking
  const hypotheses = await db.researchHypothesis.findMany({
    orderBy: { code: 'asc' },
  })

  return (
    <InterviewRunner
      interview={{
        id: interview.id,
        scheduledAt: interview.scheduledAt?.toISOString() || null,
        completedAt: interview.completedAt?.toISOString() || null,
        duration: interview.duration,
        status: interview.status,
        notes: interview.notes as Record<string, string> | null,
        keyQuotes: interview.keyQuotes as Array<{ quote: string; context: string; theme: string }> | null,
        hypothesisSignals: interview.hypothesisSignals as Array<{ hypothesisId: string; signal: 'validating' | 'neutral' | 'invalidating'; evidence: string }> | null,
        lead: {
          id: interview.lead.id,
          name: interview.lead.name,
          email: interview.lead.email,
          company: interview.lead.company,
          role: interview.lead.role,
          persona: interview.lead.persona,
          screeningNotes: interview.lead.screeningNotes,
          pilotInterest: interview.lead.pilotInterest,
        },
      }}
      script={
        script
          ? {
              id: script.id,
              title: script.title,
              persona: script.persona,
              sections: script.sections as Array<{
                title: string
                duration: number
                questions: { text: string; probes: string[] }[]
              }>,
              status: script.status,
            }
          : null
      }
      hypotheses={hypotheses.map((h) => ({
        id: h.id,
        code: h.code,
        statement: h.statement,
      }))}
    />
  )
}
