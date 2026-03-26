// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  👁️  LIAM LITE — Ultra-Fast Mini WhatsApp Bot                         ║
// ║  © 2025 Liam — All Rights Reserved                                     ║
// ║  50 Commands • 10 Max Sessions • No Image Bloat • Blazing Fast         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
if (!process.env.LIAM_INSTANCE_ID) console.clear();

const fs       = require('fs');
const path     = require('path');
const pino     = require('pino');
const chalk    = require('chalk');
const readline = require('readline');
const FileType = require('file-type');
const { Boom } = require('@hapi/boom');
const os       = require('os');

const cfg   = () => require('./settings/config');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const IGNORED = ['Socket connection timeout','EKEYTYPE','item-not-found','rate-overlimit',
    'Connection Closed','Timed Out','Value not found','Bad MAC','unexpected server response',
    'write EPIPE','read ECONNRESET'];
process.on('uncaughtException',  e => { if (!IGNORED.some(x => String(e).includes(x))) console.error(e); });
process.on('unhandledRejection', e => { if (!IGNORED.some(x => String(e).includes(x))) {} });

let _restartPending = false, _restartCount = 0;
const _restartDelay = () => Math.min(3000 * Math.pow(1.5, _restartCount), 30000);

// Host Detection
const detectHost = () => {
    const env = process.env;
    const cwd = process.cwd();
    const home = env.HOME || '';

    // Cloud platforms
    if (env.HEROKU_APP_NAME || env.DYNO)                            return '🟣 Heroku';
    if (env.RENDER || env.RENDER_SERVICE_NAME || env.RENDER_INTERNAL_HOSTNAME) return '🟦 Render';
    if (env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID)          return '🚂 Railway';
    if (env.KOYEB_INSTANCE_ID)                                      return '🟠 Koyeb';
    if (env.FLY_APP_NAME)                                           return '🪁 Fly.io';
    if (env.CYCLIC_URL)                                             return '🟢 Cyclic';
    if (env.VERCEL)                                                 return '▲ Vercel';
    if (env.AWS_LAMBDA_FUNCTION_NAME || env.AWS_REGION)            return '🟡 AWS';
    if (env.GOOGLE_CLOUD_PROJECT || env.GCLOUD_PROJECT)            return '🔵 Google Cloud';
    if (env.REPL_ID || env.REPLIT_CLUSTER || env.REPLIT_DB_URL)   return '🔵 Replit';

    // Panel hosting (Pterodactyl / bot-hosting.net / similar)
    if (env.PTERODACTYL_NODE || env.P_SERVER_UUID || env.SERVER_MEMORY) return '🦅 Pterodactyl Panel';
    if (home.includes('/container') || cwd.includes('/container'))  return '📦 Bot-Hosting Panel';
    if (home.includes('/home/container'))                           return '📦 Bot-Hosting.net';
    if (env.PANEL_HOST || env.BOT_PANEL)                           return '📦 Bot Panel';

    // Mobile / local
    if (env.TERMUX_VERSION || (env.PREFIX||'').includes('termux')) return '📱 Termux';

    // Generic detection (no TTY = likely some kind of server/panel)
    const knownEnvs = ['HEROKU','RENDER','RAILWAY','KOYEB','FLY','CYCLIC','VERCEL','REPL'];
    const hasCloudEnv = Object.keys(env).some(k => knownEnvs.some(h => k.startsWith(h)));
    if (!hasCloudEnv && !process.stdin.isTTY)                      return '🖥️ Hosting Panel';

    return '🖥️ VPS / Local';
};
global._hostName = detectHost();

const SESSION_DIR = process.env.LIAM_SESSION_DIR || path.join(__dirname, 'sessions', 'main');

