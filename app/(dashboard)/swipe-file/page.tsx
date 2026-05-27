import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Bookmark, Wand2 } from 'lucide-react'
import Link from 'next/link'
import type { Generation } from '@/types'

export default async function SwipeFilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: favorites } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_favorite', true)
    .order('created_at', { ascending: false })

  const list = (favorites ?? []) as Generation[]

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-violet-400" /> Swipe File
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Your saved favorite generations</p>
      </div>

      {list.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No saved creatives yet.</p>
          <p className="text-sm text-muted-foreground/60 mb-6">After generating creatives, click the star icon to save them here.</p>
          <Link href="/generate" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all">
            <Wand2 className="w-4 h-4" /> Generate creatives
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((g) => (
            <div key={g.id} className="glass rounded-xl p-5">
              <div className="font-medium text-white text-sm mb-2">{g.title ?? 'Saved generation'}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(g.created_at).toLocaleDateString()}
              </div>
              {g.result && (
                <div className="text-xs text-violet-400 mt-2">
                  {g.result.hooks.length} hooks · Score {g.result.viralScore.overall}/100
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
