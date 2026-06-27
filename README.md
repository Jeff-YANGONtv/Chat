# JB Hub — Telegram Mini App (Vercel)

Ad Network Hub + Live Chat Router across 3 Telegram bots.

## 🚀 Quick Deploy to Vercel

### 1. Setup Supabase
- Create a new project at https://supabase.com
- Open **SQL Editor** → paste `schema.sql` → **Run**
- Copy `Project URL` and `service_role` key from Settings → API

### 2. Deploy to Vercel
```bash
npm install -g vercel
vercel login
vercel
```
Or drag & drop the folder at https://vercel.com/new

### 3. Set Environment Variables in Vercel Dashboard
Go to **Project → Settings → Environment Variables** and add:

| Key | Example |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` |
| `TELEGRAM_CHANNEL_ID` | `-1001234567890` (your private storage channel) |
| `BOT_TOKEN_1` | First bot token |
| `BOT_TOKEN_2` | Second bot token |
| `BOT_TOKEN_3` | Third bot token |
| `ADMIN_PASSWORD` | `JB2026@ADMIN` |

After adding env vars, **Redeploy** the project.

### 4. Register Telegram Webhooks
Replace `YOUR_VERCEL_URL` with your deployment (e.g. `jbhub.vercel.app`):

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN_1>/setWebhook?url=https://YOUR_VERCEL_URL/webhook?bot=bot1"
curl "https://api.telegram.org/bot<BOT_TOKEN_2>/setWebhook?url=https://YOUR_VERCEL_URL/webhook?bot=bot2"
curl "https://api.telegram.org/bot<BOT_TOKEN_3>/setWebhook?url=https://YOUR_VERCEL_URL/webhook?bot=bot3"
```

### 5. Add Bot1 as Admin to Storage Channel
- Create a private Telegram channel
- Add `BOT_TOKEN_1` bot as **administrator** with **Post Messages** permission
- Forward any message from the channel to `@username_to_id_bot` → get the `-100xxx` ID
- Paste that ID as `TELEGRAM_CHANNEL_ID` env var

### 6. Configure Mini App in BotFather
- `/newapp` → choose a bot → Web App URL = `https://YOUR_VERCEL_URL`
- Set Menu Button → Web App → same URL

## 🔐 Admin Login
- Tap Profile icon (top-right) → **Open Admin Dashboard**
- Password: `JB2026@ADMIN` (or whatever you set)

## 📁 Project Structure
```
jb-hub/
├── api/
│   └── index.js        ← All API routes (Vercel serverless)
├── public/
│   └── index.html      ← SPA frontend
├── schema.sql          ← Supabase DB blueprint + seed
├── vercel.json         ← Vercel routing config
├── package.json
└── .env.example
```

## 🛠 Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/webhook?bot=bot1` | Telegram inbound (per bot) |
| GET  | `/api/chats?type=private\|group` | Inbox list |
| GET  | `/api/messages/:chatId` | Conversation log |
| POST | `/api/send-message` | Admin outbound reply |
| GET  | `/api/ads` | Channel inventory |
| GET  | `/api/wallet-summary` | Revenue total |
| GET  | `/api/wallet-history` | Per-channel revenue rows |
| POST | `/api/update-cell` | Spreadsheet inline edit |
| POST | `/api/add-row` | New channel row |
| DELETE | `/api/delete-row/:id` | Remove row |
| POST | `/api/upload-media/:id` | Send asset to Telegram storage channel |
| GET  | `/api/get-media-url/:file_id` | Resolve `file_id` → CDN URL |
| POST | `/api/admin-auth` | Password gate |

## 💡 Notes
- Vercel free tier: 100GB bandwidth, 10s function timeout (we use 30s max).
- File uploads limited to 20MB per Telegram `sendPhoto`.
- Polling-based chat (4s) — for production, swap to Supabase Realtime.
