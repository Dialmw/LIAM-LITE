// ╔═══════════════════════════════════════════════════════════╗
// ║  LIAM LITE — persistent JSON store (groups, sudo, etc.) ║
// ╚═══════════════════════════════════════════════════════════╝
'use strict';
const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'settings', 'store.json');

const defaults = {
    sudo:           [],   // sudo numbers (owner-level)
    botadmin:       [],   // bot admin numbers (group admin cmds)
    antilinkGroups: {},   // { jid: { mode:'warn'|'delete'|'kick', warns:{} } }
    antideleteOn:   true,
};

const load = () => {
    try {
        if (fs.existsSync(FILE)) return { ...defaults, ...JSON.parse(fs.readFileSync(FILE,'utf8')) };
    } catch(_) {}
    return { ...defaults };
};

const save = (data) => {
    try { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); } catch(_) {}
};

let _data = load();

const get  = (key) => _data[key];
const set  = (key, val) => { _data[key] = val; save(_data); };
const push = (key, val) => { if (!_data[key]) _data[key]=[]; if(!_data[key].includes(val)){_data[key].push(val); save(_data);} };
const pull = (key, val) => { _data[key]=(_data[key]||[]).filter(x=>x!==val); save(_data); };
const reload = () => { _data = load(); };

// antilink helpers
const antilinkGet = (jid) => (_data.antilinkGroups||{})[jid] || null;
const antilinkSet = (jid, obj) => {
    if (!_data.antilinkGroups) _data.antilinkGroups = {};
    _data.antilinkGroups[jid] = obj;
    save(_data);
};
const antilinkDel = (jid) => {
    if (_data.antilinkGroups) { delete _data.antilinkGroups[jid]; save(_data); }
};

// sudo helpers
const isSudo = (num) => {
    const n = num.replace(/[^0-9]/g,'');
    return (_data.sudo||[]).map(x=>x.replace(/[^0-9]/g,'')).includes(n);
};
const isBotAdmin = (num) => {
    const n = num.replace(/[^0-9]/g,'');
    return (_data.botadmin||[]).map(x=>x.replace(/[^0-9]/g,'')).includes(n);
};

module.exports = { get, set, push, pull, reload, antilinkGet, antilinkSet, antilinkDel, isSudo, isBotAdmin };
