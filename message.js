// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  👁️  LIAM LITE — message.js                                           ║
// ║  NO bot image anywhere • 2 menu styles (classic/fancy) • Ultra-fast   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
'use strict';

const config = require('./settings/config');
const fs     = require('fs');
const path   = require('path');
const chalk  = require('chalk');
const axios  = require('axios');
const os     = require('os');
const moment = require('moment-timezone');

// ── Dominate store ────────────────────────────────────────────────────────────
const _DFILE = path.join(__dirname, 'settings', 'dominate.json');
const _dLoad = () => { try { return JSON.parse(fs.readFileSync(_DFILE, 'utf8')); } catch { return {}; } };
const _dSave = d  => { try { fs.writeFileSync(_DFILE, JSON.stringify(d, null, 2)); } catch {} };
let _domData = _dLoad();
const domStore = {
    get:    jid     => _domData[jid] || null,
    set: (jid, obj) => { _domData[jid] = obj; _dSave(_domData); },
    del:    jid     => { delete _domData[jid]; _dSave(_domData); },
};

let _jidNorm;
const loadUtils = async () => {
    if (_jidNorm) return;
    const b = await import('@whiskeysockets/baileys');
    _jidNorm = b.jidNormalizedUser;
};

const tz = () => config.timezone || 'Africa/Nairobi';
const sig = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';

// BOT STATE
let BOT_PAUSED = false;


// ── Tiny superscript font for menu cmd listings ──────────────────────────────
const _tMap = {'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ','k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','q':'ᵠ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','A':'ᴬ','B':'ᴮ','C':'ᶜ','D':'ᴰ','E':'ᴱ','F':'ᶠ','G':'ᴳ','H':'ᴴ','I':'ᴵ','J':'ᴶ','K':'ᴷ','L':'ᴸ','M':'ᴹ','N':'ᴺ','O':'ᴼ','P':'ᴾ','Q':'ᵠ','R':'ᴿ','S':'ˢ','T':'ᵀ','U':'ᵁ','V':'ᵛ','W':'ᵂ','X':'ˣ','Y':'ʸ','Z':'ᶻ',' ':' '};
const T = s => s.split('').map(c => _tMap[c]||c).join('');

