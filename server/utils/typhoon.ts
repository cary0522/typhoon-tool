export const DGPA_URL = 'https://www.dgpa.gov.tw/typh/daily/nds.html'

export const TARGET_CITIES = ['台中市', '台南市'] as const

const CITY_NAMES = [
    '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '基隆市',
    '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣',
    '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣'
]

const NO_NOTICE_PATTERNS = [
    /無停班停課(?:訊息|通知|資料)?/,
    /無天然災害停止上班及上課(?:訊息|通知|資料)?/,
    /尚無(?:天然災害)?(?:停班停課|停止上班及上課)(?:訊息|通知|資料)?/,
    /目前(?:尚)?無(?:天然災害)?(?:停班停課|停止上班及上課)(?:訊息|通知|資料)?/,
    /今日(?:尚)?無(?:天然災害)?(?:停班停課|停止上班及上課)(?:訊息|通知|資料)?/
]

export type TyphoonStatus = {
    city: string
    work: string
    school: string
    summary: string
}

export type TyphoonReport = {
    source: string
    fetchedAt: string
    updatedAt: string | null
    hasSuspensionNotice: boolean
    statuses: TyphoonStatus[]
}

const cityPattern = /(臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)/

function cleanText(value: string) {
    return value
        .replace(/<br\s*\/?>/gi, '、')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim()
}

function normalizeCity(value: string) {
    return value.replace('臺', '台')
}

function normalizeStatus(value: string) {
    return value
        .replace(/[：:]/g, '')
        .replace(/\s+/g, '')
        .replace(/停止辦公/g, '停止上班')
}

function statusFromText(city: string, text: string): TyphoonStatus | null {
    const normalized = normalizeStatus(text)
    const work = normalized.match(/(停止上班|正常上班|照常上班)/)?.[1]
    const school = normalized.match(/(停止上課|正常上課|照常上課)/)?.[1]

    if (!work && !school) return null

    const resolvedWork = work === '照常上班' ? '正常上班' : work ?? '未發布'
    const resolvedSchool = school === '照常上課' ? '正常上課' : school ?? '未發布'

    return {
        city,
        work: resolvedWork,
        school: resolvedSchool,
        summary: `${city}:${resolvedWork}、${resolvedSchool}`
    }
}

function normalStatus(city: string): TyphoonStatus {
    return {
        city,
        work: '正常上班',
        school: '正常上課',
        summary: `${city}:正常上班、正常上課`
    }
}

export function parseTyphoonHtml(html: string, source = DGPA_URL): TyphoonReport {
    const updatedAt = cleanText(html.match(/更新時間[^<\n]*/)?.[0] ?? '').replace('更新時間：', '') || null
    const statuses = new Map<string, TyphoonStatus>()
    const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []

    for (const row of rows) {
        const cells = (row.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi) ?? []).map(cleanText)
        const rowText = cells.join(' ')
        const cityMatch = rowText.match(cityPattern)
        if (!cityMatch) continue

        const cityName = cityMatch[1]
        if (!cityName) continue

        const city = normalizeCity(cityName)
        const status = statusFromText(city, rowText.slice(cityMatch.index! + cityMatch[0].length))
        if (status) statuses.set(city, status)
    }

    if (statuses.size === 0) {
        const text = cleanText(html)
        const cityAndStatus = text.match(new RegExp(`${cityPattern.source}[^。；\\n]{0,100}`))
        if (cityAndStatus) {
            const city = normalizeCity(cityAndStatus[0].match(cityPattern)?.[1] ?? '')
            const status = statusFromText(city, cityAndStatus[0].replace(city, ''))
            if (status) statuses.set(city, status)
        }
    }

    const pageText = cleanText(html)
    const hasSuspensionNotice = !NO_NOTICE_PATTERNS.some((pattern) => pattern.test(pageText))

    if (!hasSuspensionNotice) {
        for (const city of CITY_NAMES) {
            statuses.set(city, normalStatus(city))
        }
    } else {
        for (const city of CITY_NAMES) {
            if (!statuses.has(city)) statuses.set(city, normalStatus(city))
        }
    }

    return {
        source,
        fetchedAt: new Date().toISOString(),
        updatedAt,
        hasSuspensionNotice,
        statuses: [...statuses.values()]
    }
}

export function getTargetStatuses(report: TyphoonReport) {
    return TARGET_CITIES.map((city) => report.statuses.find((status) => status.city === city) ?? normalStatus(city))
}

export async function fetchTyphoonReport(source = DGPA_URL) {
    const response = await fetch(source, {
        headers: { 'user-agent': 'typhoon-tool/1.0' }
    })

    if (!response.ok) {
        throw new Error(`DGPA request failed with status ${response.status}`)
    }

    return parseTyphoonHtml(await response.text(), source)
}

function getNotificationContent(report: TyphoonReport) {
    return getTargetStatuses(report).map((status) => status.summary).join('\n')
}

export async function sendTyphoonNotification(report: TyphoonReport, webhookUrl: string) {
    const content = getNotificationContent(report)
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content })
    })

    if (!response.ok) {
        throw new Error(`Discord webhook request failed with status ${response.status}`)
    }

    return { content, sentAt: new Date().toISOString() }
}

export async function sendTyphoonBotNotification(report: TyphoonReport, botToken: string, channelId: string) {
    const content = getNotificationContent(report)
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bot ${botToken}`,
            'content-type': 'application/json'
        },
        body: JSON.stringify({ content })
    })

    if (!response.ok) {
        throw new Error(`Discord bot request failed with status ${response.status}`)
    }

    return { content, sentAt: new Date().toISOString() }
}

export function hasWorkSuspension(report: TyphoonReport) {
    return report.statuses.some((status) => status.work.includes('停止上班'))
}