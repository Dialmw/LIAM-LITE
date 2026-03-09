// Session management commands for LITE
'use strict';
const path   = require('path');
const sig    = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';
const DENY   = () => '𝙈𝙢𝙢 𝙣𝙤𝙩 𝙖𝙡𝙡𝙤𝙬𝙚𝙙 🫵, 𝙖𝙨𝙠 𝙢𝙮 𝙢𝙖𝙨𝙩𝙚𝙧 👁️';
const T = s => s.split('').map(c=>({'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ','k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','q':'ᵠ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','A':'ᴬ','B':'ᴮ','C':'ᶜ','D':'ᴰ','E':'ᴱ','F':'ᶠ','G':'ᴳ','H':'ᴴ','I':'ᴵ','J':'ᴶ','K':'ᴷ','L':'ᴸ','M':'ᴹ','N':'ᴺ','O':'ᴼ','P':'ᴾ','Q':'ᵠ','R':'ᴿ','S':'ˢ','T':'ᵀ','U':'ᵁ','V':'ᵛ','W':'ᵂ','X':'ˣ','Y':'ʸ','Z':'ᶻ',' ':' '}[c]||c)).join('');

module.exports = [

{ command:'run', category:'session', owner:true,
  execute: async (sock,m,{text,reply,isCreator}) => {
    if (!isCreator) return reply(DENY());
    const bridge = require('../library/bridge_lite');
    if (!text) return reply(`*Usage:* *.run* _<LIAM:~ session id>_\n\n${sig()}`);
    const slot = bridge.getSlot();
    if (!slot) return reply(`❌ Max ${bridge.MAX_INST} sessions reached\n\n${sig()}`);
    bridge.launchInstance(text.trim(), slot);
    reply(`✅ *Instance #${slot} starting...*\n_Use_ *.runlist* _to check_\n\n${sig()}`);
  }
},

{ command:'runlist', category:'session', owner:true,
  execute: async (sock,m,{reply,isCreator}) => {
    if (!isCreator) return reply(DENY());
    const bridge = require('../library/bridge_lite');
    const rows = bridge.listInstances();
    if (!rows.length) return reply(`${T('No extra sessions running')}\n_Use_ *.run <id>* _to start one_\n\n${sig()}`);
    reply(`⚡ *Running Sessions:*\n${rows.join('\n')}\n\n${sig()}`);
  }
},

{ command:'terminate', category:'session', owner:true,
  execute: async (sock,m,{text,reply,isCreator}) => {
    if (!isCreator) return reply(DENY());
    const bridge = require('../library/bridge_lite');
    if (!text) return reply(`*Usage:* *.terminate* _1_ or *.terminate* _1,2,3_\n\n${sig()}`);
    const slots = text.split(/[,\s]+/).filter(Boolean);
    const done=[],fail=[];
    for (const s of slots) bridge.terminateInstance(s.trim()) ? done.push(s) : fail.push(s);
    reply(`🗑️ *Terminated:* ${done.join(', ')||'none'}${fail.length?`\n❌ *Not found:* ${fail.join(', ')}`:''}  \n\n${sig()}`);
  }
},

{ command:'pause', category:'session', owner:true,
  execute: async (sock,m,{reply,isCreator}) => {
    if (!isCreator) return reply(DENY());
    // Set global pause flag
    if (!global._LIAM_PAUSED) global._LIAM_PAUSED = {};
    global._LIAM_PAUSED[process.env.LIAM_INSTANCE_ID||'main'] = true;
    reply(`🔴 *Paused* — _use_ *.alive* _to resume_\n\n${sig()}`);
  }
},

{ command:'terminate1', category:'session', owner:true,
  execute: async (sock,m,{reply,isCreator}) => {
    if (!isCreator) return reply(DENY());
    const bridge = require('../library/bridge_lite');
    bridge.terminateInstance('1') ? reply(`🗑️ *Instance 1 terminated*\n\n${sig()}`) : reply(`❌ Instance 1 not running\n\n${sig()}`);
  }
},

];