// PLUGIN LOADER
class PluginLoader {
    constructor() {
        this.plugins    = new Map();
        this.categories = new Map();
        this.dir        = path.join(__dirname, 'plugins');
        this.catDef = [
            { key: 'ai',       label: 'AI',         emoji: '🤖' },
            { key: 'download', label: 'DOWNLOAD',    emoji: '⬇️' },
            { key: 'fun',      label: 'FUN & GAMES', emoji: '😂' },
            { key: 'group',    label: 'GROUP',       emoji: '👥' },
            { key: 'image',    label: 'IMAGE',       emoji: '🌄' },
            { key: 'other',    label: 'OTHER',       emoji: '📦' },
            { key: 'owner',    label: 'OWNER',       emoji: '👑' },
            { key: 'reaction', label: 'REACTION',    emoji: '😍' },
            { key: 'search',   label: 'SEARCH',      emoji: '🔍' },
            { key: 'settings', label: 'SETTINGS',    emoji: '⚙️' },
            { key: 'tools',    label: 'TOOLS',       emoji: '🛠️' },
            { key: 'video',    label: 'VIDEO',       emoji: '🎬' },
            { key: 'general',  label: 'GENERAL',     emoji: '✨' },
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
        console.log(chalk.hex('#00d4ff').bold('  ┌─ ⚡ LIAM LITE — COMMANDS ─────────────'));
        for (const c of this.catDef) {
            const n = (this.categories.get(c.key) || []).length;
            if (n) { console.log(chalk.hex('#a29bfe')(`  │  ${c.emoji} ${c.label.padEnd(12)} `) + chalk.white(String(n))); total += n; }
        }
        console.log(chalk.hex('#00b894').bold(`  └─ ✔ ${total} commands loaded\n`));
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

    // ── CLASSIC MENU STYLE ────────────────────────────────────────────────────
    // Box-style headers, compact command list
    menuClassic(prefix) {
        const lines = [];
        for (const c of this.catDef) {
            const cmds = this.getCmds(c.key);
            if (!cmds.length) continue;
            lines.push(`\n╭──『 *${c.emoji} ${c.label}* 』`);
            cmds.forEach(cmd => lines.push(`│  • ${prefix}${cmd}`));
            lines.push('╰' + '─'.repeat(26));
        }
        return lines.join('\n');
    }

    // ── FANCY MENU — RAVEN BOT style, compact 2-per-row ────────────────────
    menuFancy(prefix) {
        // ── Exact style from spec: small-caps unicode, ⚊ borders ────────────
        const SC_MAP = {
            a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',
            k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',
            u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ',
            A:'ᴀ',B:'ʙ',C:'ᴄ',D:'ᴅ',E:'ᴇ',F:'ғ',G:'ɢ',H:'ʜ',I:'ɪ',J:'ᴊ',
            K:'ᴋ',L:'ʟ',M:'ᴍ',N:'ɴ',O:'ᴏ',P:'ᴘ',Q:'ǫ',R:'ʀ',S:'s',T:'ᴛ',
            U:'ᴜ',V:'ᴠ',W:'ᴡ',X:'x',Y:'ʏ',Z:'ᴢ',
            '0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵',
        };
        const S = c => [...(c||'')].map(x=>SC_MAP[x]||x).join('');

        // Category label map (small-caps)
        const LBLS = {
            ai:'ᴀɪ', audio:'ᴀᴜᴅɪᴏ', download:'ᴅᴏᴡɴʟᴏᴀᴅ', fun:'ғᴜɴ & ɢᴀᴍᴇs',
            group:'ɢʀᴏᴜᴘ', image:'ɪᴍᴀɢᴇ', other:'ᴏᴛʜᴇʀ', owner:'ᴏᴡɴᴇʀ',
            reaction:'ʀᴇᴀᴄᴛɪᴏɴ', search:'sᴇᴀʀᴄʜ', settings:'sᴇᴛᴛɪɴɢs',
            tools:'ᴛᴏᴏʟs', video:'ᴠɪᴅᴇᴏ', general:'ɢᴇɴᴇʀᴀʟ',
            media:'ᴍᴇᴅɪᴀ', translate:'ᴛʀᴀɴsʟᴀᴛᴇ', sports:'sᴘᴏʀᴛs',
            religion:'ʀᴇʟɪɢɪᴏɴ', tostatus:'ᴛᴏsᴛᴀᴛᴜs', utility:'ᴜᴛɪʟɪᴛʏ',
            multisession:'ᴍᴜʟᴛɪ-sᴇssɪᴏɴ', ephoto:'ᴇᴘʜᴏᴛᴏ', support:'sᴜᴘᴘᴏʀᴛ',
        };
        // Category icon map
        const ICONS = {
            ai:'◈', audio:'🎵', download:'✦', fun:'✪', group:'✧', image:'●',
            media:'❃', other:'✬', owner:'□', reaction:'❤️', religion:'✬',
            search:'▣', settings:'✥', sports:'⚽', tostatus:'📤', tools:'▣',
            translate:'🌍', video:'🎬', utility:'🔧', general:'✠',
            multisession:'🔗', ephoto:'🖼️', support:'🆘',
        };

        const BRD = '╭⚊⚊⚊⚊⚊⚊⚊⚊⚊⚊⚊⚊╮';
        const END = '╰⚊⚊⚊⚊⚊⚊⚊⚊⚊⚊⚊⚊╯';
        const lines = [];

        for (const c of this.catDef) {
            const cmds = this.getCmds(c.key);
            if (!cmds.length) continue;
            const icon = ICONS[c.key] || '✦';
            const lbl  = LBLS[c.key] || S(c.label);
            const cnt  = cmds.length;
            lines.push(`\n> *${lbl}* (${cnt})`);
            lines.push(BRD);
            cmds.forEach(cmd => lines.push(`┃${icon} *.${S(cmd)}*`));
            lines.push(END);
        }
        return lines.join('\n');
    }
}

const PL = new PluginLoader();

// CHATBOT (Pollinations)
const chatHistory = new Map();
const chatbotReply = async (jid, userText) => {
    if (!chatHistory.has(jid)) chatHistory.set(jid, []);
    const hist = chatHistory.get(jid);
    hist.push({ role: 'user', content: userText });
    if (hist.length > 16) chatHistory.set(jid, hist.slice(-16));
    const ctx = hist.slice(-6).map(h => (h.role === 'user' ? 'User: ' : 'Liam: ') + h.content).join('\n');
    try {
        const LIAM_PROMPT = `You are Liam — a smart, witty WhatsApp AI assistant.
RULES:
- Your name is Liam. NEVER say you are Claude, ChatGPT, Gemini, or any AI company.
- Reply in the SAME LANGUAGE as the user (Swahili → Swahili, English → English).
- Keep replies SHORT and natural for WhatsApp (1-3 sentences for casual).
- Match the user's energy: chill→relaxed, excited→hype, sad→warm and supportive.
- Be helpful, funny when appropriate, and always friendly.`;
        const prompt = `${LIAM_PROMPT}\n\n${ctx}\nLiam:`;
        const { data } = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, { timeout: 10000 });
        const reply = (data?.toString() || '').trim();
        if (reply?.length > 2) { hist.push({ role: 'assistant', content: reply }); return reply; }
    } catch(_) {}
    return '😅 Brain glitch! Try again.';
};

// CONSOLE LOG
const logMsg = (pushname, senderNum, isGroup, chatId, body) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(chalk.hex('#00d4ff')(`  ⚡ [${time}] `) + chalk.hex('#fdcb6e')(pushname) + chalk.hex('#888')(` (+${senderNum}) `) + (isGroup ? chalk.hex('#a29bfe')('[GROUP] ') : chalk.hex('#fd79a8')('[DM] ')) + chalk.white((body||'').slice(0,60)));
};

