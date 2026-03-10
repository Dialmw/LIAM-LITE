'use strict';
const sig  = () => '> 👁️ LIAM LITE Alpha';
const DENY = () => '𝙈𝙢𝙢 𝙣𝙤𝙩 𝙖𝙡𝙡𝙤𝙬𝙚𝙙 🫵, 𝙖𝙨𝙠 𝙢𝙮 𝙢𝙖𝙨𝙩𝙚𝙧 👁️';
const T    = s => s.split('').map(c=>({'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ','k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','q':'ᵠ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ',' ':' '}[c]||c)).join('');

module.exports = [

{ command:'run', category:'session', owner:true,
  execute: async (sock,m,{text,reply,isCreator}) => {
    if (!isCreator) return reply(DENY());
    const bridge = require('../library/bridge_lite');
    if (!text) return reply(`*Usage:* _.run <LIAM:~ session id>_\n\n${sig()}`);
    const slot = bridge.getSlot();
    if (!slot) return reply(`❌ Max ${bridge.MAX_INST} sessions reached\n\n${sig()}`);
    const jid = m.chat;
    // onReady callback fires when instance connects — sends success msg
    const ok = bridge.launchInstance(text.trim(), slot, async (s, num) => {
        sock.sendMessage(jid, {
            text: `✅ *Instance #${s} ONLINE!* 🟢\n👤 *Number:* +${num}\n_Spawned via_ *.run*\n\n${sig()}`
        }).catch(()=>{});
    });
    if (!ok) return reply(`❌ Failed to spawn instance (already running?)\n\n${sig()}`);
    reply(`⏳ *Instance #${slot} starting...*\n_Will confirm when online_\n\n${sig()}`);
  }
},

{ command:'runlist', category:'session', owner:true,
  execute: async (sock,m,{reply,isCreator}) => {
    if (!isCreator) return reply(DENY());
    const bridge = require('../library/bridge_lite');
    const rows   = bridge.listInstances();
    if (!rows.length) return reply(`${T('No extra sessions running')}\n_Use_ *.run <id>* _to start one_\n\n${sig()}`);
    reply(`⚡ *Running Sessions:*\n${rows.join('\n')}\n\n${sig()}`);
  }
},

{ command:'terminate', category:'session', owner:true,
  execute: async (sock,m,{text,reply,isCreator}) => {
    if (!isCreator) return reply(DENY());
    const bridge = require('../library/bridge_lite');
    if (!text) return reply(`*Usage:* _.terminate 1_ or _.terminate 1,2,3_\n\n${sig()}`);
    const slots=text.split(/[,\s]+/).filter(Boolean);
    const done=[],fail=[];
    for (const s of slots) bridge.terminateInstance(s.trim()) ? done.push(s) : fail.push(s);
    reply(`🗑️ *Done*\n${done.length?`✅ Terminated: ${done.join(', ')}\n`:''}${fail.length?`❌ Not found: ${fail.join(', ')}\n`:''}\n${sig()}`);
  }
},

{ command:'pause', category:'session', owner:true,
  execute: async (sock,m,{reply,isCreator}) => {
    if (!isCreator) return reply(DENY());
    if (!global._LIAM_PAUSED) global._LIAM_PAUSED = {};
    global._LIAM_PAUSED[process.env.LIAM_INSTANCE_ID||'main'] = true;
    reply(`🔴 *Paused* — _use_ *.alive* _to resume_\n\n${sig()}`);
  }
},

];
