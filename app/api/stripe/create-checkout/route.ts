import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PLANS, createOrRetrieveCustomer, createCheckoutSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await req.json() as { plan: 'pro' | 'agency' }

    if (!PLANS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const customerId = await createOrRetrieveCustomer(
      user.id,
      user.email!,
      profile?.stripe_customer_id
    )

    if (!profile?.stripe_customer_id) {
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const url = await createCheckoutSession(customerId, PLANS[plan].priceId, user.id, appUrl)

    return NextResponse.json({ url })
  } catch (err) {
    console.error('[/api/stripe/create-checkout]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
