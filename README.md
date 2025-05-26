# TLDRit

**TLDRit** is a modern PWA that summarizes news, articles, and documents into concise takeaways. It features a personalized daily news feed, an AI-powered summarizer, text-to-speech playback, and a paywall for premium access.

---

## 🚀 Features

- 🔐 User authentication via Supabase
- 📰 Personalized news feed using curated RSS feeds
- ✂️ TLDR-it tool for summarizing any article or pasted text
- 📢 "Read it to me" text-to-speech summaries
- 🔔 Push notifications with daily top summaries
- 💸 Freemium paywall with upgrade options
- 🛠️ Admin-friendly, scalable Supabase backend

---

## 🧱 Tech Stack

- Frontend: **React + Tailwind** (PWA)
- Backend: **Supabase (Postgres, Auth, Storage)**
- AI: **OpenAI / OpenRouter** for summarization + TTS
- Notifications: **Web Push API**
- Hosting: **Netlify** (MVP backend logic runs as Netlify Functions)

---

## 📦 Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/tldrit.git
cd tldrit
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` (for local dev) and/or set these in Netlify dashboard:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key_or_openrouter
```

### 4. Netlify Functions (MVP Backend)

- News fetching and summarization is handled by a Netlify Function at `/.netlify/functions/fetch-news`.
- The function fetches RSS feeds, summarizes articles with OpenAI, and stores them in Supabase.
- You **do not need Docker or Supabase Edge Functions** for the MVP.

### 5. Run the dev server

```bash
npm run dev
```

---

## 🚀 Deploying to Netlify

1. **Push your code to GitHub.**
2. **Connect your repo to Netlify.**
3. **In Netlify dashboard, add these environment variables:**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
4. **Deploy your site.**
5. **Your news feed will work via the Netlify Function!**

---

## ✅ TODO List

🔐 Authentication
- Supabase auth with email/password and magic link
- Subscription status tracking (free vs premium)

📥 News Feed
- Connect to default RSS feeds (BBC, Verge, CoinDesk, etc.)
- Parse + store articles in Supabase
- Automatically summarize new articles with OpenAI
- Add daily push notifications with top 3 summaries
- User topic preferences (Tech, Crypto, Science, etc.)

✂️ TLDR-it Summarizer
- Accept pasted text or URLs
- Use LLM for summarization
- Summary length control (slider)
- Limit free users (e.g., 2 summaries/day)
- Upgrade to pro = unlimited + better LLM

🔊 Read It to Me (TTS)
- Generate TTS audio from summaries (OpenAI or ElevenLabs)
- Add play button to summaries (for premium users)

🧭 UI/UX
- Bottom tab navigation:
  - Home / Feed
  - TLDR-it
  - News
  - Account
- Responsive mobile-first design
- Dark mode

💸 Paywall
- Show feature differences for free vs pro
- Stripe integration
- Shared access to sister app (eli5it)

🛠️ Admin Tools
- Admin login with elevated permissions
- View usage stats
- Add/remove RSS sources
- Moderation tools

🔒 Database Setup (Supabase)
- users table with subscription and preferences
- news_articles table
- summaries table
- feed_preferences table
- Row-level security policies
- Edge functions (optional)

📌 Inspiration
Inspired by tldrthis.com, but built mobile-first, AI-native, and creator-friendly.

---

## 📝 Netlify Function: fetch-news

- Located at `netlify/functions/fetch-news.js`
- Fetches and summarizes news, then stores in Supabase
- Called from the frontend at `/.netlify/functions/fetch-news`
- Requires the following environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `OPENAI_API_KEY`