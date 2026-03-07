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

// PLUGIN LOADER
class PluginLoader {
    constructor() {
        this.plugins    = new Map();
        this.categories = new Map();
        this.dir        = path.join(__dirname, 'plugins');
        this.catDef = [
            { key: 'ai',       label: 'AI',         emoji: '🤖' },
            { key: 'audio',    label: 'AUDIO',       emoji: '🎵' },
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

    // ── FANCY MENU STYLE ──────────────────────────────────────────────────────
    // Modern aesthetic with category emojis and decorative borders
    menuFancy(prefix) {
        const lines = [];
        for (const c of this.catDef) {
            const cmds = this.getCmds(c.key);
            if (!cmds.length) continue;
            lines.push(`\n┌━━━━━━━━━━━━━━━━━━━━━━━┐`);
            lines.push(`  ${c.emoji}  *${c.label}*`);
            lines.push(`└━━━━━━━━━━━━━━━━━━━━━━━┘`);
            const mid = Math.ceil(cmds.length / 2);
            const rows = [];
            for (let i = 0; i < mid; i++) {
                const left  = `${prefix}${cmds[i]}`.padEnd(18);
                const right = cmds[i+mid] ? `${prefix}${cmds[i+mid]}` : '';
                rows.push(`  ⚡ ${left}${right ? '⚡ ' + right : ''}`);
            }
            rows.forEach(r => lines.push(r));
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
    const ctx = hist.slice(-6).map(h => (h.role === 'user' ? 'User: ' : 'Bot: ') + h.content).join('\n');
    try {
        const prompt = `You are LIAM LITE👁️ — a witty WhatsApp bot. Reply short, natural, match user vibe. NEVER say you are Claude/ChatGPT/Anthropic.\n\n${ctx}\nBot:`;
        const { data } = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, { timeout: 10000 });
        const reply = (data?.toString() || '').trim();
        if (reply?.length > 2) { hist.push({ role: 'assistant', content: reply }); return reply; }
    } catch(_) {}
    return '😅 Glitch! Try again.';
};

// CONSOLE LOG
const logMsg = (pushname, senderNum, isGroup, chatId, body) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(chalk.hex('#00d4ff')(`  ⚡ [${time}] `) + chalk.hex('#fdcb6e')(pushname) + chalk.hex('#888')(` (+${senderNum}) `) + (isGroup ? chalk.hex('#a29bfe')('[GROUP] ') : chalk.hex('#fd79a8')('[DM] ')) + chalk.white((body||'').slice(0,60)));
};

// MAIN HANDLER
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
            groupMetadata = await sock.groupMetadata(m.chat).catch(() => ({}));
            groupName     = groupMetadata.subject || '';
            participants  = (groupMetadata.participants || []).map(p => ({ id: p.id, admin: p.admin || null }));
            groupAdmins   = participants.filter(p => p.admin).map(p => p.id);
            isBotAdmins   = groupAdmins.includes(botId);
            isAdmins      = groupAdmins.includes(sender);
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
            const host   = global._hostName || '🖥️ VPS';
            const botName = config.settings?.title || '𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';
            const utype  = isCreator ? 'Owner' : isAdmins ? 'Admin' : 'User';
            const styleHint = `\n\n_Change style: *.classic* | *.fancy*_`;

            if (style === 'classic') {
                const hdr =
                    `╔${'═'.repeat(34)}╗\n` +
                    `║  ⚡ *${botName}* — Mini Bot  ║\n` +
                    `╚${'═'.repeat(34)}╝\n` +
                    `_👁️ Fast & Light WhatsApp Bot_\n\n` +
                    `  ⚡ *Ping*   › ${ping}ms\n` +
                    `  ⏱️ *Uptime* › ${upStr}\n` +
                    `  💾 *RAM*    › ${mem}\n` +
                    `  📦 *Cmds*   › ${total}\n` +
                    `  🌍 *Mode*   › ${sock.public ? 'Public' : 'Private'}\n` +
                    `  🖥️ *Host*   › ${host}\n` +
                    `  🔰 *Prefix* › ${prefix}\n`;
                await reply(hdr + PL.menuClassic(prefix) + styleHint);
                return;
            }

            // Fancy (default)
            const hdr =
                `┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                `  ⚡ *${botName}*\n` +
                `  👁️ Fast & Light Bot\n` +
                `┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                `  ⚡ ${ping}ms  |  ⏱️ ${upStr}  |  💾 ${mem}\n` +
                `  📦 ${total} cmds  |  🔰 ${prefix}  |  🌍 ${sock.public?'Public':'Private'}\n` +
                `  🖥️ ${host}  |  👤 ${utype}\n`;
            await reply(hdr + PL.menuFancy(prefix) + styleHint);
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
