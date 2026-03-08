// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ⚡  LIAM LITE — Ultra-Fast Mini WhatsApp Bot                          ║
// ║  © 2025 Liam — All Rights Reserved                                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
if (!process.env.LIAM_INSTANCE_ID) console.clear();

const fs       = require('fs');
const path     = require('path');
const pino     = require('pino');
const chalk    = require('chalk');
const readline = require('readline');
const { Boom } = require('@hapi/boom');
const os       = require('os');

const cfg   = () => require('./settings/config');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const IGNORED = ['Socket connection timeout','EKEYTYPE','item-not-found','rate-overlimit',
    'Connection Closed','Timed Out','Value not found','Bad MAC','unexpected server response',
    'write EPIPE','read ECONNRESET','Stream Errored'];
process.on('uncaughtException',  e => { if (!IGNORED.some(x => String(e).includes(x))) console.error(e); });
process.on('unhandledRejection', e => { if (!IGNORED.some(x => String(e).includes(x))) {} });

let _restartPending = false, _restartCount = 0;
const _restartDelay = () => Math.min(1500 * Math.pow(1.4, _restartCount), 20000);

const detectHost = () => {
    if (process.env.HEROKU_APP_NAME || process.env.DYNO)                          return '🟣 Heroku';
    if (process.env.RENDER || process.env.RENDER_SERVICE_NAME)                     return '🟦 Render';
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID)         return '🚂 Railway';
    if (process.env.TERMUX_VERSION || (process.env.PREFIX||'').includes('termux')) return '📱 Termux';
    if (process.env.KOYEB_INSTANCE_ID)                                             return '🟠 Koyeb';
    if (process.env.FLY_APP_NAME)                                                  return '🪁 Fly.io';
    if (process.env.CYCLIC_URL)                                                    return '🟢 Cyclic';
    return '🖥️ VPS/Local';
};
global._hostName = detectHost();

const SESSION_DIR = process.env.LIAM_SESSION_DIR || path.join(__dirname, 'sessions', 'main');

const ts = () => chalk.hex('#636e72')(`[${new Date().toLocaleTimeString('en-US',{hour12:false})}]`);
const L = {
    info: m => console.log(ts() + chalk.hex('#00d4ff').bold(' ◆ ') + chalk.white(m)),
    ok:   m => console.log(ts() + chalk.hex('#00b894').bold(' ✔ ') + chalk.greenBright(m)),
    warn: m => console.log(ts() + chalk.hex('#fdcb6e').bold(' ⚠ ') + chalk.yellow(m)),
    err:  m => console.log(ts() + chalk.hex('#d63031').bold(' ✖ ') + chalk.red(m)),
    pair: code => {
        console.log('');
        console.log(chalk.hex('#fdcb6e').bold('  ╔' + '═'.repeat(46) + '╗'));
        console.log(chalk.hex('#fdcb6e').bold('  ║') + chalk.bgHex('#fdcb6e').black.bold('  🔑  PAIRING CODE — ENTER IN WHATSAPP       ') + chalk.hex('#fdcb6e').bold('║'));
        console.log(chalk.hex('#fdcb6e').bold('  ║') + chalk.white.bold(`       ★  ${code}  ★`.padEnd(48)) + chalk.hex('#fdcb6e').bold('║'));
        console.log(chalk.hex('#fdcb6e').bold('  ╚' + '═'.repeat(46) + '╝'));
        console.log('');
    },
};

const banner = () => {
    console.log('');
    console.log(chalk.hex('#00d4ff').bold('  ╔' + '═'.repeat(48) + '╗'));
    console.log(chalk.hex('#00d4ff').bold('  ║') + chalk.bgHex('#00d4ff').black.bold('   ⚡  L I A M   L I T E   —   Mini Bot         ') + chalk.hex('#00d4ff').bold('║'));
    console.log(chalk.hex('#00d4ff').bold('  ║') + chalk.hex('#a29bfe')('       Fast Commands • 10 Sessions • No Bloat     ') + chalk.hex('#00d4ff').bold('║'));
    console.log(chalk.hex('#00d4ff').bold('  ╚' + '═'.repeat(48) + '╝'));
    console.log('');
    console.log(chalk.hex('#00b894')('  ◈') + chalk.bold(' Pair   : ') + chalk.hex('#74b9ff').underline(cfg().pairingSite || 'https://liam-scanner.onrender.com/pair'));
    console.log(chalk.hex('#00b894')('  ◈') + chalk.bold(' Host   : ') + chalk.hex('#fdcb6e')(global._hostName));
    console.log('');
};

