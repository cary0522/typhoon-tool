# Nuxt Minimal Starter

## 天然災害 API

本專案提供兩個 server API，不需要額外安裝套件：

- `GET /api/typhoon`：抓取行政院人事行政總處頁面，回傳整理後的 JSON。
- `POST /api/typhoon-notify`：抓取最新資料，篩選台中市與台南市後送到 Discord webhook。

回傳的 `statuses` 每筆包含 `city`、`work`、`school` 與 `summary`，例如 `台中市:正常上班、正常上課`。

請先將 `.env.example` 複製成 `.env`，並填入 `NUXT_DISCORD_WEBHOOK_URL`。Webhook URL 僅放在伺服器環境變數，不要提交到 git。

### 自動通知排程

Nuxt/Nitro 伺服器啟動後會建立排程，每週一至週五台灣時間 08:30 執行一次：

1. 抓取 `/api/typhoon` 使用的 DGPA 資料來源。
2. 檢查所有縣市的 `work` 是否包含 `停止上班`。
3. 只有符合條件時，才將台中市與台南市送到 Discord。

這是伺服器程序內的排程，因此部署環境必須保持 Nuxt server 持續運行；若使用會自動休眠或無狀態的 serverless 平台，請改用平台的 Cron Job 呼叫 `POST /api/typhoon-notify`，並由平台負責週一至週五 08:30（Asia/Taipei）觸發。

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
