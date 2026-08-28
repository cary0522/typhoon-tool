import { createError } from 'h3'

export default defineEventHandler(async () => {
    const config = useRuntimeConfig()

    if (!config.discordApplicationId || !config.discordGuildId || !config.discordBotToken) {
        throw createError({
            statusCode: 500,
            statusMessage: '尚未設定 Discord Application ID、Guild ID 或 Bot Token'
        })
    }

    const url =
        `https://discord.com/api/v10/applications/` +
        `${config.discordApplicationId}/guilds/` +
        `${config.discordGuildId}/commands`

    // 註冊 slash command，只需在最初始呼叫一次
    const result = await $fetch(url, {
        method: 'POST',

        headers: {
            Authorization: `Bot ${config.discordBotToken}`,
        },

        body: {
            name: 'stop_work',
            name_localizations: {
                'zh-TW': '停班'
            },
            type: 1,

            description: '查詢停班停課資訊',

            options: [
                {
                    name: 'city',
                    name_localizations: {
                        'zh-TW': '縣市'
                    },

                    description: '選擇要查詢的縣市',

                    type: 3,

                    required: true,

                    choices: [
                        {
                            name: '臺中市',
                            value: 'taichung',
                        },
                        {
                            name: '臺南市',
                            value: 'tainan',
                        },
                    ],
                },
            ],
        },
    })

    return result
})