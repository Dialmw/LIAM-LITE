// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ⚡  LIAM LITE v2 — Ultra-Fast Mini WhatsApp Bot                       ║
// ║  © 2025 Liam — All Rights Reserved                                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
if (!process.env.LIAM_INSTANCE_ID) console.clear();

const fs        = require('fs');
const path      = require('path');
const pino      = require('pino');
const chalk     = require('chalk');
const readline  = require('readline');
const { Boom }  = require('@hapi/boom');
const os        = require('os');

const cfg     = () => require('./settings/config');
const sleep   = ms => new Promise(r => setTimeout(r, ms));
const updater = require('./library/updater');
const bridge  = require('./library/bridge_lite');

const IGNORED = [
    'Socket connection timeout','EKEYTYPE','item-not-found','rate-overlimit',
    'Connection Closed','Timed Out','Value not found','Bad MAC',
    'unexpected server response','write EPIPE','read ECONNRESET','Stream Errored',
    'Connection reset','Lost connection'
];
process.on('uncaughtException',  e => { if (!IGNORED.some(x => String(e).includes(x))) console.error('[ERR]', e.message || e); });
process.on('unhandledRejection', e => { if (!IGNORED.some(x => String(e).includes(x))) {} });

let _restartPending = false, _restartCount = 0;
const _restartDelay = () => Math.min(1500 * Math.pow(1.4, _restartCount), 25000);

const detectHost = () => {
    if (process.env.HEROKU_APP_NAME || process.env.DYNO)                          return '🟣 Heroku';
    if (process.env.RENDER || process.env.RENDER_SERVICE_NAME)                     return '🟦 Render';
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID)         return '🚂 Railway';
    if (process.env.TERMUX_VERSION || (process.env.PREFIX||'').includes('termux')) return '📱 Termux';
    if (process.env.KOYEB_INSTANCE_ID)                                             return '🟠 Koyeb';
    if (process.env.FLY_APP_NAME)                                                  return '🪁 Fly.io';
    return '🖥️ VPS/Local';
};
global._hostName = detectHost();

// Session dir — each instance gets its own
const IS_CHILD   = !!process.env.LIAM_INSTANCE_ID;
const INST_ID    = process.env.LIAM_INSTANCE_ID || 'main';
const SESSION_DIR = process.env.LIAM_SESSION_DIR ||
    path.join(__dirname, 'sessions', IS_CHILD ? `inst_${INST_ID}` : 'main');

const ts = () => chalk.hex('#636e72')(`[${new Date().toLocaleTimeString('en-US',{hour12:false})}]`);
const L = {
    info: m => console.log(ts() + chalk.hex('#00d4ff').bold(' ◆ ') + chalk.white(m)),
    ok:   m => console.log(ts() + chalk.hex('#00b894').bold(' ✔ ') + chalk.greenBright(m)),
    warn: m => console.log(ts() + chalk.hex('#fdcb6e').bold(' ⚠ ') + chalk.yellow(m)),
    err:  m => console.log(ts() + chalk.hex('#d63031').bold(' ✖ ') + chalk.red(m)),
    pair: code => {
        console.log('');
        console.log(chalk.hex('#fdcb6e').bold('  ╔' + '═'.repeat(46) + '╗'));
        console.log(chalk.hex('#fdcb6e').bold('  ║') + chalk.bgHex('#fdcb6e').black.bold('   🔑  PAIRING CODE — ENTER IN WHATSAPP      ') + chalk.hex('#fdcb6e').bold('║'));
        console.log(chalk.hex('#fdcb6e').bold('  ║') + chalk.white.bold(`       ★  ${code}  ★`.padEnd(47)) + chalk.hex('#fdcb6e').bold('║'));
        console.log(chalk.hex('#fdcb6e').bold('  ╚' + '═'.repeat(46) + '╝'));
        console.log('');
    },
};