const ts = () => chalk.hex('#636e72')(`[${new Date().toLocaleTimeString('en-US', { hour12: false })}]`);
const L = {
    info: m => console.log(ts() + chalk.hex('#00d4ff').bold(' ◆ ') + chalk.white(m)),
    ok:   m => console.log(ts() + chalk.hex('#00b894').bold(' ✔ ') + chalk.greenBright(m)),
    warn: m => console.log(ts() + chalk.hex('#fdcb6e').bold(' ⚠ ') + chalk.yellow(m)),
    err:  m => console.log(ts() + chalk.hex('#d63031').bold(' ✖ ') + chalk.red(m)),
    pair: code => {
        console.log('');
        console.log(chalk.hex('#fdcb6e').bold('  ╔' + '═'.repeat(48) + '╗'));
        console.log(chalk.hex('#fdcb6e').bold('  ║') + chalk.bgHex('#fdcb6e').black.bold('   🔑  PAIRING CODE — ENTER IN WHATSAPP         ') + chalk.hex('#fdcb6e').bold('║'));
        console.log(chalk.hex('#fdcb6e').bold('  ║') + chalk.white.bold(`       ★  ${code}  ★`.padEnd(50)) + chalk.hex('#fdcb6e').bold('║'));
        console.log(chalk.hex('#fdcb6e').bold('  ╚' + '═'.repeat(48) + '╝'));
        console.log('');
    },
};

