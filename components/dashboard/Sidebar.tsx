'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Zap, LayoutDashboard, Wand2, FolderOpen, Bookmark,
  CreditCard, LogOut, ChevronLeft, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/generate', label: 'Generate', icon: Wand2 },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/swipe-file', label: 'Swipe File', icon: Bookmark },
  { href: '/billing', label: 'Billing', icon: CreditCard },
]

export default function Sidebar({ user }: { user: UserProfile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const planColors: Record<string, string> = {
    free: 'text-muted-foreground',
    pro: 'text-violet-400',
    agency: 'text-yellow-400',
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-white truncate">CreativeForge</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && (
                <motion.div
                  layoutId="active-nav"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400"
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + plan */}
      <div className="p-3 border-t border-white/5 space-y-2">
        {user && !collapsed && (
          <div className="px-3 py-2 rounded-xl glass">
            <div className="text-xs text-white font-medium truncate">{user.full_name ?? user.email}</div>
            <div className={cn('text-xs font-semibold capitalize mt-0.5', planColors[user.plan])}>
              {user.plan} plan
              {user.plan === 'free' && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({user.generations_used}/{user.generations_limit} used)
                </span>
              )}
            </div>
          </div>
        )}

        {user?.plan === 'free' && !collapsed && (
          <Link
            href="/billing"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 text-xs font-semibold transition-all"
          >
            <Zap className="w-3.5 h-3.5" /> Upgrade to Pro
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="hidden lg:flex items-center justify-center py-3 border-t border-white/5 text-muted-foreground hover:text-white transition-colors"
      >
        <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(v => !v)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl glass flex items-center justify-center text-white"
      >
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'lg:hidden fixed left-0 top-0 bottom-0 z-40 w-64 glass border-r border-white/5 transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {SidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 glass border-r border-white/5 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}>
        {SidebarContent}
      </aside>
    </>
  )
}
