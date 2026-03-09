'use strict';
const config  = require('./settings/config');
const fs      = require('fs');
const path    = require('path');
const chalk   = require('chalk');
const axios   = require('axios');
const os      = require('os');

let _jidNorm;
const loadUtils = async () => {
    if (_jidNorm) return;
    const b = await import('@whiskeysockets/baileys');
    _jidNorm = b.jidNormalizedUser;
};

// ─── Font maps ────────────────────────────────────────────────────
const T  = s => s.split('').map(c=>({'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ','k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','q':'ᵠ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','A':'ᴬ','B':'ᴮ','C':'ᶜ','D':'ᴰ','E':'ᴱ','F':'ᶠ','G':'ᴳ','H':'ᴴ','I':'ᴵ','J':'ᴶ','K':'ᴷ','L':'ᴸ','M':'ᴹ','N':'ᴺ','O':'ᴼ','P':'ᴾ','Q':'ᵠ','R':'ᴿ','S':'ˢ','T':'ᵀ','U':'ᵁ','V':'ᵛ','W':'ᵂ','X':'ˣ','Y':'ʸ','Z':'ᶻ','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',' ':' ','.':'.'}[c]||c)).join('');
const B  = s => s.split('').map(c=>({'A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭','a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶','j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇','0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵',' ':' '}[c]||c)).join('');
const I  = s => `_${s}_`;
const BI = s => `*_${s}_*`;

const SIG  = () => `> 👁️ ${T('LIAM LITE')}`;
const DENY = () => `𝙈𝙢𝙢 𝙣𝙤𝙩 𝙖𝙡𝙡𝙤𝙬𝙚𝙙 🫵, 𝙖𝙨𝙠 𝙢𝙮 𝙢𝙖𝙨𝙩𝙚𝙧 👁️`;

const greet = () => {
    const h = new Date().getHours();
    if (h<5)  return `${B('Good Night')} 🌙`;
    if (h<12) return `${B('Good Morning')} 🌅`;
    if (h<17) return `${B('Good Afternoon')} ☀️`;
    if (h<21) return `${B('Good Evening')} 🌇`;
    return `${B('Good Night')} 🌙`;
};

const ramBar = () => {
    const pct = Math.min(100,Math.round(process.memoryUsage().heapUsed/os.totalmem()*100));
    return '■'.repeat(Math.round(pct/25))+'□'.repeat(4-Math.round(pct/25))+' '+pct+'%';
};

const uptime = () => {
    const s=Math.floor(process.uptime()),h=~~(s/3600),m=~~((s%3600)/60),sc=s%60;
    return h?`${h}h ${m}m`:m?`${m}m ${sc}s`:`${sc}s`;
};

// ─── Plugin Loader ────────────────────────────────────────────────
class PL {
    constructor() {
        this.p   = new Map();
        this.cat = new Map();
        this.dir = path.join(__dirname,'plugins');
        this.def = [
            { k:'ai',        e:'🤖', l:'AI'          },
            { k:'download',  e:'⬇️', l:'Download'   },
            { k:'fun',       e:'😂', l:'Fun'         },
            { k:'session',   e:'🔗', l:'MultiSession' },
            { k:'group',     e:'👥', l:'Group'        },
            { k:'image',     e:'🌄', l:'Image'        },
            { k:'reaction',  e:'😍', l:'Reaction'     },
            { k:'search',    e:'🔍', l:'Search'       },
            { k:'settings',  e:'⚙️', l:'Settings'    },
            { k:'tools',     e:'🛠️', l:'Tools'       },
            { k:'video',     e:'🎬', l:'Video'        },
            { k:'other',     e:'📦', l:'Other'        },
        ];
        this.def.forEach(c=>this.cat.set(c.k,[]));
        this.load();
    }

    load() {
        this.p.clear(); this.def.forEach(c=>this.cat.set(c.k,[]));
        if (!fs.existsSync(this.dir)) return;
        for (const f of fs.readdirSync(this.dir).filter(f=>f.endsWith('.js')&&!f.startsWith('_'))) {
            try {
                const fp=path.join(this.dir,f); delete require.cache[require.resolve(fp)];
                for (const pl of [].concat(require(fp))) {
                    if (!pl?.command||typeof pl.execute!=='function') continue;
                    const k=pl.category||'other';
                    if (!this.cat.has(k)) this.cat.set(k,[]);
                    if (!this.p.has(pl.command)) this.p.set(pl.command,pl);
                    this.cat.get(k).push(pl.command);
                }
            } catch(e) { console.log(chalk.red(`[P] ${f}: ${e.message}`)); }
        }
        let t=0; for(const c of this.def){t+=(this.cat.get(c.k)||[]).length;}
        console.log(chalk.hex('#00b894').bold(`  ✔ ${t} cmds\n`));
    }

