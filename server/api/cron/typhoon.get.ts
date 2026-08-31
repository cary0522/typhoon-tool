import { createError, defineEventHandler, getHeader } from 'h3'
import {
    fetchTyphoonReport,
    hasWorkSuspension,
    sendTyphoonBotNotification,
    sendTyphoonNotification
} from '../../utils/typhoon'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event)
    const cronSecret = String(config.cronSecret || process.env.CRON_SECRET || '')
    const authorization = getHeader(event, 'authorization') || ''

    if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
        throw createError({ statusCode: 401, statusMessage: '未授權的 Cron 請求' })
    }

    const webhookUrl = String(config.discordWebhookUrl || '')
    const botToken = String(config.discordBotToken || '')
    const channelId = String(config.discordChannelId || '')
    if (!webhookUrl && !(botToken && channelId)) {
        throw createError({ statusCode: 500, statusMessage: '尚未設定 Discord webhook 或 Bot Token 與頻道 ID' })
    }

    const source = String(config.dgpaUrl || 'https://www.dgpa.gov.tw/typh/daily/nds.html')
    const report = await fetchTyphoonReport(source).catch(() => null)
    if (!report) {
        throw createError({ statusCode: 502, statusMessage: '無法取得停班停課資料' })
    }

    // 測試期間暫時每次都發送狀態通知；測試完成後恢復以下條件即可。
    // if (!hasWorkSuspension(report)) {
    //     return {
    //         ok: true,
    //         notified: false,
    //         reason: '沒有停止上班資訊',
    //         checkedAt: new Date().toISOString()
    //     }
    // }

    const notifications = []

    if (webhookUrl) {
        const notification = await sendTyphoonNotification(report, webhookUrl).catch(() => null)
        if (!notification) {
            throw createError({ statusCode: 502, statusMessage: 'Discord webhook 傳送失敗' })
        }
        notifications.push({ destination: 'webhook', ...notification })
    }

    if (botToken && channelId) {
        const notification = await sendTyphoonBotNotification(report, botToken, channelId).catch(() => null)
        if (!notification) {
            throw createError({ statusCode: 502, statusMessage: 'Discord Bot 傳送失敗' })
        }
        notifications.push({ destination: 'bot', ...notification })
    }

    return { ok: true, notified: true, notifications }
})