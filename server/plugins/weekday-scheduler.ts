import { fetchTyphoonReport, sendTyphoonNotification } from '../utils/typhoon'

const TAIWAN_TIME_ZONE = 'Asia/Taipei'
const RUN_HOUR = 8
const RUN_MINUTE = 30
const DAY_IN_MS = 24 * 60 * 60 * 1000

function getTaiwanDateParts(date: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TAIWAN_TIME_ZONE,
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
    return {
        weekday: values.weekday,
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hour: Number(values.hour),
        minute: Number(values.minute)
    }
}

function getNextRunAt(now = new Date()) {
    const current = getTaiwanDateParts(now)
    const candidate = new Date(Date.UTC(current.year, current.month - 1, current.day, RUN_HOUR - 8, RUN_MINUTE))
    const day = candidate.getUTCDay()
    const hasPassed = current.hour > RUN_HOUR || (current.hour === RUN_HOUR && current.minute >= RUN_MINUTE)
    let daysToAdd = day === 0 ? 1 : day === 6 ? 2 : hasPassed ? 1 : 0

    if (daysToAdd === 1 && day === 5) daysToAdd = 3
    candidate.setUTCDate(candidate.getUTCDate() + daysToAdd)
    return candidate
}

function hasWorkSuspension(report: Awaited<ReturnType<typeof fetchTyphoonReport>>) {
    return report.statuses.some((status) => status.work.includes('停止上班'))
}

export default defineNitroPlugin(() => {
    const config = useRuntimeConfig()
    const webhookUrl = String(config.discordWebhookUrl || '')
    const source = String(config.dgpaUrl || 'https://www.dgpa.gov.tw/typh/daily/nds.html')

    if (!webhookUrl) {
        console.warn('[typhoon-tool] 排程未啟用：尚未設定 DISCORD_WEBHOOK_URL')
        return
    }

    const scheduleNextRun = () => {
        const nextRun = getNextRunAt()
        const delay = Math.max(nextRun.getTime() - Date.now(), 1000)
        setTimeout(async () => {
            try {
                const report = await fetchTyphoonReport(source)
                if (hasWorkSuspension(report)) {
                    await sendTyphoonNotification(report, webhookUrl)
                    console.info('[typhoon-tool] 已發送停班通知')
                } else {
                    console.info('[typhoon-tool] 今日無停班資訊，不發送通知')
                }
            } catch (error) {
                console.error('[typhoon-tool] 排程執行失敗', error)
            } finally {
                scheduleNextRun()
            }
        }, delay)
    }

    scheduleNextRun()
})