    async run(cmd, sock, m, ctx) {
        const pl=this.p.get(cmd); if (!pl) return false;
        try {
            if (pl.owner&&!ctx.isCreator) { await ctx.reply(DENY()); return true; }
            if (pl.group&&!m.isGroup)     { await ctx.reply(`${T('groups only')} 👥`); return true; }
            if (pl.admin&&m.isGroup&&!ctx.isAdmins&&!ctx.isCreator) { await ctx.reply(`${T('admins only')} ⚙️`); return true; }
            await pl.execute(sock,m,ctx);
        } catch(e) { console.log(chalk.red(`[${cmd}] ${e.message}`)); }
        return true;
    }

    count()  { return this.p.size; }
    reload() { this.load(); }
    cmds(k)  { return (this.cat.get(k)||[]).sort(); }
    meta(k)  { return this.def.find(d=>d.k===k)||{e:'📦',l:k.toUpperCase()}; }

    // ─── FANCY text menu — tiny font, > fading headers, 2 per row ──
    menuFancy(prefix, name, sock, ping) {
        const L = [];
        L.push(`${B('Hey there')} 😁, ${greet()}`);
        L.push('');
        L.push(`╔═══〚 ⚡ ${B('LIAM  LITE')} ⚡〚════╗`);
        L.push(`║✫╭─╍╍╍╍╍╍╍╍╍╍╍`);
        L.push(`║✫┃ ${B('User')}   : ${B((name||'User').slice(0,16))}`);
        L.push(`║✫┃ ${B('Prefix')} : ${B(prefix)}`);
        L.push(`║✫┃ ${B('Mode')}   : ${B(sock.public?'Public':'Private')}`);
        L.push(`║✫┃ ${B('Cmds')}  : ${B(String(this.count())+'⁺')}`);
        L.push(`║✫┃ ${B('Speed')} : ${B(ping+'ms')}`);
        L.push(`║✫┃ ${B('RAM')}   : ${ramBar()}`);
        L.push(`║✫┃═════════════`);
        L.push(`║✫┃ █■█■█■█■█■█■█`);
        L.push(`║✫┃══════════════`);
        L.push(`╚════════════════╝`);
        L.push('');
        for (const c of this.def) {
            const cmds = this.cmds(c.k);
            if (!cmds.length) continue;
            // > creates fading italic block quote in WhatsApp
            L.push(`> ${c.e} *${T(c.l.toUpperCase())}*`);
            L.push(`╭══⚊⚊⚊⚊⚊⚊══╮`);
            for (let i=0;i<cmds.length;i+=2) {
                const a=T(prefix+cmds[i]);
                const b2=cmds[i+1]?'  '+T(prefix+cmds[i+1]):'';
                L.push(`┃⁺│ ${a}${b2}`);
            }
            L.push(`╰══⚊⚊⚊⚊⚊⚊══╯`);
            L.push('');
        }
        L.push(SIG());
        return L.join('\n');
    }

    // ─── CLASSIC text menu ───────────────────────────────────────
    menuClassic(prefix) {
        const L = ['╔════════════╗','║ ⚡ *LIAM LITE* ║','╚════════════╝',''];
        for (const c of this.def) {
            const cmds = this.cmds(c.k);
            if (!cmds.length) continue;
            const lbl = `${c.e} ${T(c.l)}`;
            const dL  = Math.max(1,~~((18-lbl.length)/2));
            L.push(`╭${'─'.repeat(dL)}${lbl}${'─'.repeat(dL)}╮`);
            for (let i=0;i<cmds.length;i+=2) {
                const a=T(prefix+cmds[i]),b2=cmds[i+1]?'  '+T(prefix+cmds[i+1]):'';
                L.push(`│ ${a}${b2}`);
            }
            L.push(`╰${'─'.repeat(dL*2+lbl.length)}╯`);
            L.push('');
        }
        return L.join('\n');
    }

