export type Vertical =
  | 'nutra' | 'gambling' | 'dating' | 'crypto'
  | 'ecom' | 'finance' | 'sweepstakes' | 'mobile_apps'
  | 'saas' | 'custom'

export type Platform =
  | 'facebook' | 'tiktok' | 'instagram'
  | 'youtube_shorts' | 'native' | 'google_uac'

export type CreativeStyle =
  | 'ugc' | 'native_selfie' | 'fake_podcast' | 'street_interview'
  | 'ai_influencer' | 'before_after' | 'meme' | 'luxury'
  | 'documentary' | 'news_style'

export type Emotion =
  | 'curiosity' | 'fomo' | 'shock' | 'trust' | 'greed'
  | 'urgency' | 'lust' | 'social_proof' | 'controversy'

export type Tier = 'tier1' | 'tier2' | 'tier3'

export type Plan = 'free' | 'pro' | 'agency'

// ─── Onboarding ─────────────────────────────────────────────────────────────

export interface OnboardingData {
  vertical: Vertical | null
  geo: string
  tier: Tier | null
  platform: Platform | null
  emotion: Emotion | null
  style: CreativeStyle | null
  offerDetails: string
}

// ─── Generation output ──────────────────────────────────────────────────────

export interface Hook {
  text: string
  type: 'tiktok' | 'meta' | 'aggressive' | 'curiosity' | 'pattern_interrupt'
  score: number
}

export interface CreativeAngle {
  title: string
  description: string
  type: 'emotional' | 'irrational' | 'authority' | 'problem_solution' | 'controversy' | 'hidden_secret' | 'social_proof'
}

export interface VideoScript {
  duration: 15 | 30 | 60
  hook: string
  body: string
  cta: string
  sceneBreakdown: string[]
  shotList: string[]
}

export interface ImagePrompt {
  platform: 'midjourney' | 'flux' | 'sdxl' | 'kling' | 'veo' | 'runway'
  prompt: string
  style: string
}

export interface StaticAd {
  headline: string
  body: string
  cta: string
  visualDirection: string
  colorPsychology: string
  layoutIdea: string
}

export interface ViralScore {
  scrollStoppingPower: number
  emotionalIntensity: number
  ctrProbability: number
  complianceRisk: number
  originalityScore: number
  overall: number
}

export interface GeneratedCreative {
  hooks: Hook[]
  angles: CreativeAngle[]
  scripts: VideoScript[]
  imagePrompts: ImagePrompt[]
  staticAds: StaticAd[]
  viralScore: ViralScore
  combinations: number
}

// ─── DB models ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: Plan
  generations_used: number
  generations_limit: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  subscription_period_end: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  vertical: Vertical
  description: string | null
  created_at: string
  updated_at: string
}

export interface Generation {
  id: string
  user_id: string
  project_id: string | null
  onboarding_data: OnboardingData
  result: GeneratedCreative | null
  status: 'pending' | 'generating' | 'done' | 'error'
  is_favorite: boolean
  title: string | null
  created_at: string
}

export interface SwipeItem {
  id: string
  user_id: string
  generation_id: string | null
  type: 'hook' | 'angle' | 'script' | 'image_prompt' | 'static_ad'
  content: Hook | CreativeAngle | VideoScript | ImagePrompt | StaticAd
  notes: string | null
  tags: string[]
  created_at: string
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface PricingTier {
  name: string
  price: number
  interval: 'month' | 'year'
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
  stripePriceId?: string
}
