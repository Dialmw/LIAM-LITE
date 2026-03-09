// ╔══════════════════════════════════════════════════════════════╗
// ║  LIAM LITE — Multi-Session Bridge                           ║
// ║  .run .runlist .terminate .pause .alive                     ║
// ╚══════════════════════════════════════════════════════════════╝
'use strict';

const { fork }  = require('child_process');
const fs        = require('fs');
const path      = require('path');

const ROOT      = path.join(__dirname, '..');
const SESS_BASE = path.join(ROOT, 'sessions');
const MAX_INST  = 10;
const sig       = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';

// Map: id → { child, num, status, startTime }
const instances = new Map();
let   _paused   = false;

const getSlot = () => {
    for (let i = 2; i <= MAX_INST; i++) {
        if (!instances.has(String(i))) return String(i);
    }
    return null;
};

const launchInstance = (sid, slot) => {
    const sessDir = path.join(SESS_BASE, `inst_${slot}`);
    fs.mkdirSync(sessDir, { recursive: true });

    // Write creds if sid is a LIAM:~ token
    if (sid && sid.startsWith('LIAM:~')) {
        const cp = path.join(sessDir, 'creds.json');
        if (!fs.existsSync(cp)) {
            try { fs.writeFileSync(cp, Buffer.from(sid.replace(/^LIAM:~/, ''), 'base64')); }
            catch(_) {}
        }
    }

    const env = {
        ...process.env,
        LIAM_INSTANCE_ID:  slot,
        LIAM_SESSION_DIR:  sessDir,
        SESSION_ID:        sid || '',
    };

    const child = fork(path.join(ROOT, 'index.js'), [], {
        env,
        silent: false,
        detached: false,
    });

    instances.set(slot, {
        child,
        slot,
        sid,
        status:    'starting',
        startTime: Date.now(),
    });

    child.on('exit', (code) => {
        const inst = instances.get(slot);
        if (inst) inst.status = `exited(${code})`;
    });

    child.on('message', (msg) => {
        const inst = instances.get(slot);
        if (inst && msg?.type === 'ready') inst.status = 'online';
    });

    return slot;
};

const terminateInstance = (slot) => {
    const inst = instances.get(String(slot));
    if (!inst) return false;
    try { inst.child.kill('SIGTERM'); } catch(_) {}
    // Clean session files
    const sessDir = path.join(SESS_BASE, `inst_${slot}`);
    try { fs.rmSync(sessDir, { recursive: true, force: true }); } catch(_) {}
    instances.delete(String(slot));
    return true;
};

const setPaused = (v) => { _paused = v; };
const isPaused  = ()  => _paused;

const listInstances = () => {
    const rows = [];
    for (const [slot, inst] of instances) {
        const up = Math.floor((Date.now() - inst.startTime) / 1000);
        const upStr = `${~~(up/3600)}h${~~(up%3600/60)}m`;
        rows.push(`  ${slot}. ${inst.status === 'online' ? '🟢' : '🟡'} Slot ${slot} — ${upStr}`);
    }
    return rows;
};

module.exports = { launchInstance, terminateInstance, setPaused, isPaused, listInstances, instances, MAX_INST, getSlot };
