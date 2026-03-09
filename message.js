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

// ── Tiny unicode font maps ─────────────────────────────────────────────────
const TINY = s => s.split('').map(c=>({'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ','k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','q':'ᵠ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','A':'ᴬ','B':'ᴮ','C':'ᶜ','D':'ᴰ','E':'ᴱ','F':'ᶠ','G':'ᴳ','H':'ᴴ','I':'ᴵ','J':'ᴶ','K':'ᴷ','L':'ᴸ','M':'ᴹ','N':'ᴺ','O':'ᴼ','P':'ᴾ','Q':'ᵠ','R':'ᴿ','S':'ˢ','T':'ᵀ','U':'ᵁ','V':'ᵛ','W':'ᵂ','X':'ˣ','Y':'ʸ','Z':'ᶻ','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',' ':' '}[c]||c)).join('');

const BOLD = s => s.split('').map(c=>({'A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭','a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶','j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇','0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵',' ':' '}[c]||c)).join('');

const SIG    = () => `> 👁️ ${TINY('LIAM LITE')}`;
const NOT_ALLOWED = () => `𝙈𝙢𝙢 𝙣𝙤𝙩 𝙖𝙡𝙡𝙤𝙬𝙚𝙙, 𝙖𝙨𝙠 𝙢𝙮 𝙢𝙖𝙨𝙩𝙚𝙧 👁️`;
let BOT_PAUSED = false;

const greeting = () => {
    const h = new Date().getHours();
    if (h<5)  return BOLD('Good Night')+' 🌙';
    if (h<12) return BOLD('Good Morning')+' 🌅';
    if (h<17) return BOLD('Good Afternoon')+' ☀️';
    if (h<21) return BOLD('Good Evening')+' 🌇';
    return BOLD('Good Night')+' 🌙';
};

const ramBar = () => {
    const pct = Math.min(100,Math.round(process.memoryUsage().heapUsed/os.totalmem()*100));
    const f = Math.round(pct/25);
    return '■'.repeat(f)+'□'.repeat(4-f)+' '+pct+'%';
};

const uptime = () => {
    const s = Math.floor(process.uptime());
    const h = ~~(s/3600), m = ~~((s%3600)/60), sc = s%60;
    return h ? `${h}h ${m}m` : m ? `${m}m ${sc}s` : `${sc}s`;
};

// ── Plugin Loader ──────────────────────────────────────────────────────────
class PluginLoader {
    constructor() {
        this.plugins    = new Map();
        this.categories = new Map();
        this.dir        = path.join(__dirname,'plugins');
        this.catDef = [
            { key:'ai',       bold:BOLD('AI CMDS'),       tb:TINY('AI'),       emoji:'🤖', icon:'✦' },
            { key:'download', bold:BOLD('DOWNLOAD CMDS'), tb:TINY('Download'), emoji:'⬇️', icon:'✦' },
            { key:'fun',      bold:BOLD('FUN CMDS'),      tb:TINY('Fun'),      emoji:'😂', icon:'❃' },
            { key:'group',    bold:BOLD('GROUP CMDS'),    tb:TINY('Group'),    emoji:'👥', icon:'✦' },
            { key:'image',    bold:BOLD('IMAGE CMDS'),    tb:TINY('Image'),    emoji:'🌄', icon:'❃' },
            { key:'reaction', bold:BOLD('REACTION CMDS'), tb:TINY('Reaction'), emoji:'😍', icon:'✦' },
            { key:'search',   bold:BOLD('SEARCH CMDS'),   tb:TINY('Search'),   emoji:'🔍', icon:'❃' },
            { key:'settings', bold:BOLD('SETTINGS CMDS'), tb:TINY('Settings'), emoji:'⚙️', icon:'✦' },
            { key:'tools',    bold:BOLD('TOOLS CMDS'),    tb:TINY('Tools'),    emoji:'🛠️', icon:'❃' },
            { key:'video',    bold:BOLD('VIDEO CMDS'),    tb:TINY('Video'),    emoji:'🎬', icon:'✦' },
            { key:'other',    bold:BOLD('OTHER CMDS'),    tb:TINY('Other'),    emoji:'📦', icon:'❃' },
            { key:'general',  bold:BOLD('GENERAL'),       tb:TINY('General'),  emoji:'✨', icon:'✦' },
        ];
        this.catDef.forEach(c=>this.categories.set(c.key,[]));
        this.load();
    }

