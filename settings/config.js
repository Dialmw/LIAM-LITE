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
    settings: {
        title:   S.botName || '𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄',
        version: S.version || '1.0',
        author:  'Liam',
    },
    message: {
        owner:   '⚠️ Owner only!\n\n> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄',
        group:   '⚠️ Groups only!\n\n> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄',
        admin:   '⚠️ Admins only!\n\n> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄',
    },
    watermark: '👁️ LIAM LITE',
    sticker: { packname: 'LIAM LITE', author: 'Liam' },
};

module.exports = config;