const banner = () => {
    if (IS_CHILD) { L.info(`[Instance ${INST_ID}] Starting...`); return; }
    console.log('');
    console.log(chalk.hex('#00d4ff').bold('  ╔' + '═'.repeat(48) + '╗'));
    console.log(chalk.hex('#00d4ff').bold('  ║') + chalk.bgHex('#00d4ff').black.bold('   ⚡  L I A M   L I T E  v2  —  Mini Bot       ') + chalk.hex('#00d4ff').bold('║'));
    console.log(chalk.hex('#00d4ff').bold('  ╚' + '═'.repeat(48) + '╝'));
    console.log('');
    console.log(chalk.hex('#00b894')('  ◈') + chalk.bold(' Pair  : ') + chalk.hex('#74b9ff').underline(cfg().pairingSite));
    console.log(chalk.hex('#00b894')('  ◈') + chalk.bold(' Host  : ') + chalk.hex('#fdcb6e')(global._hostName));
    console.log('');
};

const ask = t => new Promise(r => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(t, a => { r(a.trim()); rl.close(); });
});

// ── Session ID restore — tries all sources ────────────────────────
const restoreSession = (sid, dir) => {
    if (!sid) return false;
    const raw = sid.startsWith('LIAM:~') ? sid.replace(/^LIAM:~/, '') : sid;
    // Validate: must be valid base64
    if (!/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g,''))) return false;
    try {
        const buf = Buffer.from(raw.replace(/\s/g,''), 'base64');
        if (buf.length < 100) return false; // too short = not valid creds
        fs.writeFileSync(path.join(dir, 'creds.json'), buf);
        return true;
    } catch(_) { return false; }
};

