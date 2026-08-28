import { createError, defineEventHandler, getQuery } from 'h3'
import { DGPA_URL, fetchTyphoonReport } from '../utils/typhoon'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event)
    const source = String(config.dgpaUrl || DGPA_URL)
    const query = getQuery(event)
    const report = await fetchTyphoonReport(source).catch(() => null)

    if (!report) {
        throw createError({ statusCode: 502, statusMessage: '無法取得停班停課資料' })
    }

    if (query.format === 'text') {
        return report.statuses.map((status) => status.summary).join('\n')
    }

    return report
})