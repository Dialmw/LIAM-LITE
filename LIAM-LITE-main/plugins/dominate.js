'use strict';
const fs   = require('fs');
const path = require('path');

const sig   = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';
const react = (s,m,e) => s.sendMessage(m.chat,{react:{text:e,key:m.key}}).catch(()=>{});

const _DFILE = path.join(__dirname, '..', 'settings', 'dominate.json');
const _dLoad = () => { try { return JSON.parse(fs.readFileSync(_DFILE, 'utf8')); } catch { return {}; } };
const _dSave = d  => { try { fs.writeFileSync(_DFILE, JSON.stringify(d, null, 2)); } catch {} };
let _dom = _dLoad();
const ds = {
    get:    jid     => _dom[jid] || null,
    set: (jid, obj) => { _dom[jid] = obj; _dSave(_dom); },
    del:    jid     => { delete _dom[jid]; _dSave(_dom); },
};

module.exports._ds = ds;

module.exports = [
{
    command: 'dominate', category: 'group', group: true,
    execute: async (sock, m, ctx) => {
        if (!ctx.isCreator && !ctx.isAdmins) return ctx.reply(`⚠️ Admins only!\n\n${sig()}`);
        const arg = (ctx.args[0] || '').toLowerCase();
        const jid = m.chat;
        const current = !!ds.get(jid);
        const on = arg === 'on' ? true : arg === 'off' ? false : !current;

        if (on === current && (arg === 'on' || arg === 'off')) {
            await react(sock, m, on ? '✅' : 'ℹ️');
            return ctx.reply(`👑 *Dominate* is already *${on ? '✅ ON' : '❌ OFF'}*\n\n${sig()}`);
        }

        if (on) {
            ds.set(jid, { blocked: 0, on: Date.now() });
            await react(sock, m, '👑');
            return ctx.reply(
                `👑 *Dominate*\n\n╔═══════════════════╗\n║  ✅  E N A B L E D  ║\n╚═══════════════════╝\n\n_LIAM LITE is now the only active bot._\n_Other bot commands deleted._\n\n${sig()}`
            );
        } else {
            ds.del(jid);
            await react(sock, m, '❌');
            return ctx.reply(
                `👑 *Dominate*\n\n╔══════════════════════╗\n║  ❌  D I S A B L E D  ║\n╚══════════════════════╝\n\n_Normal mode restored._\n\n${sig()}`
            );
        }
    }
},
];
