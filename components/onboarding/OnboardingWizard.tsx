'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnboardingData, Vertical, Platform, Emotion, CreativeStyle, Tier } from '@/types'

// ─── Step data ───────────────────────────────────────────────────────────────

const VERTICALS: { value: Vertical; label: string; emoji: string }[] = [
  { value: 'nutra', label: 'Nutra', emoji: '💊' },
  { value: 'gambling', label: 'Gambling', emoji: '🎰' },
  { value: 'dating', label: 'Dating', emoji: '💘' },
  { value: 'crypto', label: 'Crypto', emoji: '₿' },
  { value: 'ecom', label: 'Ecom', emoji: '🛍️' },
  { value: 'finance', label: 'Finance', emoji: '💰' },
  { value: 'sweepstakes', label: 'Sweepstakes', emoji: '🎁' },
  { value: 'mobile_apps', label: 'Mobile Apps', emoji: '📱' },
  { value: 'saas', label: 'SaaS', emoji: '⚙️' },
  { value: 'custom', label: 'Custom', emoji: '✨' },
]

const TIERS: { value: Tier; label: string; desc: string }[] = [
  { value: 'tier1', label: 'Tier 1', desc: 'US, UK, AU, CA, EU' },
  { value: 'tier2', label: 'Tier 2', desc: 'PL, CZ, RO, BR, MX' },
  { value: 'tier3', label: 'Tier 3', desc: 'IN, TH, ID, NG, PH' },
]

const PLATFORMS: { value: Platform; label: string; emoji: string }[] = [
  { value: 'facebook', label: 'Facebook', emoji: '📘' },
  { value: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { value: 'instagram', label: 'Instagram', emoji: '📸' },
  { value: 'youtube_shorts', label: 'YouTube Shorts', emoji: '▶️' },
  { value: 'native', label: 'Native', emoji: '🌐' },
  { value: 'google_uac', label: 'Google UAC', emoji: '🔍' },
]

const EMOTIONS: { value: Emotion; label: string; emoji: string }[] = [
  { value: 'curiosity', label: 'Curiosity', emoji: '🤔' },
  { value: 'fomo', label: 'FOMO', emoji: '⏰' },
  { value: 'shock', label: 'Shock', emoji: '😱' },
  { value: 'trust', label: 'Trust', emoji: '🤝' },
  { value: 'greed', label: 'Greed', emoji: '💎' },
  { value: 'urgency', label: 'Urgency', emoji: '🔥' },
  { value: 'lust', label: 'Desire', emoji: '💫' },
  { value: 'social_proof', label: 'Social Proof', emoji: '⭐' },
  { value: 'controversy', label: 'Controversy', emoji: '⚡' },
]

const STYLES: { value: CreativeStyle; label: string; desc: string }[] = [
  { value: 'ugc', label: 'UGC', desc: 'User-generated feel' },
  { value: 'native_selfie', label: 'Native Selfie', desc: 'Raw, authentic' },
  { value: 'fake_podcast', label: 'Fake Podcast', desc: 'Authority format' },
  { value: 'street_interview', label: 'Street Interview', desc: 'Social proof' },
  { value: 'ai_influencer', label: 'AI Influencer', desc: 'Futuristic' },
  { value: 'before_after', label: 'Before / After', desc: 'Transformation' },
  { value: 'meme', label: 'Meme', desc: 'Viral humor' },
  { value: 'luxury', label: 'Luxury', desc: 'Premium feel' },
  { value: 'documentary', label: 'Documentary', desc: 'Deep trust' },
  { value: 'news_style', label: 'News Style', desc: 'Urgency + authority' },
]

// ─── Shared selection card ─────────────────────────────────────────────────

function OptionCard({
  selected,
  onClick,
  emoji,
  label,
  desc,
}: {
  selected: boolean
  onClick: () => void
  emoji?: string
  label: string
  desc?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-200',
        selected
          ? 'bg-violet-600/20 border-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.2)]'
          : 'glass border-white/10 text-muted-foreground hover:border-white/30 hover:text-white'
      )}
    >
      {emoji && <span className="text-2xl">{emoji}</span>}
      <span className="text-sm font-medium leading-tight">{label}</span>
      {desc && <span className="text-xs opacity-60 leading-tight">{desc}</span>}
      {selected && (
        <motion.div
          layoutId="card-ring"
          className="absolute inset-0 rounded-xl border-2 border-violet-500 pointer-events-none"
          transition={{ duration: 0.15 }}
        />
      )}
    </button>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onSubmit: (data: OnboardingData) => void
  loading: boolean
}

