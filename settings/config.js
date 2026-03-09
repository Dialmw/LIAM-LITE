'use strict';
const S = require('./settings');

const config = {
    get owner()  { return S.adminNumber; },
    sudo:        S.sudo || [],
    sessionId:   S.sessionId,
    maxSessions: S.maxSessions || 10,
    status:      { public: S.mode === 'public' },
    features:    S.features,
    mode:        S.mode,
    timezone:    S.timezone || 'Africa/Nairobi',
    channel:     S.channel,
    pairingSite: S.pairingSite,
    github:      S.github,
    menuStyle:   S.menuStyle || 'fancy',
    statusReactEmojis: S.statusReactEmojis || ['😍','🔥','💯'],
    antiDeleteTarget:  S.antiDeleteTarget || 'owner',
    telegramBotToken:  S.telegramBotToken  || '',
    telegramChannelId: S.telegramChannelId || '',
    settings: {
        title:   S.botName || '𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄',
        version: S.version || '2.0',
        author:  'Liam',
        prefix:  S.prefix || '.',
    },
    message: {
        owner: '𝙈𝙢𝙢 𝙣𝙤𝙩 𝙖𝙡𝙡𝙤𝙬𝙚𝙙, 𝙖𝙨𝙠 𝙢𝙮 𝙢𝙖𝙨𝙩𝙚𝙧 👁️',
        group: '⚠️ 𝙂𝙧𝙤𝙪𝙥𝙨 𝙤𝙣𝙡𝙮!\n\n> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄',
        admin: '⚠️ 𝘼𝙙𝙢𝙞𝙣𝙨 𝙤𝙣𝙡𝙮!\n\n> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄',
    },
    watermark: '👁️ LIAM LITE',
    sticker: { packname: 'LIAM LITE', author: 'Liam' },
};

module.exports = config;
