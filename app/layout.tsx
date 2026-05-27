import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'CreativeForge AI — Viral Ad Creatives for Media Buyers',
  description: 'Generate hooks, UGC scripts, video concepts and 100+ creative combinations in seconds. Built for affiliate marketers, media buyers and arbitrage teams.',
  keywords: 'ad creatives, affiliate marketing, media buying, tiktok hooks, facebook ads, ugc scripts, creative generator',
  openGraph: {
    title: 'CreativeForge AI',
    description: 'Viral Ad Creative Generator for Elite Media Buyers',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(224 71% 6%)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'hsl(213 31% 91%)',
            },
          }}
        />
      </body>
    </html>
  )
}
