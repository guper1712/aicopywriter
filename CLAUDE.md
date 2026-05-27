# CLAUDE.md — AI Copywriter

## Project Overview

This is a minimal serverless AI copywriting application deployed on Vercel. It exposes two API route handlers that call OpenAI's GPT-4 to generate Russian-language marketing copy using the PERC framework (Problem → Emotion → Relevance → Call-to-action).

## Repository Structure

```
aicopywriter/
├── generate.js          # Root-level serverless handler: structured copywriting
└── api/
    └── generate.js      # /api/generate route: conversational client intake assistant
```

No build system, package manager, test suite, or configuration files exist yet. The project is early-stage.

## API Endpoints

### POST /generate (`generate.js`)
Generates structured marketing copy using the PERC framework with emoji and markdown formatting.

**Request body:**
```json
{
  "input": {
    "niche":         "industry / niche",
    "what_you_do":   "what the business does",
    "client_avatar": "target client description",
    "pain":          "client pain point",
    "product":       "product or service name",
    "value":         "solution / value proposition",
    "result":        "expected client result",
    "unique":        "unique differentiator",
    "platform":      "distribution platform (e.g. Instagram, Telegram)",
    "format":        "content format (e.g. post, story, email)",
    "style":         "tone of voice / style"
  }
}
```

**Response:**
```json
{ "output": "<GPT-4 generated copy>" }
```

### POST /api/generate (`api/generate.js`)
A simpler conversational endpoint. Acts as an AI assistant that collects client answers for generating persuasive text. Accepts a plain string prompt.

**Request body:**
```json
{ "input": "user message string" }
```

**Response:**
```json
{ "result": "<GPT-4 response>" }
```

## Architecture

- **Runtime**: Vercel serverless functions (Node.js). Both files use the `export default async function handler(req, res)` pattern.
- **AI model**: OpenAI `gpt-4` via the Chat Completions API (`https://api.openai.com/v1/chat/completions`).
- **Language**: The system prompts and domain are in Russian. All copy output is in Russian.
- **No framework**: No Next.js, no Express. Pure Vercel function handlers using the native `fetch` API.

## Critical Security Issue — Fix Before Any Commit

`api/generate.js` contains a **real OpenAI API key hardcoded in source**. This must be replaced with an environment variable immediately:

```js
// WRONG (current state)
"Authorization": "Bearer sk-proj-..."

// CORRECT
"Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
```

`generate.js` uses a placeholder string (`sk-ВОТ_СЮДА_ВСТАВЬ_СВОЙ_КЛЮЧ`) — replace it the same way.

Set the key in Vercel's project settings under **Environment Variables** as `OPENAI_API_KEY`. For local development, create a `.env.local` file (never commit it):

```
OPENAI_API_KEY=sk-...
```

Add a `.gitignore` to prevent accidental commits:

```
.env
.env.local
node_modules/
```

## Development Setup (to be established)

The project currently has no `package.json`. Before adding any dependencies or scripts, initialize it:

```bash
npm init -y
```

To deploy:
```bash
vercel deploy
```

To run locally with Vercel's dev server:
```bash
npx vercel dev
```

## Conventions to Follow

- **No hardcoded secrets**: All API keys and credentials must come from `process.env.*`.
- **Response shape consistency**: `/generate` returns `{ output }`, `/api/generate` returns `{ result }`. Keep these shapes stable or migrate both to a single shape.
- **Error handling**: Neither handler currently handles API errors or missing fields. Any new code should add `try/catch` and validate `req.body` before passing it to OpenAI.
- **Language**: System prompts and copy output are in Russian. Keep prompt engineering in Russian unless explicitly migrating.
- **Model**: Currently hardcoded to `gpt-4`. If upgrading, update both files together.

## Known Missing Infrastructure

| Item | Status |
|------|--------|
| `package.json` | Missing — add before using npm packages |
| `.gitignore` | Missing — add immediately |
| `.env.local` / env var docs | Missing |
| Error handling in handlers | Missing |
| Input validation | Missing |
| Tests | Missing |
| Linting / formatting config | Missing |
