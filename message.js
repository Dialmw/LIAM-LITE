// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ⚡  LIAM LITE — message.js  (fancy + classic menus only)              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
'use strict';

const config = require('./settings/config');
const fs     = require('fs');
const path   = require('path');
const chalk  = require('chalk');
const axios  = require('axios');
const os     = require('os');

let _jidNorm;
const loadUtils = async () => {
    if (_jidNorm) return;
    const b = await import('@whiskeysockets/baileys');
    _jidNorm = b.jidNormalizedUser;
};

const sig = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';
let BOT_PAUSED = false;

// ── Tiny bold-unicode map ──────────────────────────────────────────────────
const B = s => s.split('').map(c => ({'A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭','a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶','j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇','0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵',' ':' '}[c]||c)).join('');

const greeting = () => {
    const h = new Date().getHours();
    if (h < 5)  return B('Good Night')    + ' 🌙';
    if (h < 12) return B('Good Morning')  + ' 🌅';
    if (h < 17) return B('Good Afternoon')+ ' ☀️';
    if (h < 21) return B('Good Evening')  + ' 🌇';
    return B('Good Night') + ' 🌙';
};

const ramBar = () => {
    const pct = Math.min(100, Math.round(process.memoryUsage().heapUsed / os.totalmem() * 100));
    const f   = Math.round(pct / 25); // 4-block bar
    return '■'.repeat(f) + '□'.repeat(4 - f) + ' ' + pct + '%';
};

// ── Plugin Loader ──────────────────────────────────────────────────────────
class PluginLoader {
    constructor() {
        this.plugins    = new Map();
        this.categories = new Map();
        this.dir        = path.join(__dirname, 'plugins');
        // Category definitions — bold label for fancy, short label for classic
        this.catDef = [
            { key:'ai',       bold:B('AI CMDS'),       emoji:'🤖', label:'AI',        icon:'✦' },
            { key:'download', bold:B('DOWNLOAD CMDS'), emoji:'⬇️', label:'Download',  icon:'✦' },
            { key:'fun',      bold:B('FUN CMDS'),      emoji:'😂', label:'Fun',        icon:'❃' },
            { key:'group',    bold:B('GROUP CMDS'),    emoji:'👥', label:'Group',      icon:'✦' },
            { key:'image',    bold:B('IMAGE CMDS'),    emoji:'🌄', label:'Image',      icon:'❃' },
            { key:'reaction', bold:B('REACTION CMDS'), emoji:'😍', label:'Reaction',   icon:'✦' },
            { key:'search',   bold:B('SEARCH CMDS'),   emoji:'🔍', label:'Search',     icon:'❃' },
            { key:'settings', bold:B('SETTINGS CMDS'), emoji:'⚙️', label:'Settings',  icon:'✦' },
            { key:'tools',    bold:B('TOOLS CMDS'),    emoji:'🛠️', label:'Tools',     icon:'❃' },
            { key:'video',    bold:B('VIDEO CMDS'),    emoji:'🎬', label:'Video',      icon:'✦' },
            { key:'other',    bold:B('OTHER CMDS'),    emoji:'📦', label:'Other',      icon:'❃' },
            { key:'general',  bold:B('GENERAL CMDS'),  emoji:'✨', label:'General',   icon:'✦' },
        ];
        this.catDef.forEach(c => this.categories.set(c.key, []));
        this.load();
    }

