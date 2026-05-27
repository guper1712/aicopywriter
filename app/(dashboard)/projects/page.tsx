import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FolderOpen, Plus, Wand2, Clock } from 'lucide-react'
import type { Generation } from '@/types'
import { VERTICAL_LABELS, PLATFORM_LABELS } from '@/lib/utils'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: generations } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const list = (generations ?? []) as Generation[]

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-violet-400" /> Generation History
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{list.length} total generations</p>
        </div>
        <Link
          href="/generate"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all"
        >
          <Plus className="w-4 h-4" /> New generation
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Wand2 className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No generations yet.</p>
          <Link href="/generate" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all">
            Generate your first batch
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((g) => (
            <div key={g.id} className="glass rounded-xl p-5 flex flex-col gap-3 hover:border-white/20 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-white text-sm truncate">
                  {g.title ?? 'Generation'}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  g.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
                  g.status === 'error' ? 'bg-red-500/10 text-red-400' :
                  'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {g.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {g.onboarding_data.vertical && (
                  <span className="text-xs px-2 py-0.5 rounded-full glass text-muted-foreground">
                    {VERTICAL_LABELS[g.onboarding_data.vertical]}
                  </span>
                )}
                {g.onboarding_data.platform && (
                  <span className="text-xs px-2 py-0.5 rounded-full glass text-muted-foreground">
                    {PLATFORM_LABELS[g.onboarding_data.platform]}
                  </span>
                )}
                {g.onboarding_data.geo && (
                  <span className="text-xs px-2 py-0.5 rounded-full glass text-muted-foreground">
                    {g.onboarding_data.geo}
                  </span>
                )}
              </div>

              {g.result && (
                <div className="text-xs text-muted-foreground">
                  {g.result.hooks.length} hooks · {g.result.angles.length} angles · {g.result.combinations}+ combos
                </div>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto">
                <Clock className="w-3 h-3" />
                {new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