// MAIN HANDLER
let _gmCache = null; // group metadata cache (shared across handler calls)
module.exports = async (sock, m, chatUpdate) => {
    try {
        await loadUtils();
        const body = (
            m.body || m.message?.conversation || m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || ''
        ).toString().trim();

        const botId     = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';
        const sender    = m.key.fromMe ? botId : (m.key.participant || m.key.remoteJid);
        const senderNum = sender.split('@')[0];
        const pushname  = m.pushName || 'User';

        const prefixMatch = body.match(/^[.!#$]/);
        const prefix  = prefixMatch ? prefixMatch[0] : (config.settings?.prefix || '.');
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
            // Cached group metadata — refresh only every 3 minutes per group
            const _now = Date.now();
            if (!_gmCache) module.exports._gmCache = _gmCache = new Map();
            const _cached = _gmCache.get(m.chat);
            if (!_cached || (_now - _cached._ts) > 5 * 60 * 1000) {
                groupMetadata = await sock.groupMetadata(m.chat).catch(() => ({}));
                groupMetadata._ts = _now;
                _gmCache.set(m.chat, groupMetadata);
            } else {
                groupMetadata = _cached;
            }
            groupName   = groupMetadata.subject || '';
            participants = (groupMetadata.participants || []).map(p => ({ id: p.id, admin: p.admin || null }));
            groupAdmins  = participants.filter(p => p.admin).map(p => p.id);
            isBotAdmins  = groupAdmins.includes(botId);
            isAdmins     = groupAdmins.includes(sender);
        }

        logMsg(pushname, senderNum, m.isGroup, m.chat, body);

        if (BOT_PAUSED && !isCreator) return;

        // reply — PLAIN TEXT, NO image anywhere
        const reply = txt => sock.sendMessage(m.chat, { text: txt }, { quoted: m }).catch(() => {});

        const ctx = {
            args, text, q: text, quoted, mime, isMedia,
            groupMetadata, groupName, participants,
            groupAdmins, isBotAdmins, isAdmins,
            isCreator, isSudo, prefix, reply, config, sender, pushname, senderNum, m,
        };

        // Auto-features
        const feat = config.features || {};
        if (feat.autoread && !m.key.fromMe) sock.readMessages([m.key]).catch(() => {});
        if (feat.autotyping && !m.key.fromMe) {
            sock.sendPresenceUpdate('composing', m.chat).catch(() => {});
            setTimeout(() => sock.sendPresenceUpdate('paused', m.chat).catch(() => {}), 3000);
        }
        if (feat.autorecording && !m.key.fromMe) {
            sock.sendPresenceUpdate('recording', m.chat).catch(() => {});
            setTimeout(() => sock.sendPresenceUpdate('paused', m.chat).catch(() => {}), 3000);
        }
        if (feat.alwaysonline) sock.sendPresenceUpdate('available').catch(() => {});
        if (feat.autoreact && !m.key.fromMe) {
            const pool = config.statusReactEmojis || ['❤️','😂','🔥','👍','😍'];
            sock.sendMessage(m.chat, { react: { text: pool[~~(Math.random()*pool.length)], key: m.key } }).catch(() => {});
        }
        // Sticker collection
        if (feat.stickerCollect && !m.key.fromMe) {
            const msgType = Object.keys(m.message || {})[0];
            if (msgType === 'stickerMessage') {
                const _fs = require('fs'), _path = require('path');
                const dir = _path.join(__dirname, 'settings', 'stickerpark');
                if (!_fs.existsSync(dir)) _fs.mkdirSync(dir, { recursive: true });
                const outFile = _path.join(dir, `${Date.now()}_${m.key.id?.slice(-6)||'stk'}.webp`);
                sock.downloadMediaMessage(m).then(buf => { if (buf) _fs.writeFileSync(outFile, buf); }).catch(() => {});
            }
        }
        if (feat.antilink && m.isGroup && !isAdmins && !isCreator) {
            if (/(https?:\/\/|wa\.me\/)/i.test(body)) {
                sock.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                return reply(`⚠️ @${senderNum} Links not allowed here!`);
            }
        }

        // "bot" keyword — groups only
        if (!m.key.fromMe && !isCmd && m.isGroup && /\bbot\b/i.test(body)) {
            await reply(
                `⚡ *LIAM LITE*\n\nHey ${pushname}! 👋\n\n` +
                `🔗 *Get Session:* ${config.pairingSite}\n` +
                `📦 *Source:* ${config.github}\n\n` +
                `_Type *${prefix}menu* to see commands_\n\n${sig()}`
            );
        }

        // Chatbot
        if (feat.chatbot && !m.key.fromMe && !isCmd && body.trim().length > 0) {
            try {
                sock.sendPresenceUpdate('composing', m.chat).catch(() => {});
                const botReply = await chatbotReply(m.chat, body.trim());
                sock.sendPresenceUpdate('paused', m.chat).catch(() => {});
                return await reply(botReply);
            } catch(_) { return await reply('😅 Hiccup!'); }
        }
        if (!isCmd) return;

        // ── Dominate — LIAM is sole bot in this group ─────────────────────────
        if (m.isGroup) {
            const dom = domStore.get(m.chat);
            if (dom?.on) {
                const anyPfx   = /^[.!#$\/+~\->@%^&*?]/.test(body);
                if (anyPfx) {
                    const domCmd    = body.slice(1).split(/\s+/)[0].toLowerCase().trim();
                    const watched   = !dom.pfx?.length || dom.pfx.includes(body[0]);
                    const isLiamCmd = PL.plugins.has(domCmd) || ['menu','help','dominate'].includes(domCmd);
                    if (watched && !isLiamCmd) {
                        dom.blocked = (dom.blocked || 0) + 1;
                        domStore.set(m.chat, dom);
                        sock.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                        sock.sendMessage(m.chat, { react: { text: '👁️', key: m.key } }).catch(() => {});
                        return;
                    }
                }
            }
        }

        // ── AFK auto-reply ────────────────────────────────────────────────────────
        if (!m.key.fromMe) {
            const _afk = global._afkUsers;
            if (_afk?.size) {
                const mentioned = (m.mentionedJid||[]).concat(m.quoted?.sender ? [m.quoted.sender] : []);
                for (const [afkJid, afkData] of _afk.entries()) {
                    if (mentioned.includes(afkJid) || (m.chat === afkJid && !m.isGroup)) {
                        const since = Math.round((Date.now()-afkData.since)/1000);
                        const ago   = since<60?`${since}s`:since<3600?`${~~(since/60)}m`:`${~~(since/3600)}h`;
                        await reply(`💤 *AFK Notice*\n\n_${afkData.reason||'Away'} · ${ago} ago_\n\n> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄`).catch(()=>{});
                        break;
                    }
                }
            }
            if (!isCmd && _afk?.has(sender)) {
                _afk.delete(sender);
                await reply(`🌟 *Welcome back ${pushname}!* AFK cleared.\n\n> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄`).catch(()=>{});
            }
        }

        // Plugin dispatch
        if (await PL.run(command, sock, m, ctx)) return;

        // .menu / .help — NO image anywhere
        if (command === 'menu' || command === 'help') {
            const style  = config.menuStyle || 'fancy';
            const up     = process.uptime();
            const upStr  = `${~~(up/3600)}h ${~~(up%3600/60)}m`;
            const ping   = Math.max(0, Date.now() - (m.messageTimestamp || 0) * 1000);
            const total  = PL.count();
            const mem    = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0) + 'MB';
            const host   = global._hostName || 'pannel';
            const botName = config.settings?.title || '𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';
            const utype  = isCreator ? 'Owner' : isAdmins ? 'Admin' : 'User';
            const modeStr = sock.public ? 'ᴘᴜʙʟɪᴄ' : 'ᴘʀɪᴠᴀᴛᴇ';
            const styleHint = `\n\n_Change style: *.classic* | *.fancy*_`;

            const boxHeader = [
                `╔═══════════╗`,
                `╔〚 *${botName}* 〛╗`,
                `║✫ *ᴜsᴇʀ:* ${pushname || utype}`,
                `║✫ *ᴘʀᴇғɪx:* ${prefix}`,
                `║✫ *ᴍᴏᴅᴇ:* ${modeStr}`,
                `║✫ *ᴄᴍᴅs:* ${total}`,
                `║✫ *ᴘɪɴɢ:* ${ping}ᴍs`,
                `║✫ *ʀᴀᴍ:* ${mem}`,
                `║✫ *ᴜᴘ:* ${upStr}`,
                `║✫ *ʜᴏsᴛ:* ${host}`,
                `╚═══════════╝`,
            ].join('\n');

            if (style === 'classic') {
                await reply(boxHeader + '\n\n' + PL.menuClassic(prefix) + styleHint);
                return;
            }

            // Fancy (default)
            await reply(boxHeader + '\n\n' + PL.menuFancy(prefix) + styleHint);
            return;
        }

        // Built-ins
        if (command === 'kill') {
            if (!isCreator) return reply(config.message.owner);
            BOT_PAUSED = true;
            return reply(`🔴 *Bot Paused*\n\nUse *${prefix}wake* to resume.\n\n${sig()}`);
        }
        if (command === 'wake') {
            if (!isCreator) return reply(config.message.owner);
            BOT_PAUSED = false;
            return reply(`🟢 *Bot Active*\n\n${sig()}`);
        }
        if (command === 'classic') { config.menuStyle = 'classic'; return reply(`✅ *Menu style → Classic*\n\n${sig()}`); }
        if (command === 'fancy')   { config.menuStyle = 'fancy';   return reply(`✅ *Menu style → Fancy*\n\n${sig()}`); }
        if (command === 'reload') {
            if (!isCreator) return reply(config.message.owner);
            PL.reload();
            return reply(`✅ *Reloaded* — ${PL.count()} commands\n\n${sig()}`);
        }

    } catch (e) { console.log(chalk.red('[MSG ERR] ' + (e.message || e))); }
};
