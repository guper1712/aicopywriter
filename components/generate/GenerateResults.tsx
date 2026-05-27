'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Star, Download, CheckCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedCreative, Hook, CreativeAngle, VideoScript, ImagePrompt, StaticAd } from '@/types'
import { toast } from 'sonner'

const TABS = ['Hooks', 'Angles', 'Scripts', 'Image Prompts', 'Static Ads', 'Score'] as const
type Tab = typeof TABS[number]

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-white">{value}/100</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-all">
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

const HOOK_TYPE_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/10 text-pink-400',
  meta: 'bg-blue-500/10 text-blue-400',
  aggressive: 'bg-red-500/10 text-red-400',
  curiosity: 'bg-yellow-500/10 text-yellow-400',
  pattern_interrupt: 'bg-violet-500/10 text-violet-400',
}

export default function GenerateResults({
  result,
  onSave,
}: {
  result: GeneratedCreative
  onSave?: () => void
}) {
  const [activeTab, setActiveTab] = useState<Tab>('Hooks')
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set())

  function saveItem(id: string) {
    setSavedItems(prev => new Set([...prev, id]))
    toast.success('Saved to swipe file')
  }

  function exportAll() {
    const content = JSON.stringify(result, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `creativeforge-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported!')
  }

  return (
    <div className="w-full">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">{result.combinations}+ combinations</span>
        </div>
        <div className="glass rounded-xl px-3 py-2 text-xs text-muted-foreground">
          {result.hooks.length} hooks · {result.angles.length} angles · {result.scripts.length} scripts
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={exportAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass glass-hover text-xs font-medium text-white"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 text-xs font-medium"
            >
              <Star className="w-3.5 h-3.5" /> Save
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl mb-6 overflow-x-auto scrollbar-thin">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              activeTab === tab
                ? 'bg-violet-600 text-white'
                : 'text-muted-foreground hover:text-white'
            )}
          >
            {tab}
            {tab === 'Hooks' && <span className="ml-1.5 text-xs opacity-60">{result.hooks.length}</span>}
            {tab === 'Angles' && <span className="ml-1.5 text-xs opacity-60">{result.angles.length}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'Hooks' && (
          <div className="space-y-3">
            {result.hooks.map((hook: Hook, i: number) => (
              <div key={i} className="glass rounded-xl p-4 flex items-start gap-3 group">
                <span className="font-mono text-xs text-muted-foreground shrink-0 mt-0.5 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{hook.text}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', HOOK_TYPE_COLORS[hook.type] ?? 'bg-white/5 text-muted-foreground')}>
                      {hook.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">Score: {hook.score}/100</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={hook.text} />
                  <button
                    onClick={() => saveItem(`hook-${i}`)}
                    className={cn('p-1.5 rounded-lg hover:bg-white/10 transition-all',
                      savedItems.has(`hook-${i}`) ? 'text-yellow-400' : 'text-muted-foreground hover:text-white'
                    )}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Angles' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {result.angles.map((angle: CreativeAngle, i: number) => (
              <div key={i} className="glass rounded-xl p-5 group">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-white text-sm">{angle.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 shrink-0">
                    {angle.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{angle.description}</p>
                <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={`${angle.title}\n\n${angle.description}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Scripts' && (
          <div className="space-y-6">
            {result.scripts.map((script: VideoScript, i: number) => (
              <div key={i} className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-sm font-bold text-gradient">{script.duration}s Script</span>
                  <CopyButton text={`HOOK:\n${script.hook}\n\nBODY:\n${script.body}\n\nCTA:\n${script.cta}`} />
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Hook</div>
                    <p className="text-sm text-foreground bg-white/3 rounded-lg p-3 border border-white/5">{script.hook}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Body</div>
                    <p className="text-sm text-foreground bg-white/3 rounded-lg p-3 border border-white/5 whitespace-pre-wrap">{script.body}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">CTA</div>
                    <p className="text-sm text-foreground bg-white/3 rounded-lg p-3 border border-white/5">{script.cta}</p>
                  </div>
                  {script.sceneBreakdown?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">Scene Breakdown</div>
                      <ul className="space-y-1">
                        {script.sceneBreakdown.map((scene, j) => (
                          <li key={j} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-orange-400 shrink-0">Scene {j + 1}</span> {scene}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Image Prompts' && (
          <div className="space-y-4">
            {result.imagePrompts.map((ip: ImagePrompt, i: number) => (
              <div key={i} className="glass rounded-xl p-5 group">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-semibold text-violet-400 uppercase">{ip.platform}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={ip.prompt} />
                  </div>
                </div>
                <p className="text-sm text-foreground font-mono leading-relaxed bg-white/3 rounded-lg p-3 border border-white/5">
                  {ip.prompt}
                </p>
                <div className="text-xs text-muted-foreground mt-2">Style: {ip.style}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Static Ads' && (
          <div className="space-y-6">
            {result.staticAds.map((ad: StaticAd, i: number) => (
              <div key={i} className="glass rounded-xl p-6 group">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-sm font-bold text-gradient">Ad #{i + 1}</span>
                  <CopyButton text={`HEADLINE: ${ad.headline}\n\nBODY: ${ad.body}\n\nCTA: ${ad.cta}`} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">Headline</div>
                    <p className="text-sm font-bold text-white">{ad.headline}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">CTA</div>
                    <p className="text-sm text-white">{ad.cta}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Body</div>
                    <p className="text-sm text-muted-foreground">{ad.body}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">Visual Direction</div>
                    <p className="text-xs text-muted-foreground">{ad.visualDirection}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Color Psychology</div>
                    <p className="text-xs text-muted-foreground">{ad.colorPsychology}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Score' && (
          <div className="glass rounded-2xl p-8 max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="text-6xl font-extrabold text-gradient mb-2">{result.viralScore.overall}</div>
              <div className="text-muted-foreground text-sm">Overall Viral Score</div>
            </div>
            <div className="space-y-5">
              <ScoreBar label="Scroll-Stopping Power" value={result.viralScore.scrollStoppingPower} color="bg-gradient-to-r from-violet-500 to-purple-500" />
              <ScoreBar label="Emotional Intensity" value={result.viralScore.emotionalIntensity} color="bg-gradient-to-r from-blue-500 to-cyan-500" />
              <ScoreBar label="CTR Probability" value={result.viralScore.ctrProbability} color="bg-gradient-to-r from-emerald-500 to-teal-500" />
              <ScoreBar label="Originality Score" value={result.viralScore.originalityScore} color="bg-gradient-to-r from-orange-500 to-yellow-500" />
              <ScoreBar
                label="Compliance Risk (lower = safer)"
                value={result.viralScore.complianceRisk}
                color={result.viralScore.complianceRisk > 60 ? 'bg-red-500' : result.viralScore.complianceRisk > 30 ? 'bg-yellow-500' : 'bg-emerald-500'}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
