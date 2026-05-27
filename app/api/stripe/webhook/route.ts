import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

const PLAN_BY_PRICE: Record<string, { plan: string; limit: number }> = {
  [process.env.STRIPE_PRO_PRICE_ID ?? '']: { plan: 'pro', limit: 999999 },
  [process.env.STRIPE_AGENCY_PRICE_ID ?? '']: { plan: 'agency', limit: 999999 },
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const subscriptionId = session.subscription as string

    if (!userId || !subscriptionId) return NextResponse.json({ received: true })

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId = subscription.items.data[0]?.price?.id
    const planData = PLAN_BY_PRICE[priceId] ?? { plan: 'pro', limit: 999999 }

    await supabase.from('users').update({
      plan: planData.plan,
      generations_limit: planData.limit,
      stripe_subscription_id: subscriptionId,
      subscription_status: subscription.status,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    }).eq('id', userId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata?.userId

    if (userId) {
      await supabase.from('users').update({
        plan: 'free',
        generations_limit: 10,
        stripe_subscription_id: null,
        subscription_status: 'canceled',
      }).eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata?.userId

    if (userId) {
      const priceId = subscription.items.data[0]?.price?.id
      const planData = PLAN_BY_PRICE[priceId] ?? { plan: 'pro', limit: 999999 }

      await supabase.from('users').update({
        plan: planData.plan,
        subscription_status: subscription.status,
        subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }).eq('id', userId)
    }
  }

  return NextResponse.json({ received: true })
}
