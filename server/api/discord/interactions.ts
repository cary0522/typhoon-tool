import { createError, defineEventHandler, getHeader, readRawBody } from 'h3'
import { fetchTyphoonReport, getTargetStatuses } from '../../utils/typhoon'

type DiscordInteraction = {
    type?: number
    data?: {
        name?: string
        options?: Array<{ name?: string; value?: string }>
    }
}

const DISCORD_PING = 1
const DISCORD_APPLICATION_COMMAND = 2
const DISCORD_PONG = 1
const DISCORD_CHANNEL_MESSAGE = 4
const DISCORD_EPHEMERAL = 1 << 6

function hexToBytes(value: string) {
    return Uint8Array.from(value.match(/.{2}/g) || [], (byte) => Number.parseInt(byte, 16))
}

async function verifyDiscordSignature(body: string, signature: string, timestamp: string, publicKey: string) {
    if (!/^[0-9a-f]{128}$/i.test(signature) || !/^\d+$/.test(timestamp) || !/^[0-9a-f]{64}$/i.test(publicKey)) {
        return false
    }

    const key = await crypto.subtle.importKey(
        'raw',
        hexToBytes(publicKey),
        { name: 'Ed25519' } as Algorithm,
        false,
        ['verify']
    )
    return crypto.subtle.verify(
        { name: 'Ed25519' } as Algorithm,
        key,
        hexToBytes(signature),
        new TextEncoder().encode(timestamp + body)
    )
}

function reply(content: string, ephemeral = false) {
    return {
        type: DISCORD_CHANNEL_MESSAGE,
        data: {
            content,
            ...(ephemeral ? { flags: DISCORD_EPHEMERAL } : {})
        }
    }
}

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event)
    const publicKey = String(config.discordPublicKey || '')
    const signature = getHeader(event, 'x-signature-ed25519') || ''
    const timestamp = getHeader(event, 'x-signature-timestamp') || ''
    const body = await readRawBody(event) || ''

    if (!publicKey || !(await verifyDiscordSignature(body, signature, timestamp, publicKey))) {
        throw createError({ statusCode: 401, statusMessage: 'Discord signature verification failed' })
    }

    let interaction: DiscordInteraction
    try {
        interaction = JSON.parse(body) as DiscordInteraction
    } catch {
        throw createError({ statusCode: 400, statusMessage: 'Invalid Discord interaction payload' })
    }

    if (interaction.type === DISCORD_PING) {
        return { type: DISCORD_PONG }
    }

    if (interaction.type !== DISCORD_APPLICATION_COMMAND || interaction.data?.name !== 'stop_work') {
        return reply('不支援的 Discord 指令。', true)
    }

    const cityValue = interaction.data.options?.find((option) => option.name === 'city')?.value
    const city = cityValue === 'taichung' ? '台中市' : cityValue === 'tainan' ? '台南市' : null

    if (!city) {
        return reply('請選擇台中市或台南市。', true)
    }

    try {
        const source = String(config.dgpaUrl || 'https://www.dgpa.gov.tw/typh/daily/nds.html')
        const report = await fetchTyphoonReport(source)
        const status = getTargetStatuses(report).find((item) => item.city === city)

        return reply([
            status?.summary || `${city}:未發布`,
            report.updatedAt ? `資料更新時間：${report.updatedAt}` : null
        ].filter(Boolean).join('\n'))
    } catch {
        return reply('目前無法取得停班停課資料，請稍後再試。', true)
    }
})