    load() {
        this.plugins.clear();
        this.catDef.forEach(c=>this.categories.set(c.key,[]));
        if (!fs.existsSync(this.dir)) return;
        for (const file of fs.readdirSync(this.dir).filter(f=>f.endsWith('.js')&&!f.startsWith('_'))) {
            try {
                const fp = path.join(this.dir,file);
                delete require.cache[require.resolve(fp)];
                for (const p of [].concat(require(fp))) {
                    if (!p?.command || typeof p.execute !== 'function') continue;
                    const cat = p.category||'general';
                    if (!this.categories.has(cat)) this.categories.set(cat,[]);
                    if (!this.plugins.has(p.command)) this.plugins.set(p.command,p);
                    this.categories.get(cat).push(p.command);
                }
            } catch(e) { console.log(chalk.red(`[PLUG] ${file}: ${e.message}`)); }
        }
        let t=0;
        for (const c of this.catDef) { const n=(this.categories.get(c.key)||[]).length; if(n) t+=n; }
        console.log(chalk.hex('#00b894').bold(`  ✔ ${t} commands loaded\n`));
    }

    async run(cmd, sock, m, ctx) {
        const p = this.plugins.get(cmd);
        if (!p) return false;
        try {
            if (p.owner && !ctx.isCreator) { await ctx.reply(NOT_ALLOWED()); return true; }
            if (p.group && !m.isGroup)     { await ctx.reply(`${TINY('Groups only')} 👥`); return true; }
            if (p.admin && m.isGroup && !ctx.isAdmins && !ctx.isCreator) { await ctx.reply(`${TINY('Admins only')} ⚙️`); return true; }
            await p.execute(sock,m,ctx);
        } catch(e) { console.log(chalk.red(`[CMD:${cmd}] ${e.message}`)); }
        return true;
    }

    count() { return this.plugins.size; }
    reload() { this.load(); }
    getCmds(key) { return (this.categories.get(key)||[]).sort(); }

    // ══ FANCY — exact compact format with tiny cmd font ══════════════════════
    menuFancy(prefix, pushname, sock, ping) {
        const name = (pushname||'User').slice(0,18);
        const L = [];
        L.push(`${BOLD('Hey there')} 😁, ${greeting()}`);
        L.push('');
        L.push(`╔═══〚 ⚡ ${BOLD('LIAM  LITE')} ⚡〚════╗`);
        L.push(`║✫╭─╍╍╍╍╍╍╍╍╍╍╍`);
        L.push(`║✫┃ ${BOLD('User')} : ${BOLD(name)}`);
        L.push(`║✫┃ ${BOLD('Prefix')} : ${BOLD(prefix)}`);
        L.push(`║✫┃ ${BOLD('Mode')} : ${BOLD(sock.public?'Public':'Private')}`);
        L.push(`║✫┃ ${BOLD('Tcmds')} : ${BOLD(String(this.count())+'⁺')}`);
        L.push(`║✫┃ ${BOLD('Speed')} : ${BOLD(ping+'ms')}`);
        L.push(`║✫┃ ${BOLD('RAM')} : ${ramBar()}`);
        L.push(`║✫┃═════════════`);
        L.push(`║✫┃ █■█■█■█■█■█■█`);
        L.push(`║✫┃══════════════`);
        L.push(`╚════════════════╝`);
        L.push('');
        for (const c of this.catDef) {
            const cmds = this.getCmds(c.key);
            if (!cmds.length) continue;
            L.push(`> ${c.bold}`);
            L.push(`╭══⚊⚊⚊⚊⚊⚊══╮`);
            cmds.forEach(cmd=>L.push(`┃${c.icon}│ ${TINY(prefix+cmd)}`));
            L.push(`╰══⚊⚊⚊⚊⚊⚊══╯`);
            L.push('');
        }
        return L.join('\n');
    }

