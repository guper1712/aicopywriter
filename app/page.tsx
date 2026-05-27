'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Zap, TrendingUp, Target, Users, ChevronRight, Star,
  Play, ArrowRight, CheckCircle2, Layers, BarChart3, Brain
} from 'lucide-react'

const VERTICALS = ['Nutra', 'Gambling', 'Dating', 'Crypto', 'Ecom', 'Finance', 'SaaS', 'Mobile Apps']
const PLATFORMS = ['Facebook', 'TikTok', 'Instagram', 'YouTube Shorts', 'Native', 'Google UAC']
const STATS = [
  { value: '100+', label: 'Creative combinations per run' },
  { value: '20', label: 'Viral hooks generated' },
  { value: '10×', label: 'Faster creative testing' },
  { value: '6', label: 'Image gen platforms supported' },
]

const FEATURES = [
  {
    icon: Zap,
    title: 'Viral Hook Engine',
    description: 'Generate 20 scroll-stopping hooks per run — TikTok style, Meta style, aggressive, curiosity, pattern interrupt. Each scored for CTR probability.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Play,
    title: 'UGC Script Generator',
    description: 'Full 15s / 30s / 60s video scripts with hook, body, CTA, scene-by-scene breakdown and shot list. Ready to hand to your talent.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Brain,
    title: 'Creative Angle Finder',
    description: 'AI maps 10 angles per offer — emotional, authority, controversy, hidden secret, social proof. Find the one that cracks the auction.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Layers,
    title: 'AI Image Prompts',
    description: 'Platform-native prompts for Midjourney, Flux, SDXL, Kling, Veo, and Runway. No more guessing what to generate.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: BarChart3,
    title: 'Viral Score',
    description: 'Every creative gets scored: scroll-stopping power, emotional intensity, CTR probability, compliance risk, and originality.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Target,
    title: '100+ Combinations',
    description: 'System automatically combines hooks × angles × styles × CTAs into a full test matrix. Launch more tests, find winners faster.',
    color: 'from-indigo-500 to-violet-500',
  },
]

const PRICING = [
  {
    name: 'Free',
    price: 0,
    description: 'Try the engine',
    features: ['10 generations total', 'Hooks + angles', 'Basic scripts', 'Creative history'],
    cta: 'Start free',
    href: '/signup',
  },
  {
    name: 'Pro',
    price: 49,
    description: 'For solo media buyers',
    features: ['Unlimited generations', 'All creative formats', 'PDF / CSV exports', 'Image gen prompts', 'Viral scoring', 'Priority support'],
    cta: 'Go Pro',
    href: '/signup?plan=pro',
    highlighted: true,
  },
  {
    name: 'Agency',
    price: 149,
    description: 'For teams that scale',
    features: ['Everything in Pro', 'Team workspace (10 seats)', 'Spy engine', 'API access', 'Creative approval flow', 'Dedicated account manager'],
    cta: 'Get Agency',
    href: '/signup?plan=agency',
  },
]