const INITIAL: OnboardingData = {
  vertical: null,
  geo: '',
  tier: null,
  platform: null,
  emotion: null,
  style: null,
  offerDetails: '',
}

const STEPS = ['Vertical', 'GEO', 'Platform', 'Emotion', 'Style', 'Offer'] as const

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
}

export default function OnboardingWizard({ onSubmit, loading }: Props) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [data, setData] = useState<OnboardingData>(INITIAL)

  function go(nextStep: number) {
    setDir(nextStep > step ? 1 : -1)
    setStep(nextStep)
  }

  function canAdvance() {
    if (step === 0) return !!data.vertical
    if (step === 1) return data.geo.trim().length > 0 && !!data.tier
    if (step === 2) return !!data.platform
    if (step === 3) return !!data.emotion
    if (step === 4) return !!data.style
    if (step === 5) return data.offerDetails.trim().length > 20
    return false
  }

  function handleSubmit() {
    if (canAdvance()) onSubmit(data)
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i < step && go(i)}
              className={cn(
                'flex-1 h-1 rounded-full transition-all duration-300',
                i < step ? 'bg-violet-500 cursor-pointer hover:bg-violet-400' :
                i === step ? 'bg-violet-500' : 'bg-white/10'
              )}
            />
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground text-right mb-8">Step {step + 1} of {STEPS.length}</div>

      {/* Step content */}
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={step}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-2">Что льем?</h2>
              <p className="text-muted-foreground text-sm mb-6">Pick your vertical — AI will tailor every hook and angle to it.</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {VERTICALS.map(v => (
                  <OptionCard
                    key={v.value}
                    selected={data.vertical === v.value}
                    onClick={() => setData(d => ({ ...d, vertical: v.value }))}
                    emoji={v.emoji}
                    label={v.label}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-2">На какое GEO?</h2>
              <p className="text-muted-foreground text-sm mb-6">Country or region, and tier level.</p>
              <input
                type="text"
                value={data.geo}
                onChange={e => setData(d => ({ ...d, geo: e.target.value }))}
                placeholder="e.g. United States, Germany, Brazil…"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition-colors text-sm mb-6"
              />
              <div className="grid grid-cols-3 gap-3">
                {TIERS.map(t => (
                  <OptionCard
                    key={t.value}
                    selected={data.tier === t.value}
                    onClick={() => setData(d => ({ ...d, tier: t.value }))}
                    label={t.label}
                    desc={t.desc}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-2">Где будет открут?</h2>
              <p className="text-muted-foreground text-sm mb-6">Platform determines format, pacing, and hook style.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PLATFORMS.map(p => (
                  <OptionCard
                    key={p.value}
                    selected={data.platform === p.value}
                    onClick={() => setData(d => ({ ...d, platform: p.value }))}
                    emoji={p.emoji}
                    label={p.label}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-2">Какую эмоцию вызываем?</h2>
              <p className="text-muted-foreground text-sm mb-6">The dominant emotion shapes every creative asset.</p>
              <div className="grid grid-cols-3 gap-3">
                {EMOTIONS.map(e => (
                  <OptionCard
                    key={e.value}
                    selected={data.emotion === e.value}
                    onClick={() => setData(d => ({ ...d, emotion: e.value }))}
                    emoji={e.emoji}
                    label={e.label}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-2">Какой стиль?</h2>
              <p className="text-muted-foreground text-sm mb-6">Creative format / visual style.</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {STYLES.map(s => (
                  <OptionCard
                    key={s.value}
                    selected={data.style === s.value}
                    onClick={() => setData(d => ({ ...d, style: s.value }))}
                    label={s.label}
                    desc={s.desc}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-2">Опиши оффер</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Pain points, desired outcome, USP, CTA. The more context, the better the output.
              </p>
              <textarea
                value={data.offerDetails}
                onChange={e => setData(d => ({ ...d, offerDetails: e.target.value }))}
                rows={6}
                placeholder={`Example:\nProduct: Weight loss supplement\nPain: Belly fat that won't go away despite dieting\nOutcome: Lose 10 lbs in 30 days without gym\nUSP: Thermogenic formula, 3rd-party tested\nCTA: Get 50% off today only`}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition-colors text-sm resize-none font-mono leading-relaxed"
              />
              <div className="text-xs text-muted-foreground mt-2 text-right">
                {data.offerDetails.length} chars {data.offerDetails.trim().length < 20 && '(min 20)'}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass glass-hover text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!canAdvance() || loading}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all glow-purple"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <><Wand2 className="w-4 h-4" /> Generate creatives</>
            )}
          </button>
        ) : (
          <button
            onClick={() => go(step + 1)}
            disabled={!canAdvance()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
