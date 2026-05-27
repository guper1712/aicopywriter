import Anthropic from '@anthropic-ai/sdk'
import type { OnboardingData, GeneratedCreative } from '@/types'
import { VERTICAL_LABELS, PLATFORM_LABELS, EMOTION_LABELS, STYLE_LABELS } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an elite media buyer and viral creative strategist with 10+ years of experience in performance marketing, affiliate marketing, and direct response advertising across Facebook, TikTok, and native platforms.

You specialize in:
- Writing scroll-stopping hooks that grab attention in the first 2 seconds
- Crafting emotional angles that drive action
- Creating UGC-style scripts that feel authentic and convert
- Understanding viral mechanics for each vertical and platform
- Direct response copywriting principles

Your output must be:
- Aggressive, specific, and conversion-focused
- Platform-native (different style for TikTok vs Facebook vs Native)
- Emotionally charged and psychologically compelling
- Free of generic marketing language — always specific and punchy
- Optimized for high CTR and low CPA

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation, just the JSON object.`

export async function generateCreatives(data: OnboardingData): Promise<GeneratedCreative> {
  const vertical = VERTICAL_LABELS[data.vertical ?? ''] ?? data.vertical
  const platform = PLATFORM_LABELS[data.platform ?? ''] ?? data.platform
  const emotion = EMOTION_LABELS[data.emotion ?? ''] ?? data.emotion
  const style = STYLE_LABELS[data.style ?? ''] ?? data.style

  const userPrompt = `Generate a complete viral creative package for the following campaign:

VERTICAL: ${vertical}
GEO: ${data.geo} ${data.tier ? `(${data.tier.toUpperCase()})` : ''}
PLATFORM: ${platform}
TARGET EMOTION: ${emotion}
CREATIVE STYLE: ${style}
OFFER DETAILS: ${data.offerDetails}

Generate and return a JSON object with this exact structure:
{
  "hooks": [
    {
      "text": "hook text here",
      "type": "tiktok|meta|aggressive|curiosity|pattern_interrupt",
      "score": 85
    }
  ],
  "angles": [
    {
      "title": "angle name",
      "description": "how to execute this angle in 2-3 sentences",
      "type": "emotional|irrational|authority|problem_solution|controversy|hidden_secret|social_proof"
    }
  ],
  "scripts": [
    {
      "duration": 15,
      "hook": "opening hook line",
      "body": "main script body",
      "cta": "call to action text",
      "sceneBreakdown": ["scene 1 description", "scene 2 description"],
      "shotList": ["shot 1", "shot 2"]
    }
  ],
  "imagePrompts": [
    {
      "platform": "midjourney|flux|sdxl|kling|veo|runway",
      "prompt": "detailed image generation prompt",
      "style": "style description"
    }
  ],
  "staticAds": [
    {
      "headline": "headline text",
      "body": "body copy",
      "cta": "CTA button text",
      "visualDirection": "visual description",
      "colorPsychology": "color rationale",
      "layoutIdea": "layout description"
    }
  ],
  "viralScore": {
    "scrollStoppingPower": 87,
    "emotionalIntensity": 82,
    "ctrProbability": 78,
    "complianceRisk": 25,
    "originalityScore": 80,
    "overall": 81
  },
  "combinations": 120
}

Requirements:
- Generate EXACTLY 20 hooks (mix of all types)
- Generate 10 creative angles
- Generate 3 video scripts (one each for 15s, 30s, 60s)
- Generate 6 image prompts (one per platform)
- Generate 3 static ad variations
- All scores 0-100
- Make hooks platform-specific and emotionally loaded
- Scripts must have scene-by-scene breakdowns
- Be aggressive, specific, and conversion-optimized`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // Strip any accidental markdown fences
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  return JSON.parse(cleaned) as GeneratedCreative
}