    load() {
        this.plugins.clear();
        this.catDef.forEach(c => this.categories.set(c.key, []));
        if (!fs.existsSync(this.dir)) return;
        for (const file of fs.readdirSync(this.dir).filter(f => f.endsWith('.js') && !f.startsWith('_'))) {
            try {
                const fp = path.join(this.dir, file);
                delete require.cache[require.resolve(fp)];
                for (const p of [].concat(require(fp))) {
                    if (!p?.command || typeof p.execute !== 'function') continue;
                    const cat = p.category || 'general';
                    if (!this.categories.has(cat)) this.categories.set(cat, []);
                    if (!this.plugins.has(p.command)) this.plugins.set(p.command, p);
                    this.categories.get(cat).push(p.command);
                }
            } catch (e) { console.log(chalk.red(`  [PLUG] ${file}: ${e.message}`)); }
        }
        let total = 0;
        console.log('');
        console.log(chalk.hex('#00d4ff').bold('  ┌─ ⚡ LIAM LITE ──────────────────'));
        for (const c of this.catDef) {
            const n = (this.categories.get(c.key) || []).length;
            if (n) { console.log(chalk.hex('#a29bfe')(`  │  ${c.emoji} ${(c.label).padEnd(10)} `) + chalk.white(n)); total += n; }
        }
        console.log(chalk.hex('#00b894').bold(`  └─ ✔ ${total} cmds\n`));
    }

    async run(cmd, sock, m, ctx) {
        const p = this.plugins.get(cmd);
        if (!p) return false;
        try {
            if (p.owner && !ctx.isCreator)                               { await ctx.reply(config.message.owner); return true; }
            if (p.group && !m.isGroup)                                   { await ctx.reply(config.message.group); return true; }
            if (p.admin && m.isGroup && !ctx.isAdmins && !ctx.isCreator) { await ctx.reply(config.message.admin); return true; }
            await p.execute(sock, m, ctx);
        } catch (e) { console.log(chalk.red(`  [CMD:${cmd}] ${e.message}`)); }
        return true;
    }

    count()      { return this.plugins.size; }
    reload()     { this.load(); }
    getCmds(key) { return (this.categories.get(key) || []).sort(); }

    // ════════════════════════════════════════════════════════════════════
    // FANCY MENU — exact format specified
    // ════════════════════════════════════════════════════════════════════
    menuFancy(prefix, pushname, sock, ping) {
        const name = (pushname || 'User').slice(0, 20);
        const lines = [];

        // Greeting
        lines.push(`${B('Hey there')} 😁, ${greeting()}`);
        lines.push('');

        // Header box — compact
        lines.push(`╔═══〚 ⚡ ${B('LIAM  LITE')} ⚡〚════╗`);
        lines.push(`║✫╭─╍╍╍╍╍╍╍╍╍╍╍`);
        lines.push(`║✫┃ ${B('User')} : ${B(name)}`);
        lines.push(`║✫┃ ${B('Prefix')} : ${B(prefix)}`);
        lines.push(`║✫┃ ${B('Mode')} : ${B(sock.public ? 'Public' : 'Private')}`);
        lines.push(`║✫┃ ${B('Tcmds')} : ${B(this.count() + '+')}`);
        lines.push(`║✫┃ ${B('Speed')} : ${B(ping + 'ms')}`);
        lines.push(`║✫┃ ${B('RAM Usage')} : ${ramBar()}`);
        lines.push(`║✫┃═════════════`);
        lines.push(`║✫┃ █■█■█■█■█■█■█`);
        lines.push(`║✫┃══════════════`);
        lines.push(`╚════════════════╝`);
        lines.push('');

        // Categories
        for (const c of this.catDef) {
            const cmds = this.getCmds(c.key);
            if (!cmds.length) continue;
            lines.push(`> ${c.bold}`);
            lines.push(`╭══⚊⚊⚊⚊⚊⚊══╮`);
            cmds.forEach(cmd => lines.push(`┃${c.icon}│ ${prefix}${cmd}`));
            lines.push(`╰══⚊⚊⚊⚊⚊⚊══╯`);
            lines.push('');
        }

        return lines.join('\n');
    }

