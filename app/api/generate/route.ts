import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCreatives } from '@/lib/claude'
import type { OnboardingData } from '@/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check usage limits for free plan
    const { data: profile } = await supabase
      .from('users')
      .select('plan, generations_used, generations_limit')
      .eq('id', user.id)
      .single()

    if (profile?.plan === 'free' && (profile.generations_used ?? 0) >= (profile.generations_limit ?? 10)) {
      return NextResponse.json(
        { error: 'Free generation limit reached. Please upgrade to Pro for unlimited generations.' },
        { status: 402 }
      )
    }

    const body = await req.json() as OnboardingData

    if (!body.vertical || !body.platform || !body.emotion || !body.style || !body.offerDetails) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create a generation record
    const { data: generation } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        onboarding_data: body,
        status: 'generating',
        title: `${body.vertical} · ${body.platform}`,
      })
      .select()
      .single()

    let result
    try {
      result = await generateCreatives(body)
    } catch (aiError) {
      if (generation?.id) {
        await supabase.from('generations').update({ status: 'error' }).eq('id', generation.id)
      }
      throw aiError
    }

    // Update generation with result and increment usage
    await Promise.all([
      generation?.id
        ? supabase.from('generations').update({ result, status: 'done' }).eq('id', generation.id)
        : Promise.resolve(),
      supabase.rpc('increment_generations_used', { user_id: user.id }).catch(() =>
        supabase.from('users').update({ generations_used: (profile?.generations_used ?? 0) + 1 }).eq('id', user.id)
      ),
    ])

    return NextResponse.json({ result, generationId: generation?.id })
  } catch (err) {
    console.error('[/api/generate]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
