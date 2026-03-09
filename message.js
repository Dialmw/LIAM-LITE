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

// ─────────────────────────────────────────────────────────────────────────────
//  FONT MAPS
// ─────────────────────────────────────────────────────────────────────────────
const T = s => s.split('').map(c=>({'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ','k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','q':'ᵠ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','A':'ᴬ','B':'ᴮ','C':'ᶜ','D':'ᴰ','E':'ᴱ','F':'ᶠ','G':'ᴳ','H':'ᴴ','I':'ᴵ','J':'ᴶ','K':'ᴷ','L':'ᴸ','M':'ᴹ','N':'ᴺ','O':'ᴼ','P':'ᴾ','Q':'ᵠ','R':'ᴿ','S':'ˢ','T':'ᵀ','U':'ᵁ','V':'ᵛ','W':'ᵂ','X':'ˣ','Y':'ʸ','Z':'ᶻ','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',' ':' ','.':'.'}[c]||c)).join('');
const B = s => s.split('').map(c=>({'A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭','a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶','j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇','0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵',' ':' '}[c]||c)).join('');
const I = s => `_${s}_`;      // WhatsApp italic
const BI= s => `*_${s}_*`;    // bold italic
const SC= s => s.split('').map(c=>({'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ꜰ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ꞯ','r':'ʀ','s':'ꜱ','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ'}[c.toLowerCase()]||c)).join(''); // small caps

const SIG = () => `> 👁️ ${T('LIAM LITE')}`;
const DENY= () => `𝙈𝙢𝙢 𝙣𝙤𝙩 𝙖𝙡𝙡𝙤𝙬𝙚𝙙 🫵, 𝙖𝙨𝙠 𝙢𝙮 𝙢𝙖𝙨𝙩𝙚𝙧 👁️`;

let BOT_PAUSED = false;

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