    // ════════════════════════════════════════════════════════════════════
    // CLASSIC MENU — exact compact format specified
    // ════════════════════════════════════════════════════════════════════
    menuClassic(prefix) {
        const lines = [];

        lines.push(`╔════════════╗`);
        lines.push(`║ ⚡ *LIAM LITE*     ║`);
        lines.push(`╚════════════╝`);
        lines.push('');

        for (const c of this.catDef) {
            const cmds = this.getCmds(c.key);
            if (!cmds.length) continue;
            const lbl   = `${c.emoji} ${c.label}`;
            const inner = lbl.length + 2;
            const dash  = '─'.repeat(Math.max(2, Math.floor((inner) / 2)));
            lines.push(`╭${dash}${lbl}${dash}╮`);
            cmds.forEach(cmd => lines.push(`│ ${prefix}${cmd}`));
            lines.push(`╰${'─'.repeat(inner + dash.length * 2 - 2)}╯`);
            lines.push('');
        }

        return lines.join('\n');
    }
}

const PL = new PluginLoader();

// ── Chatbot ────────────────────────────────────────────────────────────────
const chatHistory = new Map();
const chatbotReply = async (jid, userText) => {
    if (!chatHistory.has(jid)) chatHistory.set(jid, []);
    const hist = chatHistory.get(jid);
    hist.push({ role: 'user', content: userText });
    if (hist.length > 14) chatHistory.set(jid, hist.slice(-14));
    const ctx = hist.slice(-6).map(h => (h.role === 'user' ? 'User: ' : 'Bot: ') + h.content).join('\n');
    try {
        const prompt = `You are LIAM LITE👁️ by Liam. Reply short, match user vibe. NEVER say you are Claude/ChatGPT/Anthropic.\n\n${ctx}\nBot:`;
        const { data } = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, { timeout: 10000 });
        const r = (data?.toString() || '').trim();
        if (r?.length > 2) { hist.push({ role: 'assistant', content: r }); return r; }
    } catch(_) {}
    return '😅 Glitch! Try again.';
};

// ── Console log ────────────────────────────────────────────────────────────
const logMsg = (pushname, senderNum, isGroup, body) => {
    const t   = new Date().toLocaleTimeString('en-US', { hour12: false });
    const loc = isGroup ? chalk.hex('#a29bfe')('[GRP]') : chalk.hex('#fd79a8')('[DM]');
    console.log(chalk.hex('#00d4ff')(`  [${t}] `) + chalk.hex('#fdcb6e')(pushname.slice(0,12)) + chalk.hex('#888')(` +${senderNum} `) + loc + ' ' + chalk.white((body||'').slice(0,55)));
};