const clientstart = async () => {
    banner();

    const {
        default: makeWASocket,
        useMultiFileAuthState,
        fetchLatestBaileysVersion,
        DisconnectReason,
        makeCacheableSignalKeyStore,
        Browsers,
        delay,
        downloadContentFromMessage,
        jidNormalizedUser,
    } = await import('@whiskeysockets/baileys');

    fs.mkdirSync(SESSION_DIR, { recursive: true });

    // ── Session resolution priority ───────────────────────────────
    // 1. Already has creds.json → use it directly
    // 2. SESSION_ID env var (Render/Heroku/Railway deploy)
    // 3. settings.js sessionId
    // 4. Interactive: ask number OR paste session ID
    const hasCreds = () => fs.existsSync(path.join(SESSION_DIR, 'creds.json'));

    if (!hasCreds()) {
        // Try env first (panel deploys use this)
        const envSid = process.env.SESSION_ID || process.env.LIAM_SESSION_ID || '';
        if (envSid && envSid !== 'LIAM:~paste_here' && envSid.length > 20) {
            if (restoreSession(envSid, SESSION_DIR)) {
                L.ok('Session restored from env var');
            } else {
                L.warn('SESSION_ID env var invalid — trying settings.js...');
            }
        }

        // Try settings.js
        if (!hasCreds()) {
            const cfgSid = cfg().sessionId || '';
            if (cfgSid && cfgSid !== 'LIAM:~paste_here' && cfgSid.length > 20) {
                if (restoreSession(cfgSid, SESSION_DIR)) {
                    L.ok('Session restored from settings.js');
                } else {
                    L.warn('settings.js sessionId invalid or placeholder');
                }
            }
        }

        // Interactive fallback (Termux / local)
        if (!hasCreds() && !IS_CHILD) {
            if (process.stdin.isTTY) {
                console.log(chalk.hex('#00d4ff').bold('\n  ┌─ LIAM LITE SETUP ───────────────────'));
                console.log(chalk.hex('#74b9ff')('  │  1 — Enter phone number (pairing code)'));
                console.log(chalk.hex('#a29bfe')('  │  2 — Paste LIAM:~ session ID'));
                console.log(chalk.hex('#00d4ff').bold('  └──────────────────────────────────────\n'));
                const choice = await ask(chalk.hex('#fdcb6e').bold('  Choice (1/2): '));
                if (choice.trim() === '2') {
                    const raw = await ask(chalk.hex('#a29bfe').bold('  Paste LIAM:~ or base64: '));
                    if (!restoreSession(raw.trim(), SESSION_DIR)) { L.err('Invalid session ID'); process.exit(1); }
                    L.ok('Session saved — restarting');
                    return clientstart();
                } else {
                    // Will use pairing code below
                }
            } else {
                L.warn('No session found. Set SESSION_ID env var or add to settings.js sessionId');
                L.warn('Bot will wait 60s then exit...');
                await sleep(60000);
                process.exit(1);
            }
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version }          = await fetchLatestBaileysVersion();

    // Patch decodeJid
    const decodeJid = jid => {
        if (!jid) return jid;
        return /:\d+@/gi.test(jid) ? jidNormalizedUser(jid) : jid;
    };

    let pairNum     = null;
    let credsWritten = false;

    if (!state.creds.registered) {
        const envNum = process.env.PAIR_NUMBER || process.env.PHONE_NUMBER || '';
        if (envNum) {
            pairNum = envNum.replace(/\D/g, '');
        } else if (!IS_CHILD && process.stdin.isTTY) {
            const n = await ask(chalk.hex('#fdcb6e').bold('  Phone number (+254...): '));
            pairNum = n.replace(/\D/g, '');
            if (!pairNum || pairNum.length < 7) { L.err('Invalid number'); process.exit(1); }
        } else if (!hasCreds()) {
            L.warn('Not registered and no phone number. Set PAIR_NUMBER env var.');
            await sleep(60000); process.exit(1);
        }
    }

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, pino({ level:'silent' })),
        },
        logger:                   pino({ level:'silent' }),
        printQRInTerminal:        false,
        browser:                  Browsers.macOS('Safari'),
        syncFullHistory:          false,
        generateHighQualityLinkPreview: false,
        connectTimeoutMs:         20000,
        keepAliveIntervalMs:      8000,
        defaultQueryTimeoutMs:    4000,
        retryRequestDelayMs:      30,
        markOnlineOnConnect:      true,
        shouldSyncHistoryMessage: () => false,
        getMessage: async key => msgs.get(`${key.remoteJid}:${key.id}`)?.message || undefined,
    });

    sock.decodeJid = decodeJid;

    const msgs = new Map();

    sock.ev.on('creds.update', async () => { await saveCreds(); credsWritten = true; });

    // Pairing code request
    if (pairNum && !state.creds.registered) {
        await delay(1500);
        try {
            const code = await sock.requestPairingCode(pairNum);
            L.pair(code?.match(/.{1,4}/g)?.join('-') || code);
        } catch(e) { L.err('Pairing code failed: ' + e.message); }
    }

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (connection === 'open') {
            _restartCount = 0;
            const rawNum = (sock.user?.id || '').replace(/:\d+@.*/, '');
            const jid    = rawNum + '@s.whatsapp.net';
            const name   = sock.user?.name || 'User';
            const mem    = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

            L.ok(`LIAM LITE ONLINE — +${rawNum} (${name}) RAM:${mem}MB ${global._hostName}`);

            // Assign decodeJid on sock if not set
            if (!sock.decodeJid) sock.decodeJid = decodeJid;

            // Send session after pairing
            if (pairNum) {
                let waited = 0;
                while (!credsWritten && waited < 12000) { await sleep(150); waited += 150; }
                await sleep(400);
                const cp = path.join(SESSION_DIR, 'creds.json');
                if (fs.existsSync(cp)) {
                    const raw = fs.readFileSync(cp);
                    if (raw.length > 50) {
                        const sid = 'LIAM:~' + Buffer.from(raw).toString('base64');
                        await sock.sendMessage(jid, { text: sid }).catch(() => {});
                        await sleep(300);
                        await sock.sendMessage(jid, { text: `⚡ *LIAM LITE* — Session saved!\n\n✅ Copy LIAM:~ text above\n📌 Set as SESSION_ID env var on Render/Heroku\n  OR paste in settings/settings.js sessionId\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄` }).catch(() => {});
                    }
                }
                pairNum = null;
            }

            // Start update checker (main instance only, silent)
            if (!IS_CHILD) {
                try { updater.startChecker(sock); } catch(_) {}
            }

            sock.sendMessage(jid, {
                text: `⚡ *LIAM LITE* Online!\n👤 ${name}  🌍 ${cfg().status?.public?'Public':'Private'}  🖥️ ${global._hostName}\nbeen up for 0s, cool huh\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄`
            }).catch(() => {});

            // Notify parent if child instance
            if (IS_CHILD && process.send) {
                process.send({ type: 'ready', slot: INST_ID, num: rawNum });
            }
        }

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.message || '';

            if (code === DisconnectReason.loggedOut || reason.includes('logged out')) {
                L.err('Logged out. Delete sessions/ folder and restart.');
                if (IS_CHILD && process.send) process.send({ type: 'loggedout', slot: INST_ID });
                process.exit(1);
            }
            if (_restartPending) return;
            _restartPending = true;
            _restartCount++;
            const d = _restartDelay();
            L.warn(`Reconnecting in ${(d/1000).toFixed(1)}s (attempt ${_restartCount})`);
            setTimeout(() => {
                _restartPending = false;
                try { sock.ev.removeAllListeners(); } catch(_) {}
                try { sock.end(undefined); } catch(_) {}
                if (_restartCount > 15) { L.err('Max reconnects reached — restarting process'); process.exit(1); }
                clientstart().catch(() => setTimeout(() => process.exit(1), 2000));
            }, d);
        }
    });

    // ── messages.upsert ────────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            const mek = messages[0];
            if (!mek?.message) return;

            // Unwrap ephemeral/viewOnce
            if (mek.message.ephemeralMessage) mek.message = mek.message.ephemeralMessage.message;

            // Cache
            if (mek.key?.remoteJid && mek.key?.id)
                msgs.set(`${mek.key.remoteJid}:${mek.key.id}`, mek);

            // ── Status ──────────────────────────────────────────────
            if (mek.key?.remoteJid === 'status@broadcast') {
                const f = cfg().features || {};
                const participant = mek.key.participant || mek.key.remoteJid;
                setImmediate(() => {
                    if (f.autoviewstatus)
                        sock.readMessages([mek.key]).catch(() => {});
                    if (f.autoreactstatus && participant) {
                        const pool = cfg().statusReactEmojis || ['😍','🔥','💯'];
                        sock.sendMessage('status@broadcast',
                            { react: { text: pool[~~(Math.random()*pool.length)], key: mek.key } },
                            { statusJidList: [participant] }
                        ).catch(() => {});
                    }
                });
                if (f.autosavestatus) {
                    const mime = mek.message?.imageMessage?.mimetype || mek.message?.videoMessage?.mimetype || '';
                    if (mime) {
                        try {
                            const buf = await sock.downloadMediaMessage(mek);
                            const ownerJid = (sock.user?.id||'').split(':')[0].split('@')[0] + '@s.whatsapp.net';
                            if (mime.includes('video'))
                                sock.sendMessage(ownerJid,{video:buf,caption:'💾 Auto-saved status'}).catch(()=>{});
                            else
                                sock.sendMessage(ownerJid,{image:buf,caption:'💾 Auto-saved status'}).catch(()=>{});
                        } catch(_) {}
                    }
                }
                return;
            }

            if (!sock.public && !mek.key.fromMe && type === 'notify') return;

            const { smsg } = require('./library/serialize');
            const m = await smsg(sock, mek, {
                loadMessage: async (jid, id) => msgs.get(`${jid}:${id}`) || null
            });
            if (!m) return;

            require('./message')(sock, m, { messages, type });
        } catch(e) {
            if (!IGNORED.some(x => String(e).includes(x))) console.error('[MSG]', e.message);
        }
    });

    // ── Anti-delete ────────────────────────────────────────────────
    sock.ev.on('messages.update', async updates => {
        const f = cfg().features || {};
        if (!f.antidelete) return;
        const ownerJid = (sock.user?.id||'').split(':')[0].split('@')[0] + '@s.whatsapp.net';

        for (const { key, update } of updates) {
            const isRevoke = update?.messageStubType === 1 || update?.message?.protocolMessage?.type === 0;
            if (!isRevoke) continue;
            const del = msgs.get(`${key.remoteJid}:${key.id}`);
            if (!del?.message) continue;
            const num  = (key.participant||key.remoteJid).split('@')[0].replace(/:\d+/,'');
            const name = del.pushName || `+${num}`;
            const type = Object.keys(del.message)[0];
            const hdr  = `🗑️ *Deleted!*\n👤 ${name}\n📅 ${new Date().toLocaleString()}`;
            try {
                if (type === 'conversation' || type === 'extendedTextMessage') {
                    const txt = del.message.conversation || del.message.extendedTextMessage?.text || '';
                    const a = await sock.sendMessage(ownerJid,{text:hdr}).catch(()=>null);
                    if (a && txt) sock.sendMessage(ownerJid,{text:`💬 "${txt}"`},{quoted:a}).catch(()=>{});
                } else if (type === 'imageMessage') {
                    const buf = await sock.downloadMediaMessage(del).catch(()=>null);
                    const cap = del.message.imageMessage?.caption || '';
                    buf ? sock.sendMessage(ownerJid,{image:buf,caption:hdr+(cap?`\n"${cap}"`:'')}):sock.sendMessage(ownerJid,{text:hdr+'\n🖼️ [img]'});
                } else if (type === 'videoMessage') {
                    const buf = await sock.downloadMediaMessage(del).catch(()=>null);
                    buf ? sock.sendMessage(ownerJid,{video:buf,caption:hdr}):sock.sendMessage(ownerJid,{text:hdr+'\n🎥 [vid]'});
                } else { sock.sendMessage(ownerJid,{text:hdr+`\n[${type}]`}); }
            } catch(_) {}
        }
    });

    // ── Welcome ────────────────────────────────────────────────────
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        if (!cfg().features?.welcome) return;
        try {
            const meta = await sock.groupMetadata(id);
            for (const jid of participants) {
                const n = jid.split('@')[0];
                const txt = action === 'add'
                    ? `👋 Welcome @${n} to *${meta.subject}*!\n👥 ${meta.participants.length} members\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄`
                    : `👋 Goodbye @${n}!\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄`;
                sock.sendMessage(id,{text:txt,mentions:[jid]}).catch(()=>{});
            }
        } catch(_) {}
    });

    // ── Anti-call ──────────────────────────────────────────────────
    sock.ev.on('call', async calls => {
        if (!cfg().features?.anticall) return;
        for (const call of calls) {
            if (call.status === 'offer') {
                await sock.rejectCall(call.id, call.from).catch(()=>{});
                sock.sendMessage(call.from,{text:`📵 Auto-rejected.\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄`}).catch(()=>{});
            }
        }
    });

    // ── Contacts update (stable presence) ─────────────────────────
    sock.ev.on('contacts.update', updates => {
        for (const c of updates) {
            if (c?.id) sock.presenceSubscribe(c.id).catch(()=>{});
        }
    });

    // ── Always Online ──────────────────────────────────────────────
    setInterval(() => {
        if (cfg().features?.alwaysonline) sock.sendPresenceUpdate('available').catch(()=>{});
    }, 12000);

    // ── Long-term stability: memory cleanup every 6h ─────────────────────
    setInterval(() => {
        if (msgs.size > 500) {
            const keys = [...msgs.keys()].slice(0, msgs.size - 500);
            keys.forEach(k => msgs.delete(k));
        }
        if (global.gc) try { global.gc(); } catch(_) {}
        console.log('[HEALTH] uptime=' + Math.round(process.uptime()/3600) + 'h mem=' + Math.round(process.memoryUsage().heapUsed/1024/1024) + 'MB');
    }, 6 * 60 * 60 * 1000);

    // ── Keep-alive ping for hosted platforms (Render/Heroku/Railway) ───────
    if (process.env.RENDER || process.env.HEROKU_APP_NAME || process.env.RAILWAY_PROJECT_ID) {
        setInterval(() => {
            sock.sendPresenceUpdate('available').catch(()=>{});
        }, 4 * 60 * 1000);
    }

    sock.public = cfg().status?.public ?? true;

    sock.downloadMediaMessage = async msg => {
        const m    = msg.msg || msg;
        const mime = m.mimetype || '';
        const type = msg.mtype ? msg.mtype.replace(/Message$/i,'') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(m, type);
        let buf = Buffer.from([]);
        for await (const c of stream) buf = Buffer.concat([buf, c]);
        return buf;
    };

    sock.sendText = (jid, text, q) => sock.sendMessage(jid, { text }, { quoted: q });

    return sock;
};

clientstart();