    // ══ CLASSIC — compact labeled boxes with tiny cmd font ═══════════════════
    menuClassic(prefix) {
        const L = [];
        L.push(`╔════════════╗`);
        L.push(`║ ⚡ *LIAM LITE* ║`);
        L.push(`╚════════════╝`);
        L.push('');
        for (const c of this.catDef) {
            const cmds = this.getCmds(c.key);
            if (!cmds.length) continue;
            const lbl  = `${c.emoji} ${c.tb}`;
            const dLen = Math.max(2, Math.floor((lbl.length+4)/2));
            const d    = '─'.repeat(dLen);
            L.push(`╭${d}${lbl}${d}╮`);
            cmds.forEach(cmd=>L.push(`│ ${TINY(prefix+cmd)}`));
            L.push(`╰${'─'.repeat(dLen*2+lbl.length)}╯`);
            L.push('');
        }
        return L.join('\n');
    }

    // ══ BUTTONS — sends interactive button list ════════════════════════════
    async menuButtons(sock, m, prefix) {
        // Build category button list message
        const rows = [];
        for (const c of this.catDef) {
            const cmds = this.getCmds(c.key);
            if (!cmds.length) continue;
            rows.push({
                title:       `${c.emoji} ${c.key.toUpperCase()} (${cmds.length})`,
                rowId:       `menu_cat_${c.key}`,
                description: cmds.slice(0,6).map(x=>prefix+x).join('  ')
            });
        }

        const sections = [{ title: `⚡ ${TINY('LIAM LITE')} — ${TINY('Choose Category')}`, rows }];

        try {
            await sock.sendMessage(m.chat, {
                text:     `${BOLD('LIAM LITE')} — ${TINY('Tap a category')}\n${TINY('Mode')}: ${TINY(sock.public?'Public':'Private')}  ${TINY('Cmds')}: ${this.count()}`,
                footer:   `👁️ ${TINY('LIAM LITE')}`,
                buttonText: TINY('See Commands'),
                sections,
                listType: 1,
            }, { quoted: m });
        } catch(e) {
            // Fallback if buttons not supported (old WA)
            await sock.sendMessage(m.chat, {
                text: this.menuClassic(prefix)
            }, { quoted: m });
        }
    }
}

const PL = new PluginLoader();