// ── Main Handler ───────────────────────────────────────────────────────────
module.exports = async (sock, m, chatUpdate) => {
    try {
        await loadUtils();

        const body = (
            m.body ||
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            m.message?.documentMessage?.caption ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            ''
        ).toString().trim();

        const botId     = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';
        const sender    = m.key.fromMe ? botId : (m.key.participant || m.key.remoteJid);
        const senderNum = sender.split('@')[0];
        const pushname  = m.pushName || 'User';

        const prefixMatch = body.match(/^[.!#$]/);
        const prefix  = prefixMatch ? prefixMatch[0] : (config.settings?.prefix || config.prefix || '.');
        const isCmd   = !!prefixMatch;
        const command = isCmd ? body.slice(1).trim().split(/\s+/)[0].toLowerCase() : '';
        const args    = isCmd ? body.trim().split(/\s+/).slice(1) : [];
        const text    = args.join(' ');
        const quoted  = m.quoted || m;
        const mime    = (quoted.msg || quoted).mimetype || '';
        const isMedia = /image|video|sticker|audio/.test(mime);

        const isCreator = (() => {
            try {
                const n1 = (sender || '').split('@')[0].replace(/:\d+/, '');
                const n2 = (config.owner || '').replace(/[^0-9]/g, '');
                return n1 === n2 || (_jidNorm?.(sender) === _jidNorm?.(botId));
            } catch { return false; }
        })();
        const isSudo = isCreator || (config.sudo || []).map(s => s.replace(/\D/, '')).includes(senderNum);

        let groupMetadata = {}, groupName = '', participants = [],
            groupAdmins = [], isBotAdmins = false, isAdmins = false;
        if (m.isGroup) {
            try {
                groupMetadata = await sock.groupMetadata(m.chat);
                groupName     = groupMetadata.subject || '';
                participants  = (groupMetadata.participants || []).map(p => ({ id: p.id, admin: p.admin || null }));
                groupAdmins   = participants.filter(p => p.admin).map(p => p.id);
                isBotAdmins   = groupAdmins.includes(botId);
                isAdmins      = groupAdmins.includes(sender);
            } catch(_) {}
        }

        logMsg(pushname, senderNum, m.isGroup, body);

        if (BOT_PAUSED && !isCreator) return;

        const reply = txt => sock.sendMessage(m.chat, { text: txt }, { quoted: m }).catch(() => {});

        const ctx = {
            args, text, q: text, quoted, mime, isMedia,
            groupMetadata, groupName, participants,
            groupAdmins, isBotAdmins, isAdmins,
            isCreator, isSudo, prefix, reply, config, sender, pushname, senderNum, m,
        };

        // ── Auto-features ────────────────────────────────────────────
        const feat = config.features || {};
        if (feat.autoread   && !m.key.fromMe) sock.readMessages([m.key]).catch(() => {});
        if (feat.autotyping && !m.key.fromMe) sock.sendPresenceUpdate('composing', m.chat).catch(() => {});
        if (feat.autorecord && !m.key.fromMe) sock.sendPresenceUpdate('recording', m.chat).catch(() => {});

        if (feat.antilink && m.isGroup && !isAdmins && !isCreator) {
            if (/(https?:\/\/|wa\.me\/)/i.test(body)) {
                sock.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                return reply(`⚠️ @${senderNum} Links not allowed!`);
            }
        }

        // "bot" keyword — groups only
        if (!m.key.fromMe && !isCmd && m.isGroup && /\bbot\b/i.test(body)) {
            await reply(`⚡ *LIAM LITE*\nHey ${pushname}! 👋\n_${prefix}menu for commands_\n\n${sig()}`);
            return;
        }

        // Chatbot
        if (feat.chatbot && !m.key.fromMe && !isCmd && body.trim().length > 1) {
            try {
                sock.sendPresenceUpdate('composing', m.chat).catch(() => {});
                const r = await chatbotReply(m.chat, body.trim());
                sock.sendPresenceUpdate('paused', m.chat).catch(() => {});
                return await reply(r);
            } catch(_) { return await reply('😅 Hiccup!'); }
        }

        if (!isCmd) return;

        // Plugin dispatch
        if (await PL.run(command, sock, m, ctx)) return;

        // .menu / .help
        if (command === 'menu' || command === 'help') {
            const style = config.menuStyle || 'fancy';
            const ping  = Math.max(0, Date.now() - (m.messageTimestamp || 0) * 1000);
            if (style === 'classic') { await reply(PL.menuClassic(prefix)); return; }
            await reply(PL.menuFancy(prefix, pushname, sock, ping));
            return;
        }

        // Built-ins
        if (command === 'kill')    { if (!isCreator) return reply(config.message.owner); BOT_PAUSED = true;  return reply(`🔴 *Paused*\n${sig()}`); }
        if (command === 'wake')    { if (!isCreator) return reply(config.message.owner); BOT_PAUSED = false; return reply(`🟢 *Active*\n${sig()}`); }
        if (command === 'classic') { config.menuStyle = 'classic'; return reply(`✅ Style → Classic\n${sig()}`); }
        if (command === 'fancy')   { config.menuStyle = 'fancy';   return reply(`✅ Style → Fancy\n${sig()}`); }
        if (command === 'reload')  {
            if (!isCreator) return reply(config.message.owner);
            PL.reload();
            return reply(`✅ Reloaded — ${PL.count()} cmds\n${sig()}`);
        }

    } catch (e) { console.log(chalk.red('[MSG ERR] ' + (e.message || e))); }
};