const banner = () => {
    const W = 50;
    console.log('');
    console.log(chalk.hex('#00d4ff').bold('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk.hex('#00d4ff').bold('  ║') + chalk.bgHex('#00d4ff').black.bold('   ⚡  L I A M   L I T E   —   Mini Bot           ') + chalk.hex('#00d4ff').bold('║'));
    console.log(chalk.hex('#00d4ff').bold('  ║') + chalk.hex('#a29bfe')('       50 Commands • 10 Sessions • Ultra-Fast       ') + chalk.hex('#00d4ff').bold('║'));
    console.log(chalk.hex('#00d4ff').bold('  ╚' + '═'.repeat(W) + '╝'));
    console.log('');
    console.log(chalk.hex('#00b894')('  ◈') + chalk.bold(' Pair Site : ') + chalk.hex('#74b9ff').underline(cfg().pairingSite || 'https://liam-scanner.onrender.com/pair'));
    console.log(chalk.hex('#00b894')('  ◈') + chalk.bold(' Host      : ') + chalk.hex('#fdcb6e')(global._hostName));
    console.log('');
};

const ask = t => new Promise(r => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(t, a => { r(a.trim()); rl.close(); });
});


// ══════════════════════════════════════════════════════════════════════════════
// ── GitHub Fork + Star Gate ───────────────────────────────────────────────────
const _ghCheck = async () => {
    const s = cfg();
    if (!s.githubGate) return;
    const username = (s.githubUsername || process.env.GITHUB_USERNAME || '').trim();
    if (!username) {
        console.log('');
        console.log(chalk.bgRed.white.bold('  ╔══════════════════════════════════════════════════════╗  '));
        console.log(chalk.bgRed.white.bold('  ║  🔐  GITHUB GATE — SETUP REQUIRED                   ║  '));
        console.log(chalk.bgRed.white.bold('  ╚══════════════════════════════════════════════════════╝  '));
        console.log('');
        console.log(chalk.yellow('  To deploy LIAM LITE you must:'));
        console.log(chalk.cyan(`  1. Fork  → https://github.com/${s.githubOwner || 'Dialmw'}/${s.githubRepo || 'LIAM-LITE'}`));
        console.log(chalk.cyan(`  2. Star  → https://github.com/${s.githubOwner || 'Dialmw'}/${s.githubRepo || 'LIAM-LITE'}`));
        console.log(chalk.yellow('  3. Set githubUsername in settings.js  OR  env: GITHUB_USERNAME=yourname'));
        console.log('');
        process.exit(1);
    }
    const owner = s.githubOwner || 'Dialmw';
    const repo  = s.githubRepo  || 'LIAM-LITE';
    const hdrs  = { 'User-Agent': 'LIAM-LITE-Bot', Accept: 'application/vnd.github.v3+json' };
    let forked = false, starred = false;
    try {
        const r = await require('axios').get(`https://api.github.com/repos/${username}/${repo}`, { headers: hdrs, timeout: 10000 });
        if (r.data?.fork === true && r.data?.parent?.full_name === `${owner}/${repo}`) forked = true;
    } catch (_) {}
    for (let page = 1; page <= 3 && !starred; page++) {
        try {
            const r = await require('axios').get(
                `https://api.github.com/repos/${owner}/${repo}/stargazers?per_page=100&page=${page}`,
                { headers: { ...hdrs, Accept: 'application/vnd.github.v3.star+json' }, timeout: 10000 }
            );
            if (!r.data?.length) break;
            if (r.data.some(u => u?.user?.login?.toLowerCase() === username.toLowerCase())) starred = true;
        } catch (_) { break; }
    }
    if (!forked || !starred) {
        console.log('');
        console.log(chalk.bgRed.white.bold('  ╔══════════════════════════════════════════════════════╗  '));
        console.log(chalk.bgRed.white.bold('  ║  🔐  GITHUB GATE — REQUIREMENTS NOT MET             ║  '));
        console.log(chalk.bgRed.white.bold('  ╚══════════════════════════════════════════════════════╝  '));
        console.log('');
        console.log(chalk.white(`  GitHub: ${chalk.cyan(username)}  ·  Repo: ${chalk.cyan(`https://github.com/${owner}/${repo}`)}`));
        console.log('');
        console.log(chalk.white(`  Fork : ${forked  ? chalk.green('✅ Done') : chalk.red('❌ Fork the repo first!')}`));
        console.log(chalk.white(`  Star : ${starred ? chalk.green('✅ Done') : chalk.red('❌ Star the repo first!')}`));
        console.log('');
        console.log(chalk.yellow(`  Go to: https://github.com/${owner}/${repo}`));
        console.log('');
        process.exit(1);
    }
    console.log(chalk.green(`  ✔ GitHub gate: @${username} — fork ✅  star ✅`));
};

const clientstart = async () => {
    banner();
    await _ghCheck();

    const {
        default: makeWASocket,
        useMultiFileAuthState,
        fetchLatestBaileysVersion,
        DisconnectReason,
        makeCacheableSignalKeyStore,
        Browsers,
        delay,
        downloadContentFromMessage,
        jidDecode,
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
            console.log(chalk.hex('#00d4ff').bold('\n  ┌─ LIAM LITE SETUP ───────────────────'));
            console.log(chalk.hex('#74b9ff')('  │  1 — Phone number (get pairing code)'));
            console.log(chalk.hex('#a29bfe')('  │  2 — Paste Session ID'));
            console.log(chalk.hex('#00d4ff').bold('  └─────────────────────────────────────\n'));
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
            L.warn('No session configured. Set SESSION_ID or PAIR_NUMBER env var.');
            await sleep(60000); process.exit(1);
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
        connectTimeoutMs:     25000,
        keepAliveIntervalMs:  10000,
        defaultQueryTimeoutMs: 5000,
        retryRequestDelayMs:  50,
        getMessage: async (key) => msgs.get(`${key.remoteJid}:${key.id}`)?.message || undefined,
    });

    const msgs = new Map();
    let credsWritten = false;

    sock.ev.on('creds.update', async () => { await saveCreds(); credsWritten = true; });

    if (pairNum && !state.creds.registered) {
        await delay(1500);
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
            console.log(chalk.hex('#00b894').bold(`  ✅  LIAM LITE ONLINE — +${rawNum} (${name})  RAM: ${mem}MB  Host: ${global._hostName}`));
            // Store linked number globally for antidelete targeting
            global._linkedJid = rawNum + '@s.whatsapp.net';
            global._linkedNum = rawNum;
            console.log('');

            // Send session ID after pairing
            if (pairNum) {
                let waited = 0;
                while (!credsWritten && waited < 15000) { await sleep(200); waited += 200; }
                await sleep(500);
                const cp = path.join(SESSION_DIR, 'creds.json');
                if (fs.existsSync(cp)) {
                    const raw = fs.readFileSync(cp);
                    if (raw.length > 50) {
                        const sid = 'LIAM:~' + Buffer.from(raw).toString('base64');
                        await sock.sendMessage(jid, { text: sid }).catch(() => {});
                        await sleep(500);
                        await sock.sendMessage(jid, { text: `⚡ *LIAM LITE* — Session Ready!\n\n✅ Copy the LIAM:~ text above\n📌 Paste in settings/settings.js\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄 👁️` }).catch(() => {});
                    }
                }
                pairNum = null;
            }

            // Online notification
            sock.sendMessage(jid, {
                text: `⚡ *LIAM LITE* is Online!\n\n👤 ${name}\n🌍 ${cfg().status?.public ? 'Public' : 'Private'} mode\n🖥️ ${global._hostName}\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄 👁️`
            }).catch(() => {});
        }

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code !== DisconnectReason.loggedOut) {
                if (_restartPending) return;
                _restartPending = true; _restartCount++;
                const d = _restartDelay();
                L.warn(`Reconnecting in ${(d/1000).toFixed(1)}s…`);
                setTimeout(() => {
                    _restartPending = false;
                    try { sock.ev.removeAllListeners(); } catch(_) {}
                    try { sock.end(undefined); } catch(_) {}
                    if (_restartCount > 10) { process.exit(1); }
                    clientstart().catch(() => setTimeout(() => process.exit(1), 1000));
                }, d);
            } else {
                L.err('Logged out. Delete sessions/ and restart.');
                process.exit(1);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            const mek = messages[0];
            if (!mek?.message) return;
            if (Object.keys(mek.message)[0] === 'ephemeralMessage')
                mek.message = mek.message.ephemeralMessage.message;
            if (mek.key?.remoteJid && mek.key?.id) {
                msgs.set(`${mek.key.remoteJid}:${mek.key.id}`, mek);


            }

            // Status auto-view/react
            if (mek.key?.remoteJid === 'status@broadcast') {
                const f = cfg().features || {};
                if (f.autoviewstatus) sock.readMessages([mek.key]).catch(() => {});
                if (f.autoreactstatus) {
                    const pool = cfg().statusReactEmojis || ['😍','🔥','💯','😘','🤩','❤️','👀','✨','🎯'];
                    const emoji = pool[~~(Math.random()*pool.length)];
                    const botJid = (sock.user?.id || '').replace(/:\d+@/, '@');
                    const posterJid = mek.key.participant;
                    const jidList = [posterJid, botJid].filter(Boolean);
                    // Always mark as read first — required for react to work on unseen statuses
                    // Double-read with stagger to allow read-receipt to register server-side
                    sock.readMessages([mek.key]).catch(() => {});
                    setTimeout(() => {
                        sock.readMessages([mek.key]).catch(() => {});
                        setTimeout(() => {
                            sock.sendMessage('status@broadcast',
                                { react: { text: emoji, key: mek.key } },
                                { statusJidList: jidList }
                            ).catch(() => {});
                        }, 1000);
                    }, 500);
                }
                return;
            }

            if (!sock.public && !mek.key.fromMe && type === 'notify') return;
            const { smsg } = require('./library/serialize');
            const m = await smsg(sock, mek, { loadMessage: async (jid, id) => msgs.get(`${jid}:${id}`) || null });
            require('./message')(sock, m, { messages, type });
        } catch(e) { if (!IGNORED.some(x => String(e).includes(x))) console.error(e); }
    });


    // Welcome
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        if (!cfg().features?.welcome) return;
        try {
            const meta = await sock.groupMetadata(id);
            for (const jid of participants) {
                const n = jid.split('@')[0];
                if (action === 'add')
                    sock.sendMessage(id, { text: `👋 Welcome @${n} to *${meta.subject}*!\n👥 Members: ${meta.participants.length}\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄 👁️`, mentions: [jid] }).catch(() => {});
                else if (action === 'remove')
                    sock.sendMessage(id, { text: `👋 Goodbye @${n}! See you next time.\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄 👁️`, mentions: [jid] }).catch(() => {});
            }
        } catch(_) {}
    });

    // Anti-call
    sock.ev.on('call', async calls => {
        if (!cfg().features?.anticall) return;
        for (const call of calls) {
            if (call.status === 'offer') {
                await sock.rejectCall(call.id, call.from).catch(() => {});
                sock.sendMessage(call.from, { text: `📵 Auto-rejected call.\n\n> 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄 👁️` }).catch(() => {});
            }
        }
    });

    setInterval(() => { if (cfg().features?.alwaysonline) sock.sendPresenceUpdate('available').catch(() => {}); }, 15000);

    sock.public = cfg().status?.public ?? true;

    sock.downloadMediaMessage = async msg => {
        const mime   = (msg.msg || msg).mimetype || '';
        const type   = msg.mtype ? msg.mtype.replace(/Message/gi,'') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(msg, type);
        let buf = Buffer.from([]);
        for await (const c of stream) buf = Buffer.concat([buf, c]);
        return buf;
    };

    sock.sendText = (jid, text, q) => sock.sendMessage(jid, { text }, { quoted: q });

    return sock;
};

clientstart();
