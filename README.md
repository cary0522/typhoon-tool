# Nuxt Minimal Starter

## 天然災害 API

本專案提供三個 server API，不需要額外安裝套件：

- `GET /api/typhoon`：抓取行政院人事行政總處頁面，回傳整理後的 JSON。
- `POST /api/typhoon-notify`：抓取最新資料，篩選台中市與台南市後送到 Discord webhook。
- `POST /api/typhoon-notify-bot`：抓取最新資料，使用 Discord Bot 傳送到指定頻道 ID。

回傳的 `statuses` 每筆包含 `city`、`work`、`school` 與 `summary`，例如 `台中市:正常上班、正常上課`。

請先將 `.env.example` 複製成 `.env`，並填入 webhook 或 Bot 的設定。Webhook URL 與 Bot Token 僅放在伺服器環境變數，不要提交到 git。

### Vercel 自動通知排程

Vercel 會依 [vercel.json](vercel.json) 的設定，每週一至週五執行 `/api/cron/typhoon`。Cron 使用 UTC 時間 `00:30`，換算為台灣時間就是 08:30：

1. 抓取 `/api/typhoon` 使用的 DGPA 資料來源。
2. 檢查所有縣市的 `work` 是否包含 `停止上班`。
3. 只有符合條件時，才將台中市與台南市送到已設定的 Discord webhook 及 Bot 頻道。

請在 Vercel Project Settings > Environment Variables 設定：

```env
NUXT_DISCORD_WEBHOOK_URL=...
NUXT_DGPA_URL=https://www.dgpa.gov.tw/typh/daily/nds.html
NUXT_CRON_SECRET=...
CRON_SECRET=...
NUXT_DISCORD_APPLICATION_ID=...
NUXT_DISCORD_PUBLIC_KEY=...
NUXT_DISCORD_BOT_TOKEN=...
NUXT_DISCORD_CHANNEL_ID=...
NUXT_DISCORD_GUILD_ID=...
```

`NUXT_CRON_SECRET` 與 `CRON_SECRET` 請設定為相同的隨機長字串；Vercel Cron 會以 `CRON_SECRET` 自動加入 `Authorization: Bearer <secret>` header。手動呼叫 `/api/cron/typhoon` 時也必須帶相同 header。修改環境變數後請重新部署。

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
