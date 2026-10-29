'use strict';
// .vv — reveal / download a view-once photo, video or voice note (reply to it)
const sig = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';
const react = (s, m, e) => s.sendMessage(m.chat, { react: { text: e, key: m.key } }).catch(() => {});

const run = async (sock, m, ctx, toOwner) => {
    if (!ctx.isSudo) return ctx.reply(`⚠️ Owner only!\n\n${sig()}`);
    const q = m.quoted;
    if (!q) return ctx.reply(`❗ Reply to a view-once photo, video or voice note\n\n${sig()}`);
    const mime = q.mimetype || '';
    const kind = /image/.test(mime) ? 'image' : /video/.test(mime) ? 'video' : /audio/.test(mime) ? 'audio' : null;
    if (!kind) return ctx.reply(`❗ That isn't a photo, video or voice note\n\n${sig()}`);
    await react(sock, m, '👁️');
    try {
        const buf = await sock.downloadMediaMessage(q);
        if (!buf?.length) throw new Error('empty media');
        const dest = toOwner ? (global._linkedJid || m.chat) : m.chat;
        const caption = q.caption ? `${q.caption}\n\n${sig()}` : sig();
        const payload = kind === 'audio'
            ? { audio: buf, mimetype: mime || 'audio/ogg; codecs=opus', ptt: !!q.ptt }
            : { [kind]: buf, caption };
        await sock.sendMessage(dest, payload, { quoted: m });
        await react(sock, m, '✅');
    } catch (e) {
        await react(sock, m, '❌');
        ctx.reply(`❌ Couldn't open it (${e.message}). View-once media can only be fetched while it is still available.\n\n${sig()}`);
    }
};

module.exports = [
    { command: 'vv',  category: 'tools', execute: (s, m, c) => run(s, m, c, false) },
    { command: 'vv2', category: 'tools', execute: (s, m, c) => run(s, m, c, true) }, // sends to your own chat
];