    // ─── BUTTON menu — list msg with categories + dropdown on select ─
    async menuButtons(sock, m, prefix) {
        // First message: list of categories
        const rows = [];
        for (const c of this.def) {
            const cmds = this.cmds(c.k);
            if (!cmds.length) continue;
            rows.push({
                title:       `${c.e} ${c.l}  (${cmds.length})`,
                rowId:       `cat::${c.k}`,
                description: cmds.slice(0,5).map(x=>T(prefix+x)).join('  ')
            });
        }
        await sock.sendMessage(m.chat, {
            text:       `⚡ *${B('LIAM LITE')}* ${I('button menu')}\n\n${T('Mode')}: *${sock.public?'Public':'Private'}*  ${T('Cmds')}: *${this.count()}*`,
            footer:     `👁️ ${T('liam lite')}`,
            buttonText: `${T('Browse Categories')} ▾`,
            sections:   [{ title: T('Tap a category to see commands'), rows }],
            listType:   1,
        }, { quoted: m });
    }

    // Called when user selects a category from the button menu
    async showCatCommands(sock, m, catKey, prefix) {
        const cmds = this.cmds(catKey);
        const meta = this.meta(catKey);
        if (!cmds.length) return;

        // Send a second list message with the actual commands as rows
        const rows = cmds.map(cmd => ({
            title:       `${T(prefix+cmd)}`,
            rowId:       `runcmd::${cmd}`,
            description: ''
        }));

        try {
            await sock.sendMessage(m.chat, {
                text:       `${meta.e} *${B(meta.l.toUpperCase())} ${T('COMMANDS')}*\n\n_${T('Tap a command to use it')}_`,
                footer:     `👁️ ${T('liam lite')} · ${cmds.length} ${T('cmds')}`,
                buttonText: `${T('Commands')} ▾`,
                sections:   [{ title: `${meta.e} ${meta.l}`, rows }],
                listType:   1,
            }, { quoted: m });
        } catch {
            // Fallback: plain text
            const txt = `${meta.e} *${B(meta.l.toUpperCase())}*\n╭──────────╮\n${cmds.map(c=>`│ ${T(prefix+c)}`).join('\n')}\n╰──────────╯\n\n${SIG()}`;
            await sock.sendMessage(m.chat, { text: txt }, { quoted: m });
        }
    }
}

const loader = new PL();

