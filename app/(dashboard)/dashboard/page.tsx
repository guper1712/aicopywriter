import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Wand2, Bookmark, FolderOpen, ArrowRight, Zap, TrendingUp, Clock } from 'lucide-react'
import type { UserProfile, Generation } from '@/types'
import { VERTICAL_LABELS } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, generationsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('generations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ])

  const profile = profileRes.data as UserProfile | null
  const generations = (generationsRes.data ?? []) as Generation[]

  const usagePercent = profile
    ? Math.min((profile.generations_used / profile.generations_limit) * 100, 100)
    : 0

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Ready to forge some viral creatives?</p>
        </div>
        <Link
          href="/generate"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all glow-purple"
        >
          <Wand2 className="w-4 h-4" /> Generate
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
            <TrendingUp className="w-4 h-4" /> Generations used
          </div>
          <div className="text-3xl font-extrabold text-white">{profile?.generations_used ?? 0}</div>
          {profile?.plan === 'free' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>{profile.generations_used} / {profile.generations_limit}</span>
                <span>{Math.round(usagePercent)}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              {usagePercent >= 80 && (
                <Link href="/billing" className="mt-2 text-xs text-violet-400 hover:underline inline-block">
                  Upgrade for unlimited →
                </Link>
              )}
            </div>
          )}
          {profile?.plan !== 'free' && (
            <div className="text-xs text-violet-400 mt-1 capitalize">{profile?.plan} — unlimited</div>
          )}
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
            <Bookmark className="w-4 h-4" /> Saved to swipe file
          </div>
          <div className="text-3xl font-extrabold text-white">
            {generations.filter(g => g.is_favorite).length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">favorite generations</div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
            <FolderOpen className="w-4 h-4" /> Plan
          </div>
          <div className="text-3xl font-extrabold text-gradient capitalize">{profile?.plan ?? 'free'}</div>
          {profile?.plan === 'free' && (
            <Link href="/billing" className="text-xs text-violet-400 hover:underline mt-1 inline-block">
              Upgrade to Pro →
            </Link>
          )}
          {profile?.plan !== 'free' && (
            <div className="text-xs text-muted-foreground mt-1">Active subscription</div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-semibold text-white mb-4">Quick actions</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { href: '/generate', icon: Wand2, title: 'New generation', desc: 'Start a creative batch', color: 'from-violet-500 to-purple-500' },
            { href: '/swipe-file', icon: Bookmark, title: 'Swipe file', desc: 'View saved creatives', color: 'from-blue-500 to-cyan-500' },
            { href: '/projects', icon: FolderOpen, title: 'Projects', desc: 'Organize your campaigns', color: 'from-emerald-500 to-teal-500' },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="glass glass-hover rounded-xl p-5 flex items-start gap-4 group"
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center shrink-0`}>
                <a.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-white text-sm">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-white group-hover:translate-x-1 transition-all mt-0.5" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent generations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent generations</h2>
          <Link href="/projects" className="text-sm text-violet-400 hover:underline">View all</Link>
        </div>

        {generations.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center">
            <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No generations yet.</p>
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all"
            >
              <Wand2 className="w-4 h-4" /> Generate your first batch
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {generations.map((g) => (
              <div key={g.id} className="glass rounded-xl p-4 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {g.title ?? VERTICAL_LABELS[g.onboarding_data.vertical ?? ''] ?? 'Generation'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  g.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
                  g.status === 'error' ? 'bg-red-500/10 text-red-400' :
                  'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {g.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade banner for free users */}
      {profile?.plan === 'free' && usagePercent >= 50 && (
        <div className="glass rounded-2xl p-6 bg-gradient-to-r from-violet-600/10 to-blue-600/10 border border-violet-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1">
            <div className="font-semibold text-white">You&apos;re using {Math.round(usagePercent)}% of your free quota</div>
            <div className="text-sm text-muted-foreground mt-1">Upgrade to Pro for unlimited generations, all formats, and exports.</div>
          </div>
          <Link
            href="/billing"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all whitespace-nowrap"
          >
            <Zap className="w-4 h-4" /> Upgrade to Pro — $49/mo
          </Link>
        </div>
      )}
    </div>
  )
}
