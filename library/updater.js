// ╔══════════════════════════════════════════════════════════════════╗
// ║  LIAM LITE — Auto Updater (stable, never kills server)          ║
// ╚══════════════════════════════════════════════════════════════════╝
'use strict';

const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const execP  = promisify(exec);

const ROOT          = path.join(__dirname, '..');
const VERSION_FILE  = path.join(ROOT, '.liam_version');
const REPO_API      = 'https://api.github.com/repos/Dialmw/LIAM-LITE/commits/main';
const REPO_ZIP      = 'https://github.com/Dialmw/LIAM-LITE/archive/refs/heads/main.zip';
const CHECK_MS      = 4 * 60 * 60 * 1000;   // 4 hours
const sig           = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';

// ── Helpers ────────────────────────────────────────────────────────
const isGit = () => {
    try { execSync('git -C "' + ROOT + '" rev-parse HEAD', { stdio:'ignore' }); return true; }
    catch { return false; }
};

const isPm2 = () => {
    try { execSync('pm2 -v', { stdio:'ignore' }); return true; }
    catch { return false; }
};

const isNodemon = () => !!process.env.NODEMON || !!process.env.NODE_APP_INSTANCE;

const getLocalSha = () => {
    try {
        if (fs.existsSync(VERSION_FILE)) return fs.readFileSync(VERSION_FILE, 'utf8').trim().slice(0,7);
        if (isGit()) return execSync('git -C "' + ROOT + '" rev-parse HEAD', { encoding:'utf8' }).trim().slice(0,7);
    } catch(_) {}
    return null;
};

const setLocalSha = sha => {
    try { fs.writeFileSync(VERSION_FILE, sha.slice(0,7)); } catch(_) {}
};

const getRemoteSha = async () => {
    const { data } = await axios.get(REPO_API, {
        timeout: 15000,
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'LIAM-LITE-Bot' }
    });
    return {
        sha:     data.sha.slice(0,7),
        fullSha: data.sha,
        msg:     (data.commit?.message || '').split('\n')[0].slice(0,80),
        date:    data.commit?.author?.date || ''
    };
};

// ── Git pull ───────────────────────────────────────────────────────
const gitPull = async () => {
    const { stdout, stderr } = await execP(`git -C "${ROOT}" pull --rebase origin main 2>&1`);
    return (stdout + stderr).trim().slice(0, 300);
};

// ── ZIP download + hot-swap (for non-git deploys: Render, Heroku) ──
const zipUpdate = async () => {
    const os_  = require('os');
    const tmpZ = path.join(os_.tmpdir(), 'liam_lite_upd.zip');
    const tmpD = path.join(os_.tmpdir(), 'liam_lite_upd_extract');

    const { data } = await axios.get(REPO_ZIP, {
        responseType: 'arraybuffer',
        timeout: 90000,
        headers: { 'User-Agent': 'LIAM-LITE-Bot' }
    });
    fs.writeFileSync(tmpZ, Buffer.from(data));

    if (fs.existsSync(tmpD)) await execP(`rm -rf "${tmpD}"`).catch(() => {});
    fs.mkdirSync(tmpD, { recursive: true });
    await execP(`unzip -o "${tmpZ}" -d "${tmpD}" 2>&1`);

    const extracted = fs.readdirSync(tmpD).find(d => /LIAM.LITE/i.test(d));
    if (!extracted) throw new Error('Extracted folder not found');
    const srcDir = path.join(tmpD, extracted);

    // Only overwrite code files — NEVER touch sessions/ or settings/
    const SKIP = new Set(['sessions', 'settings', '.liam_version', 'README.md', 'PANEL_SETUP.md', '.env']);

    const copyDir = (src, dst) => {
        fs.mkdirSync(dst, { recursive: true });
        for (const item of fs.readdirSync(src)) {
            if (SKIP.has(item)) continue;
            const s = path.join(src, item), d = path.join(dst, item);
            fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
        }
    };
    copyDir(srcDir, ROOT);

    // Cleanup
    await execP(`rm -rf "${tmpD}" "${tmpZ}"`).catch(() => {});
    return 'ZIP swapped successfully';
};

// ── npm install ────────────────────────────────────────────────────
const npmInstall = async () => {
    const { stdout } = await execP(`npm install --prefix "${ROOT}" --no-audit --no-fund 2>&1`);
    return stdout.slice(0, 100);
};

// ── Graceful restart — keeps server UP until manager relaunches ────
// Strategy:
//  1. If pm2 detected → pm2 restart app name
//  2. If nodemon → send SIGUSR2 (nodemon restart signal)
//  3. Otherwise → tell user to restart manually (DO NOT exit)
const gracefulRestart = async (sock, reply, appName) => {
    const ownerJid = (sock?.user?.id || '').split(':')[0].split('@')[0] + '@s.whatsapp.net';

    if (isPm2()) {
        try {
            // pm2 restart — spawns new process before killing old one
            await execP(`pm2 restart "${appName || 'LIAM-LITE'}" 2>&1`);
            // This message sends before the restart completes
            await reply(`✅ *Update applied!*\n🔄 pm2 restarting...\n\n${sig()}`);
            return;
        } catch(e) {
            // pm2 restart failed, try graceful exit (pm2 will relaunch)
            await reply(`✅ *Update applied!*\n🔄 Restarting via pm2...\n\n${sig()}`);
            setTimeout(() => process.exit(0), 1500);
            return;
        }
    }

    if (isNodemon()) {
        await reply(`✅ *Update applied!*\n🔄 Nodemon restarting...\n\n${sig()}`);
        setTimeout(() => process.kill(process.pid, 'SIGUSR2'), 800);
        return;
    }

    // Render / Heroku / bare VPS without pm2
    // DO NOT exit — just notify user to restart
    await reply(
        `✅ *Update files applied!*\n\n` +
        `⚠️ *Restart required to activate.*\n\n` +
        `*How to restart:*\n` +
        `• pm2: \`pm2 restart LIAM-LITE\`\n` +
        `• Termux: Ctrl+C then \`npm start\`\n` +
        `• Render/Heroku: Manual redeploy or set auto-restart\n\n` +
        `_Bot continues running on old version until restart._\n\n${sig()}`
    );
    // Don't exit — keep serving
};

