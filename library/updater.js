// ╔══════════════════════════════════════════════════════════════════╗
// ║  LIAM LITE — Auto Updater                                       ║
// ║  Checks GitHub, auto-pulls, notifies owner                     ║
// ╚══════════════════════════════════════════════════════════════════╝
'use strict';

const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const execP  = promisify(exec);

const ROOT        = path.join(__dirname, '..');
const VERSION_FILE = path.join(ROOT, '.liam_version');
const REPO_API    = 'https://api.github.com/repos/Dialmw/LIAM-LITE/commits/main';
const REPO_ZIP    = 'https://github.com/Dialmw/LIAM-LITE/archive/refs/heads/main.zip';
const REPO_RAW    = 'https://raw.githubusercontent.com/Dialmw/LIAM-LITE/main';
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // every 4 hours
const sig = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';

// ── Helpers ────────────────────────────────────────────────────────
const isGit = () => { try { execSync('git -C "' + ROOT + '" status --short', {stdio:'ignore'}); return true; } catch { return false; } };

const getLocalSha = () => {
    try {
        if (fs.existsSync(VERSION_FILE)) return fs.readFileSync(VERSION_FILE, 'utf8').trim();
        if (isGit()) return execSync('git -C "' + ROOT + '" rev-parse HEAD', {encoding:'utf8'}).trim().slice(0,7);
    } catch(_) {}
    return null;
};

const setLocalSha = sha => { try { fs.writeFileSync(VERSION_FILE, sha); } catch(_) {} };

const getRemoteSha = async () => {
    const { data } = await axios.get(REPO_API, {
        timeout: 12000,
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'LIAM-LITE-Bot' }
    });
    return { sha: data.sha.slice(0,7), fullSha: data.sha, msg: data.commit?.message?.split('\n')[0] || '', date: data.commit?.author?.date || '' };
};

// ── Auto-pull via git ───────────────────────────────────────────────
const gitPull = async () => {
    const { stdout, stderr } = await execP('git -C "' + ROOT + '" pull --rebase origin main 2>&1');
    return (stdout + stderr).trim();
};

// ── Download latest zip + hot-swap files (non-git deploy) ──────────
const zipUpdate = async () => {
    const os   = require('os');
    const tmpZ = path.join(os.tmpdir(), 'liam_lite_update.zip');
    const tmpD = path.join(os.tmpdir(), 'liam_lite_update_extract');

    // Download zip
    const { data } = await axios.get(REPO_ZIP, { responseType: 'arraybuffer', timeout: 60000, headers: {'User-Agent':'LIAM-LITE-Bot'} });
    fs.writeFileSync(tmpZ, Buffer.from(data));

    // Extract with unzip
    fs.mkdirSync(tmpD, { recursive: true });
    await execP(`unzip -o "${tmpZ}" -d "${tmpD}" 2>&1`);

    // Find extracted folder
    const extracted = fs.readdirSync(tmpD).find(d => d.startsWith('LIAM-LITE'));
    if (!extracted) throw new Error('Could not find extracted folder');
    const srcDir = path.join(tmpD, extracted);

    // Files to update (skip sessions/ settings/ .liam_version README.md)
    const SKIP = new Set(['sessions', 'settings', '.liam_version', 'README.md', 'PANEL_SETUP.md']);
    const copyDir = (src, dst) => {
        if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
        for (const item of fs.readdirSync(src)) {
            if (SKIP.has(item)) continue;
            const s = path.join(src, item), d = path.join(dst, item);
            if (fs.statSync(s).isDirectory()) copyDir(s, d);
            else fs.copyFileSync(s, d);
        }
    };
    copyDir(srcDir, ROOT);

    // Cleanup
    try { fs.unlinkSync(tmpZ); } catch(_) {}
    try { await execP(`rm -rf "${tmpD}"`); } catch(_) {}
    return 'ZIP update applied';
};

// ── npm install ─────────────────────────────────────────────────────
const npmInstall = async () => {
    await execP('npm install --prefix "' + ROOT + '" 2>&1');
};

// ── Check & notify ──────────────────────────────────────────────────
let _lastCheckSha = null;
let _notifyCooldown = 0;

