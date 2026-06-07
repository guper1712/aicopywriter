# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**aicopywriter** is a serverless API project (Vercel-style) that generates Russian-language sales copywriting using OpenAI's GPT-4. The tool implements the **PERC methodology** (Problem–Emotion–Resolution–Conversion) for producing marketing copy targeted at the Russian-speaking market.

## Architecture

The project consists of two independent serverless handler functions, each exported as `export default async function handler(req, res)`:

| File | Role | System Prompt Language | Response Key |
|---|---|---|---|
| `generate.js` (root) | **Copy generation** — takes structured client data and produces PERC-formatted sales copy with emoji/markdown | Russian PERC copywriter | `{ output }` |
| `api/generate.js` | **Client intake** — a conversational assistant that collects client answers needed to generate sales copy | Russian intake assistant | `{ result }` |

These represent two stages of a pipeline: `api/generate.js` helps gather structured input, and `generate.js` turns that input into finished copy.

### Request shape for `generate.js`

```js
POST /generate
{ "input": {
    niche, what_you_do, client_avatar, pain,
    product, value, result, unique, platform, format, style
} }
```

### Request shape for `api/generate.js`

```js
POST /api/generate
{ "input": "<raw string>" }
```

## Runtime & Dependencies

- Pure JavaScript (ESM — `export default`), no TypeScript
- No `package.json`, no installed npm packages
- Uses **Node.js native `fetch`** (requires Node 18+)
- No build step, no test framework, no linter configured

## Deployment

Designed for **Vercel** serverless functions. Files placed at `api/*.js` are automatically mapped to `/api/*` routes. The root `generate.js` maps to `/generate`.

## OpenAI Integration

Both handlers call `POST https://api.openai.com/v1/chat/completions` with `model: "gpt-4"`.

**API key handling**: `generate.js` uses a placeholder (`sk-ВОТ_СЮДА_ВСТАВЬ_СВОЙ_КЛЮЧ`). The key must be supplied via `process.env.OPENAI_API_KEY` — replace the hardcoded `Bearer` string with `Bearer ${process.env.OPENAI_API_KEY}` and configure the env var in Vercel's project settings.

> **Security**: `api/generate.js` currently contains a hardcoded API key in the `Authorization` header. This must be rotated and replaced with an environment variable before any deployment or further commits.

## Key Conventions

- All user-visible text, prompts, and comments are in **Russian**.
- No input validation exists; `req.body.input` is interpolated directly into prompts.
- The two files are intentionally structurally different — do not unify them without understanding the two-stage pipeline intent.
