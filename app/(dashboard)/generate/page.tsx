'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, RotateCcw } from 'lucide-react'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import GenerateResults from '@/components/generate/GenerateResults'
import type { OnboardingData, GeneratedCreative } from '@/types'
import { toast } from 'sonner'

type Phase = 'onboarding' | 'loading' | 'results'

const LOADING_MESSAGES = [
  'Analyzing your vertical…',
  'Finding viral patterns…',
  'Crafting scroll-stopping hooks…',
  'Building creative angles…',
  'Writing UGC scripts…',
  'Generating image prompts…',
  'Scoring viral potential…',
  'Almost there…',
]

function LoadingScreen() {
  const [msgIndex, setMsgIndex] = useState(0)

  useState(() => {
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length)
    }, 1800)
    return () => clearInterval(interval)
  })

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-violet-500/40 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Wand2 className="w-8 h-8 text-violet-400 animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-muted-foreground text-sm font-medium"
          >
            {LOADING_MESSAGES[msgIndex]}
          </motion.p>
        </AnimatePresence>
        <p className="text-xs text-muted-foreground/50 mt-2">Powered by Claude AI</p>
      </div>
    </div>
  )
}

export default function GeneratePage() {
  const [phase, setPhase] = useState<Phase>('onboarding')
  const [result, setResult] = useState<GeneratedCreative | null>(null)
  const [savedOnboarding, setSavedOnboarding] = useState<OnboardingData | null>(null)

  async function handleSubmit(data: OnboardingData) {
    setSavedOnboarding(data)
    setPhase('loading')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const json = await res.json()
      setResult(json.result)
      setPhase('results')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed. Please try again.')
      setPhase('onboarding')
    }
  }

  function reset() {
    setPhase('onboarding')
    setResult(null)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-violet-400" />
              {phase === 'results' ? 'Your Creatives' : 'Generate Creatives'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {phase === 'onboarding' && 'Answer 6 quick questions — get 100+ creative combinations'}
              {phase === 'loading' && 'AI is crafting your creative arsenal…'}
              {phase === 'results' && `${result?.combinations ?? 100}+ creative combinations ready`}
            </p>
          </div>
          {phase === 'results' && (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-hover text-sm font-medium text-white"
            >
              <RotateCcw className="w-4 h-4" /> New generation
            </button>
          )}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {phase === 'onboarding' && (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="glass rounded-2xl p-6 lg:p-8">
                <OnboardingWizard onSubmit={handleSubmit} loading={false} />
              </div>
            </motion.div>
          )}

          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass rounded-2xl p-8"
            >
              <LoadingScreen />
            </motion.div>
          )}

          {phase === 'results' && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <GenerateResults
                result={result}
                onSave={() => toast.success('Saved to swipe file!')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
