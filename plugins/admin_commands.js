// ╔═══════════════════════════════════════════════════════════════╗
// ║  LIAM LITE — Admin commands: antilink, sudo, botadmin, pair ║
// ╚═══════════════════════════════════════════════════════════════╝
'use strict';
const store  = require('../library/store');
const config = require('../settings/config');

const sig  = () => '> 👁️ LIAM LITE Alpha';
const DENY = () => '𝙈𝙢𝙢 𝙣𝙤𝙩 𝙖𝙡𝙡𝙤𝙬𝙚𝙙 🫵, 𝙖𝙨𝙠 𝙢𝙮 𝙢𝙖𝙨𝙩𝙚𝙧 👁️';
const T    = s => s.split('').map(c=>({'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ','k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','q':'ᵠ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ',' ':' '}[c]||c)).join('');

const react = (sock,m,e) => sock.sendMessage(m.chat,{react:{text:e,key:m.key}}).catch(()=>{});

// ── ANTILINK ─────────────────────────────────────────────────────────────────
// Usage:
//   .antilink          → toggle for this group (if already on: says 🟢 Active)
//   .antilink warn     → enable warn mode
//   .antilink delete   → enable delete mode
//   .antilink kick     → enable kick mode
//   .antilink remove   → disable for this group
//   .antilink status   → show current setting
module.exports = [

{ command:'antilink', category:'settings', group:true,
  execute: async (sock,m,{text,reply,isCreator,isAdmin,isAdmins}) => {
    if (!isCreator && !isAdmins) return reply(`⚠️ ${T('admins only')} 🚫\n\n${sig()}`);

    const jid = m.chat;
    const sub = (text||'').toLowerCase().trim();
    const cur = store.antilinkGet(jid);

    // .antilink remove
    if (sub==='remove'||sub==='off'||sub==='disable') {
        if (!cur) return reply(`⚠️ *Anti-Link* is already *OFF* for this group\n\n${sig()}`);
        store.antilinkDel(jid);
        await react(sock,m,'✅');
        return reply(`✅ *Anti-Link REMOVED* for this group 🚫\n\n${sig()}`);
    }

    // .antilink status
    if (sub==='status') {
        if (!cur) return reply(`🔴 *Anti-Link:* OFF\n\n${sig()}`);
        return reply(`🟢 *Anti-Link:* ON\n📋 *Mode:* ${cur.mode.toUpperCase()}\n⚠️ *Warns logged:* ${Object.keys(cur.warns||{}).length}\n\n${sig()}`);
    }

    // .antilink warn / delete / kick
    const validModes = { warn:'warn', delete:'delete', del:'delete', kick:'kick' };
    const mode = validModes[sub] || null;

    if (cur && !mode) {
        // Already active — report status instead of toggling off silently
        return reply(`🟢 *Anti-Link already ACTIVE*\n📋 Mode: ${cur.mode.toUpperCase()}\n\n_Use_ *.antilink remove* _to disable_\n_Use_ *.antilink warn|delete|kick* _to change mode_\n\n${sig()}`);
    }

    const newMode = mode || (cur ? cur.mode : 'delete');
    store.antilinkSet(jid, { mode: newMode, warns: cur?.warns || {} });
    await react(sock,m,'🚫');
    return reply(
        `🚫 *Anti-Link ENABLED* ✅\n` +
        `📋 *Mode:* ${newMode.toUpperCase()}\n` +
        `${newMode==='warn'  ? '⚠️ _Members get a warning. 3 warns = kick_'   : ''}`+
        `${newMode==='delete'? '🗑️ _Links auto-deleted immediately_'          : ''}`+
        `${newMode==='kick'  ? '🦵 _Members who send links are kicked_'        : ''}`+
        `\n\n${sig()}`
    );
  }
},

// ── PAIR ─────────────────────────────────────────────────────────────────────
{ command:'pair', category:'settings', owner:true,
  execute: async (sock,m,{args,reply,isCreator,prefix}) => {
    if (!isCreator) return reply(DENY());
    const num = (args[0]||'').replace(/\D/g,'');
    if (!num||num.length<7)
        return reply(`📱 *Pair a new bot*\n\n*Usage:* _${prefix}pair 254712345678_\n\n${T('full number with country code')}\n\n${sig()}`);

    await react(sock,m,'⏳');
    await reply(`⏳ _Requesting pairing code for +${num}..._\n\n${sig()}`);

    try {
        await require('@whiskeysockets/baileys').delay(1500);
        const code = await sock.requestPairingCode(num);
        const fmt  = code?.match(/.{1,4}/g)?.join('-') || code;
        await react(sock,m,'✅');
        return reply(
            `🔑 *Pairing Code for +${num}*\n\n` +
            `┌──────────────────┐\n` +
            `│  *${fmt}*\n` +
            `└──────────────────┘\n\n` +
            `📌 _Open WhatsApp → Linked Devices → Link a Device → Enter code_\n\n` +
            `⏰ _Expires in 60 seconds_\n\n${sig()}`
        );
    } catch(e) {
        await react(sock,m,'❌');
        return reply(`❌ *Pairing failed:* ${e.message}\n\n_Make sure the number is not already linked_\n\n${sig()}`);
    }
  }
},

// ── ADDSUDO — give full owner-level sudo rights ──────────────────────────────
{ command:'addsudo', category:'settings', owner:true,
  execute: async (sock,m,{args,reply,isCreator,prefix}) => {
    if (!isCreator) return reply(DENY());
    const q    = m.quoted;
    const num  = (args[0]||q?.sender||'').replace(/[^0-9]/g,'');
    if (!num) return reply(`*Usage:* _${prefix}addsudo 254712345678_\n_or reply to a message_\n\n${sig()}`);
    if (store.isSudo(num)) return reply(`⚠️ *+${num}* is already a *sudo user*\n\n${sig()}`);
    store.push('sudo', num);
    await react(sock,m,'👑');
    return reply(`👑 *+${num}* added as *SUDO*\n_Full bot permissions granted_\n\n${sig()}`);
  }
},

// ── REMOVESUDO ──────────────────────────────────────────────────────────────
{ command:'removesudo', category:'settings', owner:true,
  execute: async (sock,m,{args,reply,isCreator,prefix}) => {
    if (!isCreator) return reply(DENY());
    const num = (args[0]||'').replace(/[^0-9]/g,'');
    if (!num) return reply(`*Usage:* _${prefix}removesudo 254712345678_\n\n${sig()}`);
    if (!store.isSudo(num)) return reply(`⚠️ *+${num}* is not in sudo list\n\n${sig()}`);
    store.pull('sudo', num);
    await react(sock,m,'✅');
    return reply(`✅ *+${num}* removed from sudo\n\n${sig()}`);
  }
},

// ── ADDSUDO1 — give bot-admin rights (group admin commands only) ────────────
{ command:'addsudo1', category:'settings', owner:true,
  execute: async (sock,m,{args,reply,isCreator,prefix}) => {
    if (!isCreator) return reply(DENY());
    const q   = m.quoted;
    const num = (args[0]||q?.sender||'').replace(/[^0-9]/g,'');
    if (!num) return reply(`*Usage:* _${prefix}addsudo1 254712345678_\n_or reply to a message_\n\n${sig()}`);
    if (store.isBotAdmin(num)) return reply(`⚠️ *+${num}* already has *bot-admin* rights\n\n${sig()}`);
    store.push('botadmin', num);
    await react(sock,m,'🔰');
    return reply(`🔰 *+${num}* added as *BOT ADMIN*\n_Can use group admin commands_\n\n${sig()}`);
  }
},

// ── REMOVESUDO1 ─────────────────────────────────────────────────────────────
{ command:'removesudo1', category:'settings', owner:true,
  execute: async (sock,m,{args,reply,isCreator,prefix}) => {
    if (!isCreator) return reply(DENY());
    const num = (args[0]||'').replace(/[^0-9]/g,'');
    if (!num) return reply(`*Usage:* _${prefix}removesudo1 254712345678_\n\n${sig()}`);
    if (!store.isBotAdmin(num)) return reply(`⚠️ *+${num}* is not in bot-admin list\n\n${sig()}`);
    store.pull('botadmin', num);
    await react(sock,m,'✅');
    return reply(`✅ *+${num}* removed from bot-admin\n\n${sig()}`);
  }
},

// ── SUDOLIST ─────────────────────────────────────────────────────────────────
{ command:'sudolist', category:'settings', owner:true,
  execute: async (sock,m,{reply,isCreator}) => {
    if (!isCreator) return reply(DENY());
    const sudos    = store.get('sudo')    || [];
    const botadmins= store.get('botadmin')|| [];
    let msg = `👑 *Sudo Users (full rights):*\n${sudos.length?sudos.map(n=>`  • +${n}`).join('\n'):'  _none_'}\n\n`;
    msg    += `🔰 *Bot Admins (group cmd rights):*\n${botadmins.length?botadmins.map(n=>`  • +${n}`).join('\n'):'  _none_'}`;
    return reply(msg+`\n\n${sig()}`);
  }
},

];
