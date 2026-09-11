# ⚽ FPL Data Fetcher

**FPL Data Fetcher** lets you instantly view **Fantasy Premier League (FPL)** standings for any mini-league.  
Just enter your league code and fetch live rankings, manager points, and gameweek breakdowns — fast, accurate, and mobile-friendly.

---

## 🌍 Live Site

👉 [https://fpl-data-fetch.vercel.app](https://fpl-data-fetch.vercel.app)

---

## 🚀 Features

**Standings**

- 🏆 League table for any FPL mini-league, with each manager's total and per-gameweek points
- 📈 Rank movement arrows (▲ / ▼) showing change since the previous gameweek
- 🎯 **Top Movers** summary of the biggest risers and fallers
- 🃏 Chip badges next to each manager, plus a **Gameweek Champions** card

**Five tabs**

- **Standings** — the full league table and gameweek champions
- **Transfers** — transfer activity and point hits, per manager per gameweek
- **Compare** — put up to three managers side by side
- **Stats** — league averages, highest single gameweek, most gameweek wins, with charts
- **Chips** — two-slot chip tracking under the 2025/26 rules

**Live gameweek**

- ⚡ Polls every 60 seconds while a gameweek is live, and every 5 minutes otherwise
- ⏱️ Countdown to the next gameweek deadline
- 🔴 LIVE indicator while scores are in progress

**Sharing**

- 🔗 Shareable, bookmarkable URLs — e.g. `/league/1033811?gw=1-3`
- 🖼️ **Share Card**: export a PNG summary of your league
- 🗄️ **League Archive** of past gameweek snapshots

**Also**

- 📥 Download the standings as CSV
- 🧪 Try a demo league without needing a league ID
- 📱 Mobile-friendly: the table becomes a card list on small screens
- 🌗 Light and dark themes
- 📲 Installable as a PWA, with an offline app shell

---

## 🧩 Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Data fetching:** TanStack Query
- **Backend:** Supabase Edge Functions (Deno) with a Postgres cache layer
- **Hosting:** Vercel
- **Analytics:** Vercel Web Analytics & Speed Insights
- **PWA:** vite-plugin-pwa
- **SEO:** Open Graph, Twitter cards and JSON-LD

---

## 🧠 How It Works

1. Enter your **FPL League ID** — you can find it in your league's URL:
   `https://fantasy.premierleague.com/leagues/123456/standings` → the league ID is `123456`.
2. Pick the **gameweek range** you want (defaults to the whole season).
3. Click **Display Data**. The standings load, and the URL updates so you can bookmark or share it.

### ⚡ Caching

League data is cached on the server, so repeat views are fast and the upstream FPL API isn't
hammered. A cached response is reused for **60 seconds while a gameweek is live**, and
**15 minutes** otherwise.

### 🚧 Limits

Leagues are capped at **150 managers**, and gameweeks are limited to **1–38**. Larger leagues
are rejected with an explanatory message, because pulling every manager's history would exceed
practical API and timeout limits.

---

## 🛠️ Local Setup

If you want to run or modify the project locally:

```bash
# Clone the repository
git clone https://github.com/TimothyKanyi/FplDataFetch.git

# Navigate to the folder
cd FplDataFetch

# Install dependencies
npm install

# Run the development server
npm run dev
```

### 🔑 Environment

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

Those are the only two variables the app reads. The publishable (anon) key is safe to expose in
the browser — it's protected by row-level security, and all database access goes through Edge
Functions.

> ⚠️ **Never** put a service-role key in a `VITE_`-prefixed variable. Vite inlines `VITE_*`
> values directly into the client bundle, so anything there is public.

### 📜 Scripts

| Command           | What it does                          |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Dev server on `http://localhost:8080` |
| `npm run build`   | Production build into `dist/`         |
| `npm run preview` | Serve the production build locally    |
| `npm run lint`    | Run ESLint                            |

### 🚢 Deploying

Pushing to `main` deploys the frontend to Vercel automatically. The Supabase Edge Functions
deploy separately:

```bash
supabase functions deploy fetch-league-data prewarm-cache get-league-history generate-excel
```

---

## ⚠️ Disclaimer

FPL Data Fetcher is an independent, unofficial tool. It is not affiliated with, endorsed by, or
connected to the Premier League or Fantasy Premier League. League data is fetched from the
public Fantasy Premier League API.