const checkAndNotify = async (sock) => {
    try {
        const ownerJid = (sock?.user?.id || '').split(':')[0].split('@')[0] + '@s.whatsapp.net';
        if (!ownerJid || ownerJid === '@s.whatsapp.net') return;

        const remote    = await getRemoteSha();
        const localSha  = getLocalSha();

        // Up to date
        if (localSha && (localSha === remote.sha || remote.fullSha.startsWith(localSha))) return;

        // Already notified about this SHA recently (avoid spam)
        if (_lastCheckSha === remote.sha && Date.now() - _notifyCooldown < 60 * 60 * 1000) return;
        _lastCheckSha = remote.sha;
        _notifyCooldown = Date.now();

        const msg =
            `🔔 *LIAM LITE Update Available!*\n\n` +
            `📦 *New:* \`${remote.sha}\`\n` +
            `📌 *Current:* \`${localSha || 'unknown'}\`\n` +
            `📝 *Changes:* ${remote.msg}\n\n` +
            `Type *.update* to auto-update now, or update manually:\n` +
            `\`git pull origin main && npm install\`\n\n${sig()}`;

        sock.sendMessage(ownerJid, { text: msg }).catch(() => {});
        console.log(`[UPDATER] Update available: ${remote.sha}`);
    } catch(e) {
        console.log(`[UPDATER] Check failed: ${e.message}`);
    }
};

// ── Start periodic checker ──────────────────────────────────────────
const startChecker = (sock) => {
    // Check after 30s on startup
    setTimeout(() => checkAndNotify(sock), 30000);
    // Then every 4 hours
    setInterval(() => checkAndNotify(sock), CHECK_INTERVAL_MS);
};

// ── Manual .update command handler ─────────────────────────────────
const doUpdate = async (sock, m, reply) => {
    const ownerJid = (sock?.user?.id || '').split(':')[0].split('@')[0] + '@s.whatsapp.net';
    await reply(`🔄 *Checking for updates...*\n\n${sig()}`);

    let remote;
    try {
        remote = await getRemoteSha();
    } catch(e) {
        return reply(`❌ *Cannot reach GitHub:* ${e.message}\n\n_Check internet / try again later._\n\n${sig()}`);
    }

    const localSha = getLocalSha();
    if (localSha && (localSha === remote.sha || remote.fullSha.startsWith(localSha))) {
        return reply(`✅ *Already up to date!*\n\n📦 Version: \`${localSha}\`\n\n${sig()}`);
    }

    await reply(
        `📦 *Update found!*\n\n` +
        `📌 Current: \`${localSha || 'unknown'}\`\n` +
        `🆕 Latest:  \`${remote.sha}\`\n` +
        `📝 ${remote.msg}\n\n` +
        `⏳ *Applying update...*\n\n${sig()}`
    );

    // Try git pull first
    let method = 'git';
    let updateLog = '';
    try {
        if (isGit()) {
            updateLog = await gitPull();
            method = 'git';
        } else {
            throw new Error('Not a git repo');
        }
    } catch(gitErr) {
        // Fallback: zip download
        try {
            await reply(`⚠️ Git not available, trying ZIP download...\n\n${sig()}`);
            updateLog = await zipUpdate();
            method = 'zip';
        } catch(zipErr) {
            return reply(
                `❌ *Auto-update failed!*\n\n` +
                `Git error: ${gitErr.message}\n` +
                `ZIP error: ${zipErr.message}\n\n` +
                `*Please update manually:*\n` +
                `\`git pull origin main && npm install\`\n\n${sig()}`
            );
        }
    }

    // npm install
    try {
        await reply(`📦 *Installing dependencies...*\n\n${sig()}`);
        await npmInstall();
    } catch(e) {
        console.log('[UPDATER] npm install failed:', e.message);
    }

    // Save new SHA
    setLocalSha(remote.sha);

    await reply(
        `✅ *Update complete!*\n\n` +
        `🆕 Version: \`${remote.sha}\`\n` +
        `📦 Method: ${method.toUpperCase()}\n` +
        `📝 ${updateLog.slice(0, 200)}\n\n` +
        `🔄 *Restarting bot...*\n\n${sig()}`
    );

    setTimeout(() => process.exit(0), 2000);
};

module.exports = { checkAndNotify, startChecker, doUpdate, getLocalSha, getRemoteSha };
