import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

export function truncate(str: string, length: number) {
  return str.length > length ? str.slice(0, length) + '…' : str
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const VERTICAL_LABELS: Record<string, string> = {
  nutra: 'Nutra',
  gambling: 'Gambling',
  dating: 'Dating',
  crypto: 'Crypto',
  ecom: 'Ecom',
  finance: 'Finance',
  sweepstakes: 'Sweepstakes',
  mobile_apps: 'Mobile Apps',
  saas: 'SaaS',
  custom: 'Custom',
}

export const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube_shorts: 'YouTube Shorts',
  native: 'Native',
  google_uac: 'Google UAC',
}

export const EMOTION_LABELS: Record<string, string> = {
  curiosity: 'Curiosity',
  fomo: 'FOMO',
  shock: 'Shock',
  trust: 'Trust',
  greed: 'Greed',
  urgency: 'Urgency',
  lust: 'Lust',
  social_proof: 'Social Proof',
  controversy: 'Controversy',
}

export const STYLE_LABELS: Record<string, string> = {
  ugc: 'UGC',
  native_selfie: 'Native Selfie',
  fake_podcast: 'Fake Podcast',
  street_interview: 'Street Interview',
  ai_influencer: 'AI Influencer',
  before_after: 'Before / After',
  meme: 'Meme',
  luxury: 'Luxury',
  documentary: 'Documentary',
  news_style: 'News Style',
}

export const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  pro: 999999,
  agency: 999999,
}
