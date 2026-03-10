// ╔══════════════════════════════════════════════════════════════╗
// ║  LIAM LITE — Multi-Session Bridge (stable)                 ║
// ╚══════════════════════════════════════════════════════════════╝
'use strict';

const { fork } = require('child_process');
const fs       = require('fs');
const path     = require('path');

const ROOT      = path.join(__dirname, '..');
const SESS_BASE = path.join(ROOT, 'sessions');
const MAX_INST  = 10;

// slot → { child, slot, sid, status, startTime, restarts }
const instances = new Map();
// Lock to prevent double-spawn race
const _spawning = new Set();

const getSlot = () => {
    for (let i=2; i<=MAX_INST; i++) {
        const k = String(i);
        if (!instances.has(k) && !_spawning.has(k)) return k;
    }
    return null;
};

const launchInstance = (sid, slot, onReady) => {
    const k = String(slot);
    if (_spawning.has(k) || instances.has(k)) {
        console.log(`[BRIDGE] Slot ${k} already running/spawning`);
        return null;
    }
    _spawning.add(k);

    const sessDir = path.join(SESS_BASE, `inst_${k}`);
    fs.mkdirSync(sessDir, { recursive: true });

    // Write creds if LIAM:~ token
    if (sid && sid.startsWith('LIAM:~')) {
        const raw = sid.replace(/^LIAM:~/, '').replace(/\s/g,'');
        if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length > 100) {
            const cp = path.join(sessDir,'creds.json');
            if (!fs.existsSync(cp)) {
                try { fs.writeFileSync(cp, Buffer.from(raw,'base64')); }
                catch(e) { console.log(`[BRIDGE] creds write err: ${e.message}`); }
            }
        }
    }

    const env = {
        ...process.env,
        LIAM_INSTANCE_ID: k,
        LIAM_SESSION_DIR: sessDir,
        SESSION_ID:       sid || '',
        FORCE_COLOR:      '0',
    };

    let child;
    try {
        child = fork(path.join(ROOT,'index.js'), [], {
            env,
            silent:   false,
            detached: false,
            execArgv: [],
        });
    } catch(e) {
        _spawning.delete(k);
        console.log(`[BRIDGE] Fork failed: ${e.message}`);
        return null;
    }

    const inst = { child, slot: k, sid, status:'starting', startTime: Date.now(), restarts: 0 };
    instances.set(k, inst);
    _spawning.delete(k);

    child.on('message', (msg) => {
        if (!msg) return;
        if (msg.type === 'ready') {
            inst.status = 'online';
            inst.num    = msg.num || '?';
            console.log(`[BRIDGE] ✅ Instance #${k} online — +${inst.num}`);
            if (typeof onReady === 'function') onReady(k, inst.num);
        }
    });

    child.on('exit', (code, signal) => {
        const i = instances.get(k);
        if (!i) return;
        i.status = `offline(${code||signal})`;
        console.log(`[BRIDGE] Instance #${k} exited (${code||signal})`);

        // Auto-restart up to 3 times unless loggedout
        if (code !== 1 && i.restarts < 3 && !i._terminated) {
            i.restarts++;
            console.log(`[BRIDGE] Restarting #${k} attempt ${i.restarts}...`);
            setTimeout(() => {
                if (!instances.has(k) || instances.get(k)?._terminated) return;
                instances.delete(k);
                launchInstance(sid, k, onReady);
            }, 5000);
        } else {
            instances.delete(k);
        }
    });

    child.on('error', (e) => {
        console.log(`[BRIDGE] Instance #${k} error: ${e.message}`);
    });

    return k;
};

const terminateInstance = (slot) => {
    const k    = String(slot);
    const inst = instances.get(k);
    if (!inst) return false;
    inst._terminated = true;
    try { inst.child.kill('SIGTERM'); } catch(_) {}
    // Remove session files
    const sessDir = path.join(SESS_BASE, `inst_${k}`);
    try { require('fs').rmSync(sessDir, { recursive:true, force:true }); } catch(_) {}
    instances.delete(k);
    return true;
};

const listInstances = () => {
    const rows = [];
    for (const [slot, inst] of instances) {
        const up = ~~((Date.now()-inst.startTime)/1000);
        const upStr = up>3600?`${~~(up/3600)}h${~~(up%3600/60)}m`:up>60?`${~~(up/60)}m`:up+'s';
        const icon  = inst.status==='online' ? '🟢' : '🟡';
        const num   = inst.num ? ` +${inst.num}` : '';
        rows.push(`  ${icon} #${slot}${num} — ${T(inst.status)} — ${upStr}`);
    }
    return rows;
};

const T = s => s.split('').map(c=>({'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ','k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','q':'ᵠ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ'}[c]||c)).join('');

module.exports = { launchInstance, terminateInstance, listInstances, instances, MAX_INST, getSlot };