const ask = t => new Promise(r => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(t, a => { r(a.trim()); rl.close(); });
});

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

    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

    // Restore session from env or settings
    const envSid = process.env.SESSION_ID || process.env.LIAM_SESSION_ID || '';
    const cfgSid = cfg().sessionId || '';
    const hasCreds = fs.existsSync(path.join(SESSION_DIR, 'creds.json'));

    if (!hasCreds) {
        const sid = envSid || cfgSid;
        if (sid && sid.startsWith('LIAM:~')) {
            try {
                fs.writeFileSync(path.join(SESSION_DIR, 'creds.json'), Buffer.from(sid.replace(/^LIAM:~/, ''), 'base64'));
                L.ok('Session restored');
                return clientstart();
            } catch(e) { L.err('Session restore failed: ' + e.message); }
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version }          = await fetchLatestBaileysVersion();

    let pairNum = null;

    if (!state.creds.registered) {
        const envNum = process.env.PAIR_NUMBER || process.env.PHONE_NUMBER || '';
        if (envNum) {
            pairNum = envNum.replace(/\D/g, '');
        } else if (process.stdin.isTTY) {
            console.log(chalk.hex('#00d4ff').bold('\n  ┌─ LIAM LITE SETUP ──────────────────'));
            console.log(chalk.hex('#74b9ff')('  │  1 — Phone number (pairing code)'));
            console.log(chalk.hex('#a29bfe')('  │  2 — Paste Session ID'));
            console.log(chalk.hex('#00d4ff').bold('  └────────────────────────────────────\n'));
            const choice = await ask(chalk.hex('#fdcb6e').bold('  Choice (1/2): '));
            if (choice === '2') {
                const raw = await ask(chalk.hex('#a29bfe').bold('  Paste LIAM:~ ID: '));
                if (!raw || !raw.startsWith('LIAM:~')) { L.err('Invalid session ID'); process.exit(1); }
                fs.writeFileSync(path.join(SESSION_DIR, 'creds.json'), Buffer.from(raw.replace(/^LIAM:~/, ''), 'base64'));
                L.ok('Session saved'); return clientstart();
            } else {
                const n = await ask(chalk.hex('#fdcb6e').bold('  Phone (+254...): '));
                pairNum = n.replace(/\D/g, '');
                if (!pairNum || pairNum.length < 7) { L.err('Invalid number'); process.exit(1); }
            }
        } else {
            L.warn('No session configured. Set SESSION_ID env var.');
            await sleep(30000); process.exit(1);
        }
    }

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        logger:               pino({ level: 'silent' }),
        printQRInTerminal:    false,
        browser:              Browsers.macOS('Safari'),
        syncFullHistory:      false,
        generateHighQualityLinkPreview: false,
        connectTimeoutMs:     20000,
        keepAliveIntervalMs:  8000,
        defaultQueryTimeoutMs: 4000,
        retryRequestDelayMs:  30,
        emitOwnEvents:        true,
        fireInitQueries:      true,
        getMessage: async (key) => msgs.get(`${key.remoteJid}:${key.id}`)?.message || undefined,
    });

    // Patch decodeJid onto sock so serialize.js works
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const dec = jidNormalizedUser(jid);
            return dec;
        }
        return jid;
    };

    const msgs      = new Map();
    const mediaCache = new Map();
    let credsWritten = false;

    sock.ev.on('creds.update', async () => { await saveCreds(); credsWritten = true; });

    if (pairNum && !state.creds.registered) {
        await delay(1200);
        try {
            const code = await sock.requestPairingCode(pairNum);
            L.pair(code?.match(/.{1,4}/g)?.join('-') || code);
        } catch (e) { L.err('Pairing code failed: ' + e.message); }
    }

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
            _restartCount = 0;
            const rawNum = (sock.user?.id || '').replace(/:\d+@.*/, '');
            const jid    = rawNum + '@s.whatsapp.net';
            const name   = sock.user?.name || 'User';
            const mem    = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
            console.log('');
            L.ok(`LIAM LITE ONLINE — +${rawNum} (${name})  RAM:${mem}MB  ${global._hostName}`);
            console.log('');

            // Send session ID after pairing
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
                        await sock.sendMessage(jid, { text: `⚡ *LIAM LITE* — Session Ready!\n\n✅ Copy LIAM:~ text above\n📌 Paste in settings/settings.js\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄` }).catch(() => {});
                    }
                }
                pairNum = null;
            }

            sock.sendMessage(jid, {
                text: `⚡ *LIAM LITE* is Online!\n\n👤 ${name}\n🌍 ${cfg().status?.public ? 'Public' : 'Private'}\n🖥️ ${global._hostName}\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄`
            }).catch(() => {});
        }

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code === DisconnectReason.loggedOut) {
                L.err('Logged out. Delete sessions/ folder and restart.');
                process.exit(1);
            }
            if (_restartPending) return;
            _restartPending = true; _restartCount++;
            const d = _restartDelay();
            L.warn(`Reconnecting in ${(d/1000).toFixed(1)}s… (attempt ${_restartCount})`);
            setTimeout(() => {
                _restartPending = false;
                try { sock.ev.removeAllListeners(); } catch(_) {}
                try { sock.end(undefined); } catch(_) {}
                if (_restartCount > 12) { process.exit(1); }
                clientstart().catch(() => setTimeout(() => process.exit(1), 1000));
            }, d);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            const mek = messages[0];
            if (!mek?.message) return;

            // Unwrap ephemeral
            if (mek.message.ephemeralMessage)
                mek.message = mek.message.ephemeralMessage.message;

            // Cache message
            if (mek.key?.remoteJid && mek.key?.id)
                msgs.set(`${mek.key.remoteJid}:${mek.key.id}`, mek);

            // ── Status auto-view / react ──────────────────────────────
            if (mek.key?.remoteJid === 'status@broadcast') {
                const f = cfg().features || {};
                if (f.autoviewstatus) sock.readMessages([mek.key]).catch(() => {});
                if (f.autoreactstatus) {
                    const pool = cfg().statusReactEmojis || ['😍','🔥','💯'];
                    sock.sendMessage('status@broadcast',
                        { react: { text: pool[~~(Math.random()*pool.length)], key: mek.key } },
                        { statusJidList: [mek.key.participant || mek.key.remoteJid] }
                    ).catch(() => {});
                }
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

            // Skip non-notify in private mode
            if (!sock.public && !mek.key.fromMe && type === 'notify') return;

            const { smsg } = require('./library/serialize');
            const store = {
                loadMessage: async (jid, id) => msgs.get(`${jid}:${id}`) || null
            };
            const m = await smsg(sock, mek, store);
            if (!m) return;

            require('./message')(sock, m, { messages, type });
        } catch(e) { if (!IGNORED.some(x => String(e).includes(x))) console.error(e); }
    });

    // ── Anti-delete ────────────────────────────────────────────────
    sock.ev.on('messages.update', async updates => {
        const f = cfg().features || {};
        if (!f.antidelete) return;
        // Send to the LINKED phone number (bot's own connected number DM)
        const ownerRaw = (sock.user?.id || '').split(':')[0].split('@')[0];
        const ownerJid = ownerRaw + '@s.whatsapp.net';

        for (const { key, update } of updates) {
            const isRevoke =
                update?.messageStubType === 1 ||
                update?.message?.protocolMessage?.type === 0;
            if (!isRevoke) continue;

            const del = msgs.get(`${key.remoteJid}:${key.id}`);
            if (!del?.message) continue;

            const num     = (key.participant || key.remoteJid).split('@')[0].replace(/:\d+/,'');
            const name    = del.pushName || `+${num}`;
            const msgType = Object.keys(del.message)[0];
            const hdr     = `🚨 *DELETED!*\n\n👤 *From:* ${name}\n📅 ${new Date().toLocaleString()}`;

            try {
                if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
                    const txt = del.message.conversation || del.message.extendedTextMessage?.text || '';
                    const alert = await sock.sendMessage(ownerJid, { text: hdr }).catch(()=>null);
                    if (alert && txt) sock.sendMessage(ownerJid, { text: `💬 "${txt}"` }, { quoted: alert }).catch(()=>{});
                } else if (msgType === 'imageMessage') {
                    const buf = await sock.downloadMediaMessage(del).catch(() => null);
                    const cap = del.message.imageMessage?.caption || '';
                    if (buf) sock.sendMessage(ownerJid, { image: buf, caption: hdr + (cap ? `\n\n📝 "${cap}"` : '') }).catch(()=>{});
                    else sock.sendMessage(ownerJid, { text: hdr + '\n\n🖼️ [Image]' }).catch(()=>{});
                } else if (msgType === 'videoMessage') {
                    const buf = await sock.downloadMediaMessage(del).catch(() => null);
                    if (buf) sock.sendMessage(ownerJid, { video: buf, caption: hdr }).catch(()=>{});
                    else sock.sendMessage(ownerJid, { text: hdr + '\n\n🎥 [Video]' }).catch(()=>{});
                } else if (msgType === 'audioMessage') {
                    const buf = await sock.downloadMediaMessage(del).catch(() => null);
                    if (buf) sock.sendMessage(ownerJid, { audio: buf, mimetype: 'audio/mp4' }, { quoted: { key: ownerJid } }).catch(()=>{});
                    else sock.sendMessage(ownerJid, { text: hdr + '\n\n🎵 [Audio]' }).catch(()=>{});
                } else if (msgType === 'stickerMessage') {
                    const buf = await sock.downloadMediaMessage(del).catch(() => null);
                    if (buf) sock.sendMessage(ownerJid, { sticker: buf }).catch(()=>{});
                    else sock.sendMessage(ownerJid, { text: hdr + '\n\n🗒️ [Sticker]' }).catch(()=>{});
                } else {
                    sock.sendMessage(ownerJid, { text: hdr + `\n\n[${msgType}]` }).catch(()=>{});
                }
            } catch(_) {}
        }
    });

    // ── Welcome / Goodbye ──────────────────────────────────────────
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        if (!cfg().features?.welcome) return;
        try {
            const meta = await sock.groupMetadata(id);
            for (const jid of participants) {
                const n = jid.split('@')[0];
                if (action === 'add')
                    sock.sendMessage(id, {
                        text: `👋 Welcome @${n} to *${meta.subject}*!\n👥 Members: ${meta.participants.length}\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄`,
                        mentions: [jid]
                    }).catch(() => {});
                else if (action === 'remove')
                    sock.sendMessage(id, {
                        text: `👋 Goodbye @${n}!\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄`,
                        mentions: [jid]
                    }).catch(() => {});
            }
        } catch(_) {}
    });

    // ── Anti-call ──────────────────────────────────────────────────
    sock.ev.on('call', async calls => {
        if (!cfg().features?.anticall) return;
        for (const call of calls) {
            if (call.status === 'offer') {
                await sock.rejectCall(call.id, call.from).catch(() => {});
                sock.sendMessage(call.from, { text: `📵 Auto-rejected call.\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄` }).catch(() => {});
            }
        }
    });

    // ── Always Online ──────────────────────────────────────────────
    setInterval(() => {
        const f = cfg().features || {};
        if (f.alwaysonline) sock.sendPresenceUpdate('available').catch(() => {});
    }, 12000);

    sock.public = cfg().status?.public ?? true;

    sock.downloadMediaMessage = async msg => {
        const mime   = (msg.msg || msg).mimetype || '';
        const type   = msg.mtype ? msg.mtype.replace(/Message$/i, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(msg.msg || msg, type);
        let buf = Buffer.from([]);
        for await (const c of stream) buf = Buffer.concat([buf, c]);
        return buf;
    };

    sock.sendText = (jid, text, q) => sock.sendMessage(jid, { text }, { quoted: q });

    return sock;
};

clientstart();
