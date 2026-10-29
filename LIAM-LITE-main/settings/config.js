'use strict';
const S = require('./settings');
const fs   = require('fs');
const path = require('path');

// ── Persistent runtime settings ───────────────────────────────────────────────
// Toggles changed from WhatsApp (.autoreactstatus on, .antidelete off, .setstatusemoji …)
// are saved to settings/runtime.json so they survive restarts / redeploys.
const RT_FILE = path.join(__dirname, 'runtime.json');
const rtLoad  = () => { try { return JSON.parse(fs.readFileSync(RT_FILE, 'utf8')); } catch { return {}; } };
let _rt = rtLoad();
const rtSave  = () => { try { fs.writeFileSync(RT_FILE, JSON.stringify(_rt, null, 2)); } catch {} };

const features = new Proxy({ ...(S.features || {}), ...(_rt.features || {}) }, {
    set(t, k, v) { t[k] = v; _rt.features = { ...(_rt.features || {}), [k]: v }; rtSave(); return true; },
});

const config = {
    get owner()  { return S.adminNumber; },
    sudo:        S.sudo || [],
    sessionId:   S.sessionId,
    maxSessions: S.maxSessions || 10,
    status:      { public: S.mode === 'public' },
    features,
    mode:        S.mode,
    timezone:    S.timezone || 'Africa/Nairobi',
    channel:     S.channel,
    pairingSite: S.pairingSite,
    github:      S.github,
    menuStyle:   _rt.menuStyle || S.menuStyle || 'fancy',
    statusReactEmojis: _rt.statusReactEmojis || S.statusReactEmojis || ['😍','🔥','💯'],
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

// Persist plain-property changes (menu style, status emojis) too
const persisted = new Proxy(config, {
    set(t, k, v) {
        t[k] = v;
        if (['menuStyle', 'statusReactEmojis'].includes(k)) { _rt[k] = v; rtSave(); }
        return true;
    },
});

module.exports = persisted;
