'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, CheckCircle2, Zap, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Get started',
    features: ['10 generations total', 'Hooks + angles', 'Basic scripts'],
    cta: 'Current plan',
    disabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    description: 'For serious media buyers',
    features: [
      'Unlimited generations',
      'All creative formats',
      'PDF / CSV exports',
      'Image gen prompts (6 platforms)',
      'Viral scoring',
      'Creative history',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 149,
    description: 'For teams that scale',
    features: [
      'Everything in Pro',
      'Team workspace (10 seats)',
      'Spy engine',
      'API access',
      'Creative approval flow',
      'Dedicated account manager',
    ],
    cta: 'Get Agency',
  },
]

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUpgrade(planId: string) {
    if (planId === 'free') return
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error ?? 'Failed to start checkout')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-violet-400" /> Billing & Plans
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upgrade for unlimited generations and all features
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative rounded-2xl p-6 flex flex-col ${
              plan.highlighted
                ? 'bg-gradient-to-b from-violet-600/20 to-violet-600/5 border border-violet-500/50 glow-purple'
                : 'glass'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-violet-600 text-xs text-white font-semibold">
                Most popular
              </div>
            )}

            <div className="mb-6">
              <div className="font-bold text-white text-lg">{plan.name}</div>
              <div className="text-muted-foreground text-sm mt-1">{plan.description}</div>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-white">${plan.price}</span>
                {plan.price > 0 && <span className="text-muted-foreground text-sm mb-1">/month</span>}
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(plan.id)}
              disabled={plan.disabled || loading === plan.id}
              className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                plan.highlighted
                  ? 'bg-violet-600 hover:bg-violet-500 text-white'
                  : plan.disabled
                  ? 'glass text-muted-foreground cursor-not-allowed'
                  : 'glass glass-hover text-white'
              }`}
            >
              {loading === plan.id ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Redirecting…
                </>
              ) : plan.highlighted ? (
                <><Zap className="w-4 h-4" /> {plan.cta}</>
              ) : (
                <>{plan.cta} {!plan.disabled && <ArrowRight className="w-4 h-4" />}</>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 glass rounded-xl p-5 text-sm text-muted-foreground">
        <p>Payments are processed securely by Stripe. Cancel anytime from your billing portal.
          All plans are billed monthly. Questions? Contact <a href="mailto:support@creativeforge.ai" className="text-violet-400 hover:underline">support@creativeforge.ai</a></p>
      </div>
    </div>
  )
}