// ─────────────────────────────────────────────────────────────────────────────
//  PLUGIN LOADER
// ─────────────────────────────────────────────────────────────────────────────
class PL {
    constructor() {
        this.p   = new Map();   // command → plugin
        this.cat = new Map();   // category → [cmds]
        this.dir = path.join(__dirname,'plugins');
        this.def = [
            { k:'ai',       e:'🤖', l:'AI'        },
            { k:'download', e:'⬇️', l:'Download'  },
            { k:'fun',      e:'😂', l:'Fun'       },
            { k:'group',    e:'👥', l:'Group'     },
            { k:'image',    e:'🌄', l:'Image'     },
            { k:'reaction', e:'😍', l:'Reaction'  },
            { k:'search',   e:'🔍', l:'Search'    },
            { k:'settings', e:'⚙️', l:'Settings'  },
            { k:'tools',    e:'🛠️', l:'Tools'    },
            { k:'session',  e:'🔗', l:'Sessions'  },
            { k:'general',  e:'✨', l:'General'  },
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
                    const k=pl.category||'general';
                    if (!this.cat.has(k)) this.cat.set(k,[]);
                    if (!this.p.has(pl.command)) this.p.set(pl.command,pl);
                    this.cat.get(k).push(pl.command);
                }
            } catch(e) { console.log(chalk.red(`[P] ${f}: ${e.message}`)); }
        }
        let t=0; for(const c of this.def){const n=(this.cat.get(c.k)||[]).length;if(n)t+=n;}
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

    count()    { return this.p.size; }
    reload()   { this.load(); }
    cmds(k)    { return (this.cat.get(k)||[]).sort(); }

    // ── FANCY — tiny font, > fading quote headers, absolute minimum size ──
    menuFancy(prefix, name, sock, ping) {
        const bridge = require('./library/bridge_lite');
        const sessions = bridge.listInstances();
        const L = [];

        // Greeting
        L.push(`${B('Hey there')} 😁, ${greet()}`);
        L.push('');

        // Header — exact LITE style, compact
        L.push(`╔═══〚 ⚡ ${B('LIAM  LITE')} ⚡〚════╗`);
        L.push(`║✫╭─╍╍╍╍╍╍╍╍╍╍╍`);
        L.push(`║✫┃ ${B('User')} : ${B((name||'User').slice(0,16))}`);
        L.push(`║✫┃ ${B('Prefix')} : ${B(prefix)}`);
        L.push(`║✫┃ ${B('Mode')} : ${B(sock.public?'Public':'Private')}`);
        L.push(`║✫┃ ${B('Cmds')} : ${B(String(this.count())+'⁺')}`);
        L.push(`║✫┃ ${B('Speed')} : ${B(ping+'ms')}`);
        L.push(`║✫┃ ${B('RAM')} : ${ramBar()}`);
        L.push(`║✫┃═════════════`);
        L.push(`║✫┃ █■█■█■█■█■█■█`);
        L.push(`║✫┃══════════════`);
        L.push(`╚════════════════╝`);
        L.push('');

        // Sessions inline if any running
        if (sessions.length) {
            L.push(`> ${T('Sessions: ')}${sessions.map(r=>r.trim()).join(' · ')}`);
            L.push('');
        }

        // Categories — > for fading WhatsApp quote effect on headers
        // Each cmd in absolute tiny superscript
        for (const c of this.def) {
            const cmds = this.cmds(c.k);
            if (!cmds.length) continue;
            // Use > for fading italic effect + tiny bold label
            L.push(`> ${c.e} *${T(c.l.toUpperCase())}*`);
            L.push(`╭══⚊⚊⚊⚊⚊⚊══╮`);
            // Two cmds per row to save space
            for (let i=0;i<cmds.length;i+=2) {
                const a = T(prefix+cmds[i]);
                const b2 = cmds[i+1] ? '  '+T(prefix+cmds[i+1]) : '';
                L.push(`┃⁺│ ${a}${b2}`);
            }
            L.push(`╰══⚊⚊⚊⚊⚊⚊══╯`);
            L.push('');
        }

        L.push(SIG());
        return L.join('\n');
    }

    // ── CLASSIC — compact labeled boxes, tiny font ────────────────────────
    menuClassic(prefix) {
        const L = [];
        L.push(`╔════════════╗`);
        L.push(`║ ⚡ *LIAM LITE* ║`);
        L.push(`╚════════════╝`);
        L.push('');
        for (const c of this.def) {
            const cmds = this.cmds(c.k);
            if (!cmds.length) continue;
            const lbl = `${c.e} ${T(c.l)}`;
            const dL  = Math.max(1,Math.floor((16-lbl.length)/2));
            L.push(`╭${'─'.repeat(dL)}${lbl}${'─'.repeat(dL)}╮`);
            for (let i=0;i<cmds.length;i+=2) {
                const a=T(prefix+cmds[i]), b2=cmds[i+1]?'  '+T(prefix+cmds[i+1]):'';
                L.push(`│ ${a}${b2}`);
            }
            L.push(`╰${'─'.repeat(dL*2+lbl.length)}╯`);
            L.push('');
        }
        return L.join('\n');
    }

    // ── BUTTON MENU — working list message ───────────────────────────────
    async menuButtons(sock, m, prefix) {
        const rows = [];
        for (const c of this.def) {
            const cmds = this.cmds(c.k);
            if (!cmds.length) continue;
            rows.push({
                title:       `${c.e} ${c.l} (${cmds.length})`,
                rowId:       `cat_${c.k}`,
                description: cmds.slice(0,5).map(x=>prefix+x).join('  ')
            });
        }
        try {
            await sock.sendMessage(m.chat, {
                text:       `⚡ *${B('LIAM LITE')}*\n${T('Tap a category')}\n${T('Mode')}: ${T(sock.public?'Public':'Private')}  ${T('Cmds')}: ${this.count()}`,
                footer:     `👁️ ${T('LIAM LITE')}`,
                buttonText: T('See Commands ▾'),
                sections:   [{ title:`${T('Choose Category')}`, rows }],
                listType:   1,
            }, { quoted: m });
        } catch {
            await sock.sendMessage(m.chat, { text: this.menuClassic(prefix) }, { quoted: m });
        }
    }
}

