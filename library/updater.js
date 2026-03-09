// ╔══════════════════════════════════════════════════════════════╗
// ║  LIAM LITE — Auto Updater (silent, 2-day schedule)          ║
// ╚══════════════════════════════════════════════════════════════╝
'use strict';

const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const execP  = promisify(exec);

const ROOT         = path.join(__dirname, '..');
const VERSION_FILE = path.join(ROOT, '.liam_version');
const REPO_API     = 'https://api.github.com/repos/Dialmw/LIAM-LITE/commits/main';
const REPO_ZIP     = 'https://github.com/Dialmw/LIAM-LITE/archive/refs/heads/main.zip';
const CHECK_MS     = 48 * 60 * 60 * 1000;  // 2 days
const sig          = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';

const isGit = () => { try { execSync(`git -C "${ROOT}" rev-parse HEAD`,{stdio:'ignore'}); return true; } catch { return false; } };
const isPm2 = () => { try { execSync('pm2 -v',{stdio:'ignore'}); return true; } catch { return false; } };

const getLocalSha = () => {
    try {
        if (fs.existsSync(VERSION_FILE)) return fs.readFileSync(VERSION_FILE,'utf8').trim().slice(0,7);
        if (isGit()) return execSync(`git -C "${ROOT}" rev-parse HEAD`,{encoding:'utf8'}).trim().slice(0,7);
    } catch(_) {}
    return null;
};

const setLocalSha = sha => { try { fs.writeFileSync(VERSION_FILE, sha.slice(0,7)); } catch(_) {} };

const getRemoteSha = async () => {
    const { data } = await axios.get(REPO_API,{
        timeout: 15000,
        headers: { 'Accept':'application/vnd.github.v3+json', 'User-Agent':'LIAM-LITE-Bot' }
    });
    return { sha: data.sha.slice(0,7), fullSha: data.sha, msg: (data.commit?.message||'').split('\n')[0].slice(0,80) };
};

const gitPull = async () => {
    const {stdout,stderr} = await execP(`git -C "${ROOT}" pull --rebase origin main 2>&1`);
    return (stdout+stderr).trim().slice(0,200);
};

const zipUpdate = async () => {
    const os_  = require('os');
    const tmpZ = path.join(os_.tmpdir(),'liam_lite_upd.zip');
    const tmpD = path.join(os_.tmpdir(),'liam_lite_upd_ext');
    const { data } = await axios.get(REPO_ZIP,{ responseType:'arraybuffer', timeout:90000, headers:{'User-Agent':'LIAM-LITE-Bot'} });
    fs.writeFileSync(tmpZ, Buffer.from(data));
    if (fs.existsSync(tmpD)) await execP(`rm -rf "${tmpD}"`).catch(()=>{});
    fs.mkdirSync(tmpD,{ recursive:true });
    await execP(`unzip -o "${tmpZ}" -d "${tmpD}" 2>&1`);
    const extracted = fs.readdirSync(tmpD).find(d => /LIAM.LITE/i.test(d));
    if (!extracted) throw new Error('Extracted folder not found');
    const srcDir = path.join(tmpD, extracted);
    const SKIP = new Set(['sessions','settings','.liam_version','README.md','.env']);
    const copyDir = (src, dst) => {
        fs.mkdirSync(dst,{recursive:true});
        for (const item of fs.readdirSync(src)) {
            if (SKIP.has(item)) continue;
            const s = path.join(src,item), d = path.join(dst,item);
            fs.statSync(s).isDirectory() ? copyDir(s,d) : fs.copyFileSync(s,d);
        }
    };
    copyDir(srcDir, ROOT);
    await execP(`rm -rf "${tmpD}" "${tmpZ}"`).catch(()=>{});
    return 'ZIP applied';
};

const npmInstall = async () => { await execP(`npm install --prefix "${ROOT}" --no-audit --no-fund 2>&1`).catch(()=>{}); };

const gracefulRestart = async (reply) => {
    if (isPm2()) {
        await execP(`pm2 restart "${process.env.PM2_APP_NAME||'LIAM-LITE'}" 2>&1`).catch(()=>{});
        setTimeout(()=>process.exit(0), 2000);
        return;
    }
    if (process.env.NODEMON) { setTimeout(()=>process.kill(process.pid,'SIGUSR2'),500); return; }
    // No PM — keep alive, tell user
    if (reply) await reply(
        `✅ *Update applied!*\n⚠️ Restart to activate:\n• \`pm2 restart LIAM-LITE\`\n• Termux: Ctrl+C → \`npm start\`\n\n${sig()}`
    );
};

// ── Silent 2-day auto-update ──────────────────────────────────────
const autoUpdate = async (sock) => {
    const ownerJid = (sock?.user?.id||'').split(':')[0].split('@')[0] + '@s.whatsapp.net';
    if (!ownerJid || ownerJid === '@s.whatsapp.net') return;
    try {
        const remote   = await getRemoteSha();
        const localSha = getLocalSha();
        if (localSha && (localSha === remote.sha || remote.fullSha.startsWith(localSha))) return;

        // Apply update silently
        console.log(`[UPDATER] Auto-updating to ${remote.sha}...`);
        try {
            if (isGit()) await gitPull();
            else await zipUpdate();
        } catch(e) {
            // Update failed — notify user
            sock.sendMessage(ownerJid, {
                text: `⚠️ *LIAM LITE auto-update failed!*\n\nError: ${e.message}\n\nManually run:\n\`git pull && npm install\`\n\n${sig()}`
            }).catch(()=>{});
            return;
        }
        await npmInstall();
        setLocalSha(remote.sha);

        // Silent success — just log + send a clean message
        console.log(`[UPDATER] ✅ Updated to ${remote.sha}`);
        sock.sendMessage(ownerJid, {
            text: `✅ *LIAM LITE updated!* → \`${remote.sha}\`\n📝 ${remote.msg}\n\n${sig()}`
        }).catch(()=>{});
        await gracefulRestart(null);
    } catch(e) {
        console.log(`[UPDATER] Auto-update error: ${e.message}`);
    }
};

const startChecker = (sock) => {
    // First auto-check after 60s on boot
    setTimeout(() => autoUpdate(sock).catch(()=>{}), 60000);
    // Then every 2 days
    setInterval(() => autoUpdate(sock).catch(()=>{}), CHECK_MS);
};

// ── Manual .update ────────────────────────────────────────────────
const doUpdate = async (sock, m, reply) => {
    await reply(`🔍 Checking GitHub...\n\n${sig()}`);
    let remote;
    try { remote = await getRemoteSha(); }
    catch(e) { return reply(`❌ GitHub unreachable: ${e.message}\n\n${sig()}`); }

    const localSha = getLocalSha();
    if (localSha && (localSha === remote.sha || remote.fullSha.startsWith(localSha)))
        return reply(`✅ *Already up to date!* \`${localSha}\`\n\n${sig()}`);

    await reply(`📦 Updating to \`${remote.sha}\`...\n\n${sig()}`);
    try {
        if (isGit()) await gitPull(); else await zipUpdate();
        await npmInstall();
        setLocalSha(remote.sha);
        await reply(`✅ *Update success!* \`${remote.sha}\`\n📝 ${remote.msg}\n\n${sig()}`);
        await gracefulRestart(reply);
    } catch(e) {
        await reply(`❌ Failed: ${e.message}\n\nManual: \`git pull && npm install\`\n\n${sig()}`);
    }
};

module.exports = { startChecker, doUpdate, getLocalSha };
