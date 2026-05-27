import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

export const PLANS = {
  pro: {
    name: 'Pro',
    price: 49,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: [
      'Unlimited generations',
      'All creative formats',
      'PDF / CSV exports',
      'Creative history',
      'Priority support',
    ],
  },
  agency: {
    name: 'Agency',
    price: 149,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID!,
    features: [
      'Everything in Pro',
      'Team workspace (up to 10)',
      'Spy engine',
      'API access',
      'Creative approval flow',
      'Dedicated account manager',
    ],
  },
}

export async function createOrRetrieveCustomer(
  userId: string,
  email: string,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) return existingCustomerId

  const customer = await stripe.customers.create({ email, metadata: { supabaseUserId: userId } })
  return customer.id
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${returnUrl}/dashboard?upgraded=true`,
    cancel_url: `${returnUrl}/billing`,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  })
  return session.url!
}