// ── Chatbot ────────────────────────────────────────────────────────────────
const chatHistory = new Map();
const chatbotReply = async (jid, userText) => {
    if (!chatHistory.has(jid)) chatHistory.set(jid,[]);
    const hist = chatHistory.get(jid);
    hist.push({ role:'user', content:userText });
    if (hist.length > 10) chatHistory.set(jid, hist.slice(-10));
    const ctx = hist.slice(-6).map(h=>(h.role==='user'?'User: ':'Bot: ')+h.content).join('\n');
    try {
        const prompt = `You are LIAM LITE👁️ by Liam. Reply short. NEVER say you are Claude/ChatGPT.\n\n${ctx}\nBot:`;
        const { data } = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`,{ timeout:10000 });
        const r = (data?.toString()||'').trim();
        if (r?.length>2) { hist.push({ role:'assistant', content:r }); return r; }
    } catch(_) {}
    return '😅 Glitch!';
};

// ── Log ────────────────────────────────────────────────────────────────────
const logMsg = (name, num, grp, body) => {
    const t = new Date().toLocaleTimeString('en-US',{hour12:false});
    const loc = grp ? chalk.hex('#a29bfe')('[G]') : chalk.hex('#fd79a8')('[D]');
    console.log(chalk.hex('#636e72')(`[${t}]`)+chalk.hex('#fdcb6e')(name.slice(0,10))+chalk.hex('#888')(` +${num} `)+loc+' '+chalk.white((body||'').slice(0,50)));
};

// ── Main Handler ───────────────────────────────────────────────────────────
module.exports = async (sock, m) => {
    try {
        await loadUtils();

        const body = (
            m.body || m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            m.message?.documentMessage?.caption ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            m.message?.templateButtonReplyMessage?.selectedId || ''
        ).toString().trim();

        const botId     = (sock.user?.id||'').split(':')[0]+'@s.whatsapp.net';
        const sender    = m.key.fromMe ? botId : (m.key.participant||m.key.remoteJid);
        const senderNum = sender.split('@')[0];
        const pushname  = m.pushName||'User';

        const prefixMatch = body.match(/^[.!#$]/);
        const prefix  = prefixMatch ? prefixMatch[0] : (config.settings?.prefix||'.');
        const isCmd   = !!prefixMatch;
        const command = isCmd ? body.slice(1).trim().split(/\s+/)[0].toLowerCase() : '';
        const args    = isCmd ? body.trim().split(/\s+/).slice(1) : [];
        const text    = args.join(' ');
        const quoted  = m.quoted||m;
        const mime    = (quoted.msg||quoted).mimetype||'';
        const isMedia = /image|video|sticker|audio/.test(mime);

        const isCreator = (() => {
            try {
                const n1 = (sender||'').split('@')[0].replace(/:\d+/,'');
                const n2 = (config.owner||'').replace(/[^0-9]/g,'');
                return n1===n2||(_jidNorm?.(sender)===_jidNorm?.(botId));
            } catch { return false; }
        })();

        let groupMeta={}, groupName='', participants=[], groupAdmins=[], isBotAdmins=false, isAdmins=false;
        if (m.isGroup) {
            try {
                groupMeta    = await sock.groupMetadata(m.chat);
                groupName    = groupMeta.subject||'';
                participants = (groupMeta.participants||[]).map(p=>({id:p.id,admin:p.admin||null}));
                groupAdmins  = participants.filter(p=>p.admin).map(p=>p.id);
                isBotAdmins  = groupAdmins.includes(botId);
                isAdmins     = groupAdmins.includes(sender);
            } catch(_) {}
        }

        logMsg(pushname, senderNum, m.isGroup, body);

        if (BOT_PAUSED && !isCreator) return;

        const reply = txt => sock.sendMessage(m.chat,{text:txt},{quoted:m}).catch(()=>{});
        const react = emoji => sock.sendMessage(m.chat,{react:{text:emoji,key:m.key}}).catch(()=>{});

        const ctx = {
            args, text, q:text, quoted, mime, isMedia,
            groupMeta, groupName, participants, groupAdmins, isBotAdmins, isAdmins,
            isCreator, prefix, reply, react, config, sender, pushname, senderNum, m,
        };

        // Auto-features
        const feat = config.features||{};
        if (feat.autoread   && !m.key.fromMe) sock.readMessages([m.key]).catch(()=>{});
        if (feat.autotyping && !m.key.fromMe) sock.sendPresenceUpdate('composing',m.chat).catch(()=>{});
        if (feat.autorecord && !m.key.fromMe) sock.sendPresenceUpdate('recording',m.chat).catch(()=>{});

        if (feat.antilink && m.isGroup && !isAdmins && !isCreator) {
            if (/(https?:\/\/|wa\.me\/)/i.test(body)) {
                sock.sendMessage(m.chat,{delete:m.key}).catch(()=>{});
                return reply(`⚠️ ${TINY('no links')} @${senderNum}`);
            }
        }

        // "bot" keyword groups
        if (!m.key.fromMe && !isCmd && m.isGroup && /\bbot\b/i.test(body)) {
            await reply(`⚡ ${TINY('LIAM LITE')} 👁️\n${TINY('Hey')} ${pushname}! ${TINY(prefix+'menu for cmds')}\n\n${SIG()}`);
            return;
        }

        // Chatbot
        if (feat.chatbot && !m.key.fromMe && !isCmd && body.trim().length > 1) {
            try {
                sock.sendPresenceUpdate('composing',m.chat).catch(()=>{});
                const r = await chatbotReply(m.chat, body.trim());
                sock.sendPresenceUpdate('paused',m.chat).catch(()=>{});
                return await reply(r);
            } catch(_) {}
        }

        if (!isCmd) return;

        // ── Plugin dispatch ──────────────────────────────────────────
        if (await PL.run(command, sock, m, ctx)) return;

        // ── Core commands ────────────────────────────────────────────

        // .menu / .help
        if (command==='menu'||command==='help') {
            const style = config.menuStyle||'fancy';
            const ping  = Math.max(0, Date.now()-(m.messageTimestamp||0)*1000);
            if (style==='buttons') { await PL.menuButtons(sock,m,prefix); return; }
            if (style==='classic') { await reply(PL.menuClassic(prefix)); return; }
            await reply(PL.menuFancy(prefix,pushname,sock,ping));
            return;
        }

        // .fancy / .classic / .button (style switch + channel button)
        if (command==='fancy') {
            config.menuStyle='fancy';
            return reply(`✅ ${TINY('Menu style → Fancy')}\n${SIG()}`);
        }
        if (command==='classic') {
            config.menuStyle='classic';
            return reply(`✅ ${TINY('Menu style → Classic')}\n${SIG()}`);
        }
        if (command==='button'||command==='buttons') {
            config.menuStyle='buttons';
            // Also send the channel as a button
            try {
                await sock.sendMessage(m.chat, {
                    text:    `${BOLD('Buttons Mode Activated')}\n\n${TINY('Tap any button to switch mode')}`,
                    footer:  `👁️ ${TINY('LIAM LITE')}`,
                    buttons: [
                        { buttonId:'mode_public',  buttonText:{displayText:'🌍 Public'},  type:1 },
                        { buttonId:'mode_dms',     buttonText:{displayText:'💬 DMs'},     type:1 },
                        { buttonId:'mode_groups',  buttonText:{displayText:'👥 Groups'},  type:1 },
                        { buttonId:'mode_silent',  buttonText:{displayText:'🔇 Silent'},  type:1 },
                        { buttonId:'menu_buttons', buttonText:{displayText:'📋 Buttons'}, type:1 },
                        { buttonId:'menu_default', buttonText:{displayText:'📝 Default'}, type:1 },
                    ],
                    headerType: 1,
                }, { quoted: m });
            } catch(e) {
                await reply(`✅ ${TINY('Buttons mode set')}\n${SIG()}`);
            }
            return;
        }

        // Handle button responses for mode switching
        if (['mode_public','mode_dms','mode_groups','mode_silent','menu_buttons','menu_default'].includes(body)) {
            if (!isCreator) return reply(NOT_ALLOWED());
            if (body==='mode_public')  { sock.public=true;  config.mode='public';  return reply(`✅ ${TINY('Mode → Public')}\n${SIG()}`); }
            if (body==='mode_dms')     { sock.public=false; config.mode='dms';     return reply(`✅ ${TINY('Mode → DMs only')}\n${SIG()}`); }
            if (body==='mode_groups')  { sock.public=false; config.mode='groups';  return reply(`✅ ${TINY('Mode → Groups only')}\n${SIG()}`); }
            if (body==='mode_silent')  { sock.public=false; config.mode='silent';  return reply(`✅ ${TINY('Mode → Silent')}\n${SIG()}`); }
            if (body==='menu_buttons') { config.menuStyle='buttons'; return reply(`✅ ${TINY('Menu → Buttons')}\n${SIG()}`); }
            if (body==='menu_default') { config.menuStyle='fancy';   return reply(`✅ ${TINY('Menu → Fancy')}\n${SIG()}`); }
        }

        // .alive
        if (command==='alive') {
            BOT_PAUSED = false;
            const up = uptime();
            return reply(`⚡ *LIAM LITE* ${TINY('is alive!')}\n${TINY('been up for')} *${up}*, ${TINY('cool huh')} 😎\n\n${SIG()}`);
        }

        // .ping
        if (command==='ping') {
            const ms = Date.now()-(m.messageTimestamp||0)*1000;
            return reply(`⚡ ${TINY('Pong:')} *${ms}ms*\n${TINY('been up for')} *${uptime()}*, ${TINY('cool huh')} 😎\n${SIG()}`);
        }

        // .uptime
        if (command==='uptime') {
            return reply(`🕐 ${TINY('been up for')} *${uptime()}*, ${TINY('cool huh')} 😎\n${SIG()}`);
        }

        // .kill / .pause
        if (command==='kill'||command==='pause') {
            if (!isCreator) return reply(NOT_ALLOWED());
            BOT_PAUSED = true;
            return reply(`🔴 ${TINY('Paused — use')} *${prefix}alive* ${TINY('to resume')}\n${SIG()}`);
        }
        if (command==='wake') {
            if (!isCreator) return reply(NOT_ALLOWED());
            BOT_PAUSED = false;
            return reply(`🟢 ${TINY('Active')}\n${SIG()}`);
        }

        // .reload
        if (command==='reload') {
            if (!isCreator) return reply(NOT_ALLOWED());
            PL.reload();
            return reply(`✅ ${TINY('Reloaded')} — ${PL.count()} ${TINY('cmds')}\n${SIG()}`);
        }

        // .update
        if (command==='update') {
            if (!isCreator) return reply(NOT_ALLOWED());
            const updater = require('./library/updater');
            await updater.doUpdate(sock, m, reply);
            return;
        }

        // ── Multi-session commands ────────────────────────────────────
        const bridge = require('./library/bridge_lite');

        // .run <session_id>
        if (command==='run') {
            if (!isCreator) return reply(NOT_ALLOWED());
            if (!text) return reply(`${TINY('Usage:')} ${prefix}run <LIAM:~ session id>\n${SIG()}`);
            const slot = bridge.getSlot();
            if (!slot) return reply(`❌ ${TINY('Max')} ${bridge.MAX_INST} ${TINY('sessions reached')}\n${SIG()}`);
            const sid = text.trim();
            bridge.launchInstance(sid, slot);
            return reply(`✅ ${TINY('Instance')} #${slot} ${TINY('starting...')}\n${TINY('Use')} ${prefix}runlist ${TINY('to see all')}\n${SIG()}`);
        }

        // .runlist
        if (command==='runlist') {
            if (!isCreator) return reply(NOT_ALLOWED());
            const rows = bridge.listInstances();
            if (!rows.length) return reply(`${TINY('No extra sessions running')}\n${TINY('Use')} ${prefix}run <id> ${TINY('to start one')}\n${SIG()}`);
            return reply(`⚡ ${TINY('Running Sessions:')}\n${rows.join('\n')}\n${SIG()}`);
        }

        // .terminate1 / .terminate 1,2,3
        if (command.startsWith('terminate')) {
            if (!isCreator) return reply(NOT_ALLOWED());
            const slotStr = command.replace('terminate','') || text;
            if (!slotStr) return reply(`${TINY('Usage:')} ${prefix}terminate1 ${TINY('or')} ${prefix}terminate 1,2\n${SIG()}`);
            const slots = slotStr.split(/[,\s]+/).filter(Boolean);
            const done=[], failed=[];
            for (const s of slots) {
                bridge.terminateInstance(s.trim()) ? done.push(s) : failed.push(s);
            }
            return reply(`🗑️ ${done.length ? TINY('Terminated: ')+done.join(', ') : ''}\n${failed.length ? TINY('Not found: ')+failed.join(', ') : ''}\n${SIG()}`);
        }

        // .toarchives — send to telegram
        if (command==='toarchives') {
            if (!isCreator) return reply(NOT_ALLOWED());
            const token = config.telegramBotToken;
            const chatId = config.telegramChannelId;
            if (!token||!chatId) return reply(`❌ ${TINY('Set TG_BOT_TOKEN + TG_CHANNEL_ID in settings')}\n${SIG()}`);
            const q = m.quoted;
            await react('📤');
            try {
                const base = `https://api.telegram.org/bot${token}`;
                const caption = (text||'') + `\n\n👁️ LIAM LITE`;
                if (q) {
                    const mime2 = (q.msg||q).mimetype||'';
                    const buf   = await sock.downloadMediaMessage(q);
                    const { default: FormData } = await import('form-data');
                    const fd = new FormData();
                    fd.append('chat_id', chatId);
                    fd.append('caption', caption);
                    let endpoint = `${base}/sendDocument`;
                    if (mime2.includes('image'))      { fd.append('photo',    buf, 'media.jpg'); endpoint=`${base}/sendPhoto`; }
                    else if (mime2.includes('video')) { fd.append('video',    buf, 'media.mp4'); endpoint=`${base}/sendVideo`; }
                    else if (mime2.includes('audio')) { fd.append('audio',    buf, 'media.mp3'); endpoint=`${base}/sendAudio`; }
                    else                               { fd.append('document', buf, 'media.bin'); }
                    await axios.post(endpoint, fd, { headers: fd.getHeaders(), timeout:30000 });
                } else if (text) {
                    await axios.post(`${base}/sendMessage`,{ chat_id:chatId, text:caption, parse_mode:'Markdown' },{ timeout:10000 });
                } else {
                    return reply(`${TINY('Reply to media or add text after')} ${prefix}toarchives\n${SIG()}`);
                }
                await react('✅');
                return reply(`✅ ${TINY('Archived to Telegram!')}\n${SIG()}`);
            } catch(e) { await react('❌'); return reply(`❌ ${TINY('Telegram error:')} ${e.message}\n${SIG()}`); }
        }

        // .tostatus fix
        if (command==='tostatus') {
            if (!isCreator) return reply(NOT_ALLOWED());
            const q = m.quoted;
            if (!q && !text) return reply(`${TINY('Reply to media or add caption')}\n${SIG()}`);
            await react('📤');
            try {
                const mime2 = (q?.msg||q)?.mimetype||'';
                if (q && mime2.includes('image')) {
                    const buf = await sock.downloadMediaMessage(q);
                    await sock.sendMessage('status@broadcast',{ image:buf, caption:text||'👁️ LIAM LITE' });
                } else if (q && mime2.includes('video')) {
                    const buf = await sock.downloadMediaMessage(q);
                    await sock.sendMessage('status@broadcast',{ video:buf, caption:text||'👁️ LIAM LITE' });
                } else {
                    await sock.sendMessage('status@broadcast',{ text:`${text||'👁️ LIAM LITE'}\n\n${SIG()}` });
                }
                await react('✅');
                return reply(`✅ ${TINY('Posted to status!')}\n${SIG()}`);
            } catch(e) { await react('❌'); return reply(`❌ ${e.message}\n${SIG()}`); }
        }

        // .channel — sends channel as button (not link)
        if (command==='channel') {
            try {
                await sock.sendMessage(m.chat, {
                    text:    `👁️ *LIAM LITE* ${TINY('Official Channel')}`,
                    footer:  TINY('Tap to view'),
                    buttons: [{
                        buttonId:   'channel_visit',
                        buttonText: { displayText: '📢 Join Channel' },
                        type: 1,
                        nativeFlowInfo: { name:'cta_url', paramsJson: JSON.stringify({ display_text:'📢 Join Channel', url: config.channel }) }
                    }],
                    headerType: 1,
                }, { quoted: m });
            } catch(e) {
                return reply(`📢 *LIAM LITE Channel*\n${config.channel}\n\n${SIG()}`);
            }
        }

    } catch(e) { console.log(chalk.red('[MSG ERR] '+(e.message||e))); }
};
