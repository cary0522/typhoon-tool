import { createError, defineEventHandler, readBody } from 'h3'
import { fetchTyphoonReport, sendTyphoonBotNotification, type TyphoonReport } from '../utils/typhoon'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event)
    const botToken = String(config.discordBotToken || '')
    const channelId = String(config.discordChannelId || '')

    if (!botToken || !channelId) {
        throw createError({ statusCode: 500, statusMessage: '尚未設定 DISCORD_BOT_TOKEN 或 DISCORD_CHANNEL_ID' })
    }

    let report: TyphoonReport
    const body = await readBody<{ report?: TyphoonReport }>(event).catch(() => null)

    if (body?.report?.statuses) {
        report = body.report
    } else {
        const source = String(config.dgpaUrl || 'https://www.dgpa.gov.tw/typh/daily/nds.html')
        report = await fetchTyphoonReport(source).catch(() => null) as TyphoonReport
        if (!report) {
            throw createError({ statusCode: 502, statusMessage: '無法取得停班停課資料' })
        }
    }

    const notification = await sendTyphoonBotNotification(report, botToken, channelId).catch(() => null)
    if (!notification) {
        throw createError({ statusCode: 502, statusMessage: 'Discord Bot 傳送失敗' })
    }

    return { ok: true, ...notification }
})