const TESTIMONIALS = [
  {
    quote: "Мы запускали по 5 креативов в неделю. Теперь — 50. CTR вырос на 40% после первого же батча хуков.",
    author: "Вова М.",
    role: "Facebook Media Buyer, Nutra Team",
    stars: 5,
  },
  {
    quote: "CreativeForge дает именно то, что нужно арбитражнику: быстро, много, по делу. Скрипты под TikTok — огонь.",
    author: "Алина К.",
    role: "TikTok Creative Strategist",
    stars: 5,
  },
  {
    quote: "Попробовал под Gambling EU и Crypto. Хуки реально цепляют — особенно pattern interrupt категория.",
    author: "Дмитрий Р.",
    role: "Affiliate, Gambling vertical",
    stars: 5,
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">CreativeForge</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 font-mono ml-1">AI</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-white transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/signup" className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4">
        {/* Glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial="hidden" animate="visible" variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-violet-500/30 text-xs text-violet-400 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Built for affiliate marketers, media buyers & arbitrage teams
          </motion.div>

          <motion.h1
            initial="hidden" animate="visible" custom={1} variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-none"
          >
            <span className="text-white">Generate </span>
            <span className="text-gradient">100+ viral</span>
            <br />
            <span className="text-white">creatives </span>
            <span className="text-white">in seconds</span>
          </motion.h1>

          <motion.p
            initial="hidden" animate="visible" custom={2} variants={fadeUp}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Hooks. UGC scripts. Video concepts. Ad angles. Image prompts.
            Everything a media buyer needs to launch 10× more creative tests — daily.
          </motion.p>

          <motion.div
            initial="hidden" animate="visible" custom={3} variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/signup"
              className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-base transition-all duration-200 glow-purple"
            >
              Generate free creatives
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 px-8 py-4 rounded-xl glass glass-hover text-white font-medium text-base"
            >
              See how it works
              <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial="hidden" animate="visible" custom={4} variants={fadeUp}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20"
          >
            {STATS.map((s) => (
              <div key={s.label} className="glass rounded-xl p-4">
                <div className="text-3xl font-extrabold text-gradient mb-1">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Scrolling ticker */}
      <div className="relative overflow-hidden py-4 border-y border-white/5 bg-white/[0.02]">
        <div className="flex gap-8 animate-[scroll_20s_linear_infinite]" style={{ width: 'max-content' }}>
          {[...VERTICALS, ...PLATFORMS, ...VERTICALS, ...PLATFORMS].map((item, i) => (
            <span key={i} className="text-xs font-mono text-muted-foreground whitespace-nowrap px-3 py-1 rounded-full glass">
              {item}
            </span>
          ))}
        </div>
        <style>{`@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
              Everything a media buyer needs
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              No more blank-page syndrome. Input your offer, get a full creative arsenal in under 30 seconds.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                custom={i * 0.5} variants={fadeUp}
                className="glass rounded-2xl p-6 card-gradient group hover:border-white/20 transition-colors duration-300"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-extrabold text-white mb-4">How it works</h2>
            <p className="text-muted-foreground">From zero to 100+ creatives in 4 steps</p>
          </motion.div>

          <div className="space-y-4">
            {[
              { step: '01', title: 'Pick your vertical', desc: 'Nutra, Gambling, Dating, Crypto, Ecom, Finance and more' },
              { step: '02', title: 'Set GEO + platform', desc: 'Tier 1/2/3 countries, Facebook, TikTok, Instagram, Native' },
              { step: '03', title: 'Choose emotion + style', desc: 'FOMO, shock, curiosity — then UGC, news style, before/after' },
              { step: '04', title: 'Drop your offer details', desc: 'Pain points, outcome, CTA — AI builds the rest' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                custom={i * 0.5} variants={fadeUp}
                className="glass rounded-xl p-5 flex items-start gap-5"
              >
                <span className="font-mono text-2xl font-bold text-gradient shrink-0">{item.step}</span>
                <div>
                  <div className="font-semibold text-white">{item.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} custom={4} variants={fadeUp}
            className="mt-8 text-center"
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all glow-purple"
            >
              Try it free <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-extrabold text-white mb-4">What media buyers say</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                custom={i * 0.5} variants={fadeUp}
                className="glass rounded-2xl p-6 card-gradient"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground text-sm leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="font-semibold text-white text-sm">{t.author}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-extrabold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Pay once per month. Generate every day.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                custom={i * 0.5} variants={fadeUp}
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
                    {plan.price > 0 && <span className="text-muted-foreground text-sm mb-1">/mo</span>}
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

                <Link
                  href={plan.href}
                  className={`w-full py-3 rounded-xl font-semibold text-sm text-center transition-all ${
                    plan.highlighted
                      ? 'bg-violet-600 hover:bg-violet-500 text-white'
                      : 'glass glass-hover text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-violet-500/30 text-xs text-violet-400 mb-6">
              <Users className="w-3 h-3" /> Trusted by 1,000+ media buyers
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
              Stop guessing.<br />
              <span className="text-gradient">Start scaling.</span>
            </h2>
            <p className="text-muted-foreground mb-10 text-lg">
              Generate your first batch of viral creatives for free. No credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-10 py-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-lg transition-all glow-purple"
            >
              Start generating free <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span>CreativeForge AI</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <div>© 2025 CreativeForge AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