const loader = new PL();

// ─────────────────────────────────────────────────────────────────────────────
//  CHATBOT
// ─────────────────────────────────────────────────────────────────────────────
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
    return `_${T('Glitch!')}_ 😅`;
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
module.exports = async (sock, m) => {
    try {
        await loadUtils();

        const body = (
            m.body||m.message?.conversation||m.message?.extendedTextMessage?.text||
            m.message?.imageMessage?.caption||m.message?.videoMessage?.caption||
            m.message?.documentMessage?.caption||
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

        if (BOT_PAUSED&&!isOwner) return;

        const reply = t => sock.sendMessage(m.chat,{text:t},{quoted:m}).catch(()=>{});
        const react = e => sock.sendMessage(m.chat,{react:{text:e,key:m.key}}).catch(()=>{});

        const ctx = {
            args, text, q, mime, isMedia:/image|video|sticker|audio/.test(mime),
            gMeta, gName, parts, gAdmins, botAdmin, isAdmin, isAdmins:isAdmin,
            isCreator:isOwner, prefix:pfx, reply, react, config, sender, pushname:name, senderNum, m,
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
            await reply(`⚡ *${B('LIAM LITE')}* 👁️\n${I('Hey ')}${name}${I('! Use ')}*${pfx}menu*${I(' for commands.')}\n\n${SIG()}`);
            return;
        }

        // Chatbot
        if (feat.chatbot&&!m.key.fromMe&&!isCmd&&body.trim().length>1) {
            sock.sendPresenceUpdate('composing',m.chat).catch(()=>{});
            const r=await chatbot(m.chat,body.trim());
            sock.sendPresenceUpdate('paused',m.chat).catch(()=>{});
            return reply(r);
        }

        if (!isCmd) return;

        // Plugin dispatch
        if (await loader.run(cmd,sock,m,ctx)) return;

        // ── BUILT-IN COMMANDS ────────────────────────────────────────────────

        if (cmd==='menu'||cmd==='help') {
            const st=config.menuStyle||'fancy';
            const pg=Math.max(0,Date.now()-(m.messageTimestamp||0)*1000);
            if (st==='buttons'){await loader.menuButtons(sock,m,pfx);return;}
            if (st==='classic'){await reply(loader.menuClassic(pfx));return;}
            await reply(loader.menuFancy(pfx,name,sock,pg));
            return;
        }

        if (cmd==='fancy')  {config.menuStyle='fancy';  return reply(`✅ ${BI('Fancy mode')} ✨\n${SIG()}`);}
        if (cmd==='classic'){config.menuStyle='classic'; return reply(`✅ ${BI('Classic mode')} 📋\n${SIG()}`);}

        // .button — interactive list of mode switches (working list buttons)
        if (cmd==='button'||cmd==='buttons') {
            config.menuStyle='buttons';
            try {
                await sock.sendMessage(m.chat, {
                    text:     `${B('Buttons Mode Activated')}\n\n${I('Tap any button to switch mode')}`,
                    footer:   `👁️ ${T('LIAM LITE')}`,
                    buttonText: T('Switch Mode ▾'),
                    sections: [{
                        title: T('Mode & Menu'),
                        rows: [
                            {rowId:'mode_public',  title:'🌍 Public',  description:T('respond to everyone')},
                            {rowId:'mode_dms',     title:'💬 DMs',     description:T('DMs only')},
                            {rowId:'mode_groups',  title:'👥 Groups',  description:T('groups only')},
                            {rowId:'mode_silent',  title:'🔇 Silent',  description:T('owner only')},
                            {rowId:'menu_buttons', title:'📋 Buttons', description:T('button menu style')},
                            {rowId:'menu_default', title:'📝 Default', description:T('fancy menu style')},
                        ]
                    }],
                    listType: 1,
                }, {quoted:m});
            } catch {
                await reply(`✅ ${BI('Buttons mode set')}\n${SIG()}`);
            }
            return;
        }

        // Handle list button responses
        const modeMap={
            'mode_public':  ()=>{sock.public=true; config.mode='public';  return reply(`🌍 ${BI('Mode → Public')}\n${SIG()}`)},
            'mode_dms':     ()=>{sock.public=false;config.mode='dms';     return reply(`💬 ${BI('Mode → DMs')}\n${SIG()}`)},
            'mode_groups':  ()=>{sock.public=false;config.mode='groups';  return reply(`👥 ${BI('Mode → Groups')}\n${SIG()}`)},
            'mode_silent':  ()=>{sock.public=false;config.mode='silent';  return reply(`🔇 ${BI('Mode → Silent')}\n${SIG()}`)},
            'menu_buttons': ()=>{config.menuStyle='buttons'; return reply(`📋 ${BI('Menu → Buttons')}\n${SIG()}`)},
            'menu_default': ()=>{config.menuStyle='fancy';   return reply(`📝 ${BI('Menu → Fancy')}\n${SIG()}`)},
        };
        if (modeMap[body]) { if (!isOwner) return reply(DENY()); return modeMap[body](); }

        // .alive
        if (cmd==='alive') {
            BOT_PAUSED=false;
            const up=uptime();
            return reply(`⚡ *${B('LIAM LITE')}* ${I('is alive!')} 😎\n${T('been up for')} *${up}*, ${T('cool huh')} 🔥\n\n${SIG()}`);
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
        if (cmd==='kill'||cmd==='pause') {
            if (!isOwner) return reply(DENY());
            BOT_PAUSED=true;
            return reply(`🔴 ${BI('Paused')} — ${I('use')} *${pfx}alive* ${I('to resume')}\n${SIG()}`);
        }
        if (cmd==='wake') {
            if (!isOwner) return reply(DENY());
            BOT_PAUSED=false;
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
            const u=require('./library/updater');
            await u.doUpdate(sock,m,reply);
            return;
        }

        // .channel — button style link
        if (cmd==='channel') {
            try {
                await sock.sendMessage(m.chat, {
                    text:     `👁️ *${B('LIAM LITE')}* ${T('Official Channel')}`,
                    footer:   T('Tap to join'),
                    buttonText: T('Open ▾'),
                    sections: [{
                        title: T('LIAM LITE'),
                        rows: [{
                            rowId:       'ch_join',
                            title:       '📢 Join Channel',
                            description: T('Official LIAM LITE channel')
                        }]
                    }],
                    listType: 1,
                }, {quoted:m});
            } catch {
                reply(`📢 *${B('LIAM LITE Channel')}*\n${config.channel}\n\n${SIG()}`);
            }
            return;
        }

        // ── MULTI-SESSION ────────────────────────────────────────────────────
        const bridge=require('./library/bridge_lite');

        // .run <session_id>
        if (cmd==='run') {
            if (!isOwner) return reply(DENY());
            if (!text) return reply(`${T('Usage:')} *${pfx}run* ${T('<LIAM:~ session id>')}\n${SIG()}`);
            const slot=bridge.getSlot();
            if (!slot) return reply(`❌ ${BI('Max')} ${bridge.MAX_INST} ${T('sessions reached')}\n${SIG()}`);
            bridge.launchInstance(text.trim(),slot);
            return reply(`✅ ${BI('Instance #'+slot+' starting...')}\n> ${T('Use')} *${pfx}runlist* ${T('to check status')}\n${SIG()}`);
        }

        // .runlist
        if (cmd==='runlist') {
            if (!isOwner) return reply(DENY());
            const rows=bridge.listInstances();
            if (!rows.length) return reply(`${T('No extra sessions running')}\n> ${T('Use')} *${pfx}run <id>* ${T('to start one')}\n${SIG()}`);
            return reply(`⚡ ${BI('Running Sessions:')}\n${rows.join('\n')}\n\n${SIG()}`);
        }

        // .terminate / .terminate1,2,3
        if (cmd.startsWith('terminate')) {
            if (!isOwner) return reply(DENY());
            const slotStr=cmd.replace('terminate','')||text;
            if (!slotStr.trim()) return reply(`${T('Usage:')} *${pfx}terminate1* ${T('or')} *${pfx}terminate 1,2*\n${SIG()}`);
            const slots=slotStr.split(/[,\s]+/).filter(Boolean);
            const done=[],fail=[];
            for (const s of slots) bridge.terminateInstance(s.trim())?done.push(s):fail.push(s);
            return reply(`🗑️ ${BI('Done')}\n${done.length?T('Terminated: ')+done.join(', '):''}${fail.length?'\n'+T('Not found: ')+fail.join(', '):''}\n${SIG()}`);
        }

        // .tostatus
        if (cmd==='tostatus') {
            if (!isOwner) return reply(DENY());
            if (!q&&!text) return reply(`${T('Reply to media or add caption')}\n${SIG()}`);
            await react('📤');
            try {
                const mime2=(q?.msg||q)?.mimetype||'';
                if (q&&mime2.includes('image')) {
                    const buf=await sock.downloadMediaMessage(q);
                    await sock.sendMessage('status@broadcast',{image:buf,caption:text||'👁️ LIAM LITE'});
                } else if (q&&mime2.includes('video')) {
                    const buf=await sock.downloadMediaMessage(q);
                    await sock.sendMessage('status@broadcast',{video:buf,caption:text||'👁️ LIAM LITE'});
                } else {
                    await sock.sendMessage('status@broadcast',{text:`${text||'👁️ LIAM LITE'}\n\n${SIG()}`});
                }
                await react('✅');
                return reply(`✅ ${BI('Posted to status!')} 🔥\n${SIG()}`);
            } catch(e){await react('❌');return reply(`❌ ${e.message}\n${SIG()}`);}
        }

        // .toarchives
        if (cmd==='toarchives') {
            if (!isOwner) return reply(DENY());
            const tok=config.telegramBotToken,cid=config.telegramChannelId;
            if (!tok||!cid) return reply(`❌ ${T('Set TG_BOT_TOKEN + TG_CHANNEL_ID')}\n${SIG()}`);
            await react('📤');
            try {
                const base=`https://api.telegram.org/bot${tok}`;
                const cap=(text||'')+'\n\n👁️ LIAM LITE';
                if (q&&(q.msg||q).mimetype) {
                    const buf=await sock.downloadMediaMessage(q);
                    const mime3=(q.msg||q).mimetype||'';
                    const FormData=require('form-data');
                    const fd=new FormData();
                    fd.append('chat_id',cid); fd.append('caption',cap);
                    if (mime3.includes('image'))       { fd.append('photo',buf,'m.jpg');   await axios.post(`${base}/sendPhoto`,fd,{headers:fd.getHeaders(),timeout:30000}); }
                    else if (mime3.includes('video'))  { fd.append('video',buf,'m.mp4');   await axios.post(`${base}/sendVideo`,fd,{headers:fd.getHeaders(),timeout:30000}); }
                    else if (mime3.includes('audio'))  { fd.append('audio',buf,'m.mp3');   await axios.post(`${base}/sendAudio`,fd,{headers:fd.getHeaders(),timeout:30000}); }
                    else                                { fd.append('document',buf,'m.bin');await axios.post(`${base}/sendDocument`,fd,{headers:fd.getHeaders(),timeout:30000}); }
                } else if (text) {
                    await axios.post(`${base}/sendMessage`,{chat_id:cid,text:cap},{timeout:10000});
                } else { return reply(`${T('Reply to media or add text after')} *${pfx}toarchives*\n${SIG()}`); }
                await react('✅');
                return reply(`✅ ${BI('Archived to Telegram!')} 📨\n${SIG()}`);
            } catch(e){await react('❌');return reply(`❌ ${e.message}\n${SIG()}`);}
        }

    } catch(e) { console.log(chalk.red('[ERR] '+(e.message||e))); }
};