// ─── Chatbot ──────────────────────────────────────────────────────
const hist = new Map();
const chatbot = async (jid, txt) => {
    if (!hist.has(jid)) hist.set(jid,[]);
    const h=hist.get(jid);
    h.push({role:'user',content:txt});
    if (h.length>10) hist.set(jid,h.slice(-10));
    try {
        const prompt=`You are LIAM LITE👁️ by Liam. Reply short, fun, match vibe. NEVER say you are Claude/ChatGPT.\n\n${h.slice(-4).map(x=>(x.role==='user'?'User: ':'Bot: ')+x.content).join('\n')}\nBot:`;
        const {data}=await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`,{timeout:10000});
        const r=(data?.toString()||'').trim();
        if(r.length>2){h.push({role:'assistant',content:r});return r;}
    }catch{}
    return `${I('glitch!')} 😅`;
};

// ─── Main Handler ─────────────────────────────────────────────────
module.exports = async (sock, m) => {
    try {
        await loadUtils();

        const body = (
            m.body||m.message?.conversation||m.message?.extendedTextMessage?.text||
            m.message?.imageMessage?.caption||m.message?.videoMessage?.caption||
            m.message?.buttonsResponseMessage?.selectedButtonId||
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId||
            m.message?.templateButtonReplyMessage?.selectedId||''
        ).toString().trim();

        const botId     = (sock.user?.id||'').split(':')[0]+'@s.whatsapp.net';
        const sender    = m.key.fromMe ? botId : (m.key.participant||m.key.remoteJid);
        const senderNum = sender.split('@')[0];
        const name      = m.pushName||'User';

        const pm    = body.match(/^[.!#$]/);
        const pfx   = pm ? pm[0] : (config.settings?.prefix||'.');
        const isCmd = !!pm;
        const cmd   = isCmd ? body.slice(1).trim().split(/\s+/)[0].toLowerCase() : '';
        const args  = isCmd ? body.trim().split(/\s+/).slice(1) : [];
        const text  = args.join(' ');
        const q     = m.quoted||m;
        const mime  = (q.msg||q).mimetype||'';

        const isOwner = (() => {
            try {
                const n1=(sender||'').split('@')[0].replace(/:\d+/,'');
                const n2=(config.owner||'').replace(/[^0-9]/g,'');
                return n1===n2||(_jidNorm?.(sender)===_jidNorm?.(botId));
            } catch{return false;}
        })();

        let gMeta={},gName='',parts=[],gAdmins=[],botAdmin=false,isAdmin=false;
        if (m.isGroup) {
            try {
                gMeta   = await sock.groupMetadata(m.chat);
                gName   = gMeta.subject||'';
                parts   = (gMeta.participants||[]).map(p=>({id:p.id,admin:p.admin||null}));
                gAdmins = parts.filter(p=>p.admin).map(p=>p.id);
                botAdmin= gAdmins.includes(botId);
                isAdmin = gAdmins.includes(sender);
            } catch{}
        }

        if (global._LIAM_PAUSED?.[process.env.LIAM_INSTANCE_ID||'main'] && !isOwner) return;

        const reply = t => sock.sendMessage(m.chat,{text:t},{quoted:m}).catch(()=>{});
        const react = e => sock.sendMessage(m.chat,{react:{text:e,key:m.key}}).catch(()=>{});

        const ctx = {
            args, text, q, mime,
            isMedia:/image|video|sticker|audio/.test(mime),
            gMeta, gName, parts, gAdmins, botAdmin,
            isAdmin, isAdmins:isAdmin,
            isCreator:isOwner, prefix:pfx,
            reply, react, config, sender, pushname:name, senderNum, m,
        };

        // Auto-features
        const feat=config.features||{};
        if (feat.autoread  &&!m.key.fromMe) sock.readMessages([m.key]).catch(()=>{});
        if (feat.autotyping&&!m.key.fromMe) sock.sendPresenceUpdate('composing',m.chat).catch(()=>{});
        if (feat.autorecord&&!m.key.fromMe) sock.sendPresenceUpdate('recording',m.chat).catch(()=>{});

        // Anti-link
        if (feat.antilink&&m.isGroup&&!isAdmin&&!isOwner&&/(https?:\/\/|wa\.me\/)/i.test(body)) {
            sock.sendMessage(m.chat,{delete:m.key}).catch(()=>{});
            return reply(`⚠️ ${T('no links!')} @${senderNum}`);
        }

        // "bot" keyword
        if (!m.key.fromMe&&!isCmd&&m.isGroup&&/\bbot\b/i.test(body)) {
            return reply(`⚡ *${B('LIAM LITE')}* 👁️\n${I('Hey ')}*${name}*${I('! Use ')}*${pfx}menu*${I(' for commands.')}\n\n${SIG()}`);
        }

        // ── BUTTON RESPONSE HANDLERS ─────────────────────────────────

        // Category dropdown — user tapped a category in button menu
        if (body.startsWith('cat::')) {
            const catKey = body.replace('cat::','');
            await loader.showCatCommands(sock, m, catKey, pfx);
            return;
        }

        // Command from category list — user tapped a specific command
        if (body.startsWith('runcmd::')) {
            const runcmd = body.replace('runcmd::','').toLowerCase().trim();
            // Dispatch it as if they typed the command
            if (await loader.run(runcmd, sock, m, ctx)) return;
            return reply(`${T('Use:')} *${pfx}${runcmd}*\n\n${SIG()}`);
        }

        // Mode switches from button menu
        const modeMap = {
            'mode_public':  () => { sock.public=true;  config.mode='public';  return reply(`🌍 ${BI('Mode → Public')}\n${SIG()}`); },
            'mode_dms':     () => { sock.public=false; config.mode='dms';     return reply(`💬 ${BI('Mode → DMs')}\n${SIG()}`); },
            'mode_groups':  () => { sock.public=false; config.mode='groups';  return reply(`👥 ${BI('Mode → Groups')}\n${SIG()}`); },
            'mode_silent':  () => { sock.public=false; config.mode='silent';  return reply(`🔇 ${BI('Mode → Silent')}\n${SIG()}`); },
            'menu_buttons': () => { config.menuStyle='buttons'; return reply(`📋 ${BI('Menu → Buttons')}\n${SIG()}`); },
            'menu_default': () => { config.menuStyle='fancy';   return reply(`📝 ${BI('Menu → Fancy')}\n${SIG()}`); },
        };
        if (modeMap[body]) { if (!isOwner) return reply(DENY()); return modeMap[body](); }

        // Chatbot
        if (feat.chatbot&&!m.key.fromMe&&!isCmd&&body.trim().length>1) {
            sock.sendPresenceUpdate('composing',m.chat).catch(()=>{});
            const r=await chatbot(m.chat,body.trim());
            sock.sendPresenceUpdate('paused',m.chat).catch(()=>{});
            return reply(r);
        }

        if (!isCmd) return;

        // Plugin dispatch
        if (await loader.run(cmd, sock, m, ctx)) return;

        // ── BUILT-IN COMMANDS ─────────────────────────────────────────

        // .menu / .help
        if (cmd==='menu'||cmd==='help') {
            const st=config.menuStyle||'fancy';
            const pg=Math.max(0,Date.now()-(m.messageTimestamp||0)*1000);
            if (st==='buttons') { await loader.menuButtons(sock,m,pfx); return; }
            if (st==='classic') { await reply(loader.menuClassic(pfx)); return; }
            await reply(loader.menuFancy(pfx,name,sock,pg));
            return;
        }

        // Style switches
        if (cmd==='fancy')  { config.menuStyle='fancy';   return reply(`✅ ${BI('Fancy mode')} ✨\n${SIG()}`); }
        if (cmd==='classic'){ config.menuStyle='classic'; return reply(`✅ ${BI('Classic mode')} 📋\n${SIG()}`); }

        // .button — sends live category list with mode switcher
        if (cmd==='button'||cmd==='buttons') {
            config.menuStyle='buttons';
            try {
                await sock.sendMessage(m.chat, {
                    text:       `*${B('Buttons Mode Activated')}*\n\n${I('Tap any button to switch mode')}`,
                    footer:     `👁️ ${T('LIAM LITE')}`,
                    buttonText: T('Tap to switch ▾'),
                    sections: [{
                        title: T('Mode & Menu'),
                        rows: [
                            { rowId:'mode_public',  title:'🌍 Public',  description:T('respond to everyone') },
                            { rowId:'mode_dms',     title:'💬 DMs',     description:T('DMs only') },
                            { rowId:'mode_groups',  title:'👥 Groups',  description:T('groups only') },
                            { rowId:'mode_silent',  title:'🔇 Silent',  description:T('owner only') },
                            { rowId:'menu_buttons', title:'📋 Buttons', description:T('button menu style') },
                            { rowId:'menu_default', title:'📝 Default', description:T('fancy menu style') },
                        ]
                    }],
                    listType: 1,
                }, { quoted: m });
            } catch { await reply(`✅ ${BI('Buttons mode set')}\n${SIG()}`); }
            return;
        }

        // .alive
        if (cmd==='alive') {
            if (global._LIAM_PAUSED) global._LIAM_PAUSED[process.env.LIAM_INSTANCE_ID||'main'] = false;
            return reply(`⚡ *${B('LIAM LITE')}* ${I('is alive!')} 😎\n${T('been up for')} *${uptime()}*, ${T('cool huh')} 🔥\n\n${SIG()}`);
        }

        // .ping
        if (cmd==='ping') {
            const ms=Math.max(0,Date.now()-(m.messageTimestamp||0)*1000);
            return reply(`⚡ ${BI('Pong:')} *${ms}ms*\n${T('up')} *${uptime()}* 😎\n${SIG()}`);
        }

        // .uptime
        if (cmd==='uptime') {
            return reply(`🕐 ${T('been up for')} *${uptime()}*, ${T('cool huh')} 😎\n${SIG()}`);
        }

        // .kill / .pause
        if (cmd==='kill') {
            if (!isOwner) return reply(DENY());
            if (!global._LIAM_PAUSED) global._LIAM_PAUSED = {};
            global._LIAM_PAUSED[process.env.LIAM_INSTANCE_ID||'main'] = true;
            return reply(`🔴 ${BI('Paused')} — ${I('use')} *${pfx}alive* ${I('to resume')}\n${SIG()}`);
        }

        // .wake
        if (cmd==='wake') {
            if (!isOwner) return reply(DENY());
            if (!global._LIAM_PAUSED) global._LIAM_PAUSED = {};
            global._LIAM_PAUSED[process.env.LIAM_INSTANCE_ID||'main'] = false;
            return reply(`🟢 ${BI('Active')} 💪\n${SIG()}`);
        }

        // .reload
        if (cmd==='reload') {
            if (!isOwner) return reply(DENY());
            loader.reload();
            return reply(`✅ ${BI('Reloaded')} — *${loader.count()}* ${T('cmds')}\n${SIG()}`);
        }

        // .update
        if (cmd==='update') {
            if (!isOwner) return reply(DENY());
            await require('./library/updater').doUpdate(sock,m,reply);
            return;
        }

        // .channel
        if (cmd==='channel') {
            try {
                await sock.sendMessage(m.chat, {
                    text:       `👁️ *${B('LIAM LITE')}* ${T('Official Channel')}`,
                    footer:     T('Tap to join'),
                    buttonText: T('Open ▾'),
                    sections:   [{ title: T('LIAM LITE'), rows: [{ rowId:'ch_join', title:'📢 Join Channel', description: config.channel }] }],
                    listType:   1,
                }, { quoted: m });
            } catch {
                reply(`📢 *${B('LIAM LITE Channel')}*\n${config.channel}\n\n${SIG()}`);
            }
            return;
        }

        // .tostatus (also in plugins, but kept here as backup)
        if (cmd==='tostatus') {
            if (!isOwner) return reply(DENY());
            const qm = m.quoted;
            if (!qm&&!text) return reply(`${T('Reply to media or add caption')}\n${SIG()}`);
            await react('📤');
            try {
                const ownerJid = (sock.user?.id||'').split(':')[0]+'@s.whatsapp.net';
                const opts = { statusJidList:[ownerJid] };
                const mime2=(qm?.msg||qm)?.mimetype||'';
                if (qm&&mime2.includes('image'))      { const b=await sock.downloadMediaMessage(qm); await sock.sendMessage('status@broadcast',{image:b,caption:text||'👁️ LIAM LITE',...opts}); }
                else if (qm&&mime2.includes('video')) { const b=await sock.downloadMediaMessage(qm); await sock.sendMessage('status@broadcast',{video:b,caption:text||'👁️ LIAM LITE',...opts}); }
                else                                   { await sock.sendMessage('status@broadcast',{text:`${text||'👁️ LIAM LITE'}\n\n${SIG()}`,...opts}); }
                await react('✅');
                return reply(`✅ ${BI('Posted to status!')} 🔥\n${SIG()}`);
            } catch(e){await react('❌');return reply(`❌ ${e.message}\n${SIG()}`);}
        }

        // .toarchives
        if (cmd==='toarchives') {
            if (!isOwner) return reply(DENY());
            const tok=config.telegramBotToken,cid=config.telegramChannelId;
            if (!tok||!cid) return reply(`❌ ${T('Set TG_BOT_TOKEN + TG_CHANNEL_ID env vars')}\n${SIG()}`);
            await react('📤');
            try {
                const base=`https://api.telegram.org/bot${tok}`;
                const cap=(text||'')+'\n\n👁️ LIAM LITE';
                if (q&&(q.msg||q).mimetype) {
                    const buf=await sock.downloadMediaMessage(q);
                    const m3=(q.msg||q).mimetype||'';
                    const FormData=require('form-data');
                    const fd=new FormData(); fd.append('chat_id',cid); fd.append('caption',cap);
                    if (m3.includes('image'))      { fd.append('photo',buf,'m.jpg');   await axios.post(`${base}/sendPhoto`,fd,{headers:fd.getHeaders(),timeout:30000}); }
                    else if (m3.includes('video')) { fd.append('video',buf,'m.mp4');   await axios.post(`${base}/sendVideo`,fd,{headers:fd.getHeaders(),timeout:30000}); }
                    else if (m3.includes('audio')) { fd.append('audio',buf,'m.mp3');   await axios.post(`${base}/sendAudio`,fd,{headers:fd.getHeaders(),timeout:30000}); }
                    else                            { fd.append('document',buf,'m.bin');await axios.post(`${base}/sendDocument`,fd,{headers:fd.getHeaders(),timeout:30000}); }
                } else if (text) {
                    await axios.post(`${base}/sendMessage`,{chat_id:cid,text:cap},{timeout:10000});
                } else { return reply(`${T('Reply to media or add text after')} *${pfx}toarchives*\n${SIG()}`); }
                await react('✅');
                return reply(`✅ ${BI('Archived to Telegram!')} 📨\n${SIG()}`);
            } catch(e){await react('❌');return reply(`❌ ${e.message}\n${SIG()}`);}
        }

    } catch(e) { console.log(chalk.red('[ERR] '+(e.message||e))); }
};