// ── Periodic check state ───────────────────────────────────────────
let _lastNotifiedSha  = null;
let _notifyTime       = 0;
let _failCount        = 0;
const MAX_FAIL_NOTIFY = 3;   // warn user after 3 consecutive check failures

const checkAndNotify = async (sock) => {
    const ownerJid = (sock?.user?.id || '').split(':')[0].split('@')[0] + '@s.whatsapp.net';
    if (!ownerJid || ownerJid === '@s.whatsapp.net') return;

    try {
        const remote   = await getRemoteSha();
        const localSha = getLocalSha();
        _failCount = 0; // reset on success

        // Same version — nothing to do
        if (localSha && (localSha === remote.sha || remote.fullSha.startsWith(localSha))) return;

        // Already sent this notification recently (1h cooldown)
        if (_lastNotifiedSha === remote.sha && Date.now() - _notifyTime < 60 * 60 * 1000) return;
        _lastNotifiedSha = remote.sha;
        _notifyTime      = Date.now();

        sock.sendMessage(ownerJid, {
            text:
                `🔔 *LIAM LITE Update Available!*\n\n` +
                `📦 New:     \`${remote.sha}\`\n` +
                `📌 Current: \`${localSha || '?'}\`\n` +
                `📝 ${remote.msg}\n\n` +
                `Type *.update* to auto-update now\n` +
                `or: \`git pull origin main && npm install\`\n\n${sig()}`
        }).catch(() => {});

        console.log(`[UPDATER] ⬆ Update ${remote.sha} available`);
    } catch(e) {
        _failCount++;
        console.log(`[UPDATER] Check failed (${_failCount}): ${e.message}`);

        // After repeated failures, nudge owner to check manually
        if (_failCount >= MAX_FAIL_NOTIFY) {
            _failCount = 0;
            sock.sendMessage(ownerJid, {
                text:
                    `⚠️ *LIAM LITE — Update check failed ${MAX_FAIL_NOTIFY}x*\n\n` +
                    `Could not reach GitHub. Please manually check for updates:\n` +
                    `\`git pull origin main && npm install\`\n\n` +
                    `_Check your internet connection or GitHub status._\n\n${sig()}`
            }).catch(() => {});
        }
    }
};

// ── Start background checker ───────────────────────────────────────
const startChecker = (sock) => {
    // First check 45s after boot (let WA settle first)
    setTimeout(() => checkAndNotify(sock).catch(() => {}), 45000);
    // Recurring every 4 hours
    setInterval(() => checkAndNotify(sock).catch(() => {}), CHECK_MS);
};

// ── .update command handler ────────────────────────────────────────
const doUpdate = async (sock, m, reply) => {
    await reply(`🔍 *Checking GitHub...*\n\n${sig()}`);

    // 1. Fetch remote SHA
    let remote;
    try {
        remote = await getRemoteSha();
    } catch(e) {
        return reply(`❌ *GitHub unreachable*\n${e.message}\n\nCheck internet & try again.\n\n${sig()}`);
    }

    const localSha = getLocalSha();

    // 2. Already up to date
    if (localSha && (localSha === remote.sha || remote.fullSha.startsWith(localSha))) {
        return reply(`✅ *Already up to date!*\nVersion: \`${localSha}\`\n\n${sig()}`);
    }

    await reply(
        `📦 *Update found!*\n` +
        `Current: \`${localSha || 'unknown'}\`\n` +
        `Latest:  \`${remote.sha}\`\n` +
        `📝 ${remote.msg}\n\n` +
        `⏳ Downloading...\n\n${sig()}`
    );

    // 3. Try update methods
    let method = '', log = '';
    try {
        if (isGit()) {
            log    = await gitPull();
            method = 'git pull';
        } else {
            throw new Error('not a git repo');
        }
    } catch(gitErr) {
        try {
            log    = await zipUpdate();
            method = 'ZIP download';
        } catch(zipErr) {
            return reply(
                `❌ *Auto-update failed!*\n\n` +
                `Git: ${gitErr.message}\n` +
                `ZIP: ${zipErr.message}\n\n` +
                `*Manual update:*\n\`git pull origin main && npm install\`\n\n${sig()}`
            );
        }
    }

    // 4. npm install (non-fatal if it fails)
    try {
        await reply(`📦 *Installing dependencies...*\n\n${sig()}`);
        await npmInstall();
    } catch(e) {
        console.log('[UPDATER] npm install error (non-fatal):', e.message);
    }

    // 5. Save new version
    setLocalSha(remote.sha);

    // 6. Restart (stable — keeps server alive if no process manager)
    await gracefulRestart(sock, reply, process.env.PM2_APP_NAME || 'LIAM-LITE');
};

module.exports = { checkAndNotify, startChecker, doUpdate, getLocalSha, getRemoteSha };
