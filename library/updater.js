// ╔══════════════════════════════════════════════════════════════════╗
// ║  LIAM EYES — Auto Updater (silent 2-day, .update cmd works)    ║
// ╚══════════════════════════════════════════════════════════════════╝
'use strict';

const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const execP  = promisify(exec);

const ROOT         = path.join(__dirname, '..');
const VERSION_FILE = path.join(ROOT, '.liam_version');
const REPO_API     = 'https://api.github.com/repos/Dialmw/LIAM-EYES-/commits/main';
const REPO_ZIP     = 'https://github.com/Dialmw/LIAM-EYES-/archive/refs/heads/main.zip';
const CHECK_MS     = 48 * 60 * 60 * 1000;
const sig          = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐄𝐘𝐄𝐒';

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
    const { data } = await axios.get(REPO_API, {
        timeout: 15000,
        headers: { 'Accept':'application/vnd.github.v3+json', 'User-Agent':'LIAM-EYES-Bot' }
    });
    return {
        sha:     data.sha.slice(0,7),
        fullSha: data.sha,
        msg:     (data.commit?.message||'').split('\n')[0].slice(0,80),
    };
};

const gitPull = async () => {
    const {stdout,stderr} = await execP(`git -C "${ROOT}" pull --rebase origin main 2>&1`);
    return (stdout+stderr).trim().slice(0,200);
};

// ZIP update — robust extraction for LIAM-EYES- trailing dash repo name
const zipUpdate = async () => {
    const os_  = require('os');
    const tmpZ = path.join(os_.tmpdir(),'liam_eyes_upd.zip');
    const tmpD = path.join(os_.tmpdir(),'liam_eyes_upd_ext');

    const { data } = await axios.get(REPO_ZIP, {
        responseType:'arraybuffer', timeout:120000,
        headers:{ 'User-Agent':'LIAM-EYES-Bot', 'Accept':'application/zip' }
    });
    if (!data || data.byteLength < 1000) throw new Error('Empty ZIP response');
    fs.writeFileSync(tmpZ, Buffer.from(data));

    if (fs.existsSync(tmpD)) await execP(`rm -rf "${tmpD}"`).catch(()=>{});
    fs.mkdirSync(tmpD,{recursive:true});
    await execP(`unzip -o "${tmpZ}" -d "${tmpD}" 2>&1`);

    // Flexible match: any folder that starts with Dialmw or LIAM or liam
    const items = fs.readdirSync(tmpD);
    const extracted = items.find(d => /liam.eyes/i.test(d) || /dialmw/i.test(d)) || items[0];
    if (!extracted) throw new Error(`No extracted folder. Contents: ${items.join(', ')}`);

    const srcDir = path.join(tmpD, extracted);
    if (!fs.statSync(srcDir).isDirectory()) throw new Error(`Not a directory: ${extracted}`);

    const SKIP = new Set(['sessions','settings','.liam_version','README.md','.env','PANEL_SETUP.md']);
    const copyDir = (src, dst) => {
        fs.mkdirSync(dst,{recursive:true});
        for (const item of fs.readdirSync(src)) {
            if (SKIP.has(item)) continue;
            const s=path.join(src,item), d=path.join(dst,item);
            try { fs.statSync(s).isDirectory() ? copyDir(s,d) : fs.copyFileSync(s,d); } catch(_) {}
        }
    };
    copyDir(srcDir, ROOT);
    await execP(`rm -rf "${tmpD}" "${tmpZ}"`).catch(()=>{});
    return `ZIP applied from ${extracted}`;
};

const npmInstall = async () => {
    await execP(`npm install --prefix "${ROOT}" --no-audit --no-fund 2>&1`).catch(e=>console.log('[npm]',e.message));
};

const gracefulRestart = async (reply) => {
    if (isPm2()) {
        try { await execP(`pm2 restart "${process.env.PM2_APP_NAME||'LIAM-EYES'}" 2>&1`); } catch(_) {}
        setTimeout(()=>process.exit(0),2000); return;
    }
    if (process.env.NODEMON) { setTimeout(()=>process.kill(process.pid,'SIGUSR2'),500); return; }
    if (reply) await reply(`✅ *Update applied!*\n⚠️ Restart to activate:\n• \`pm2 restart LIAM-EYES\`\n• Termux: Ctrl+C → \`npm start\`\n\n${sig()}`);
};

// ── Silent 2-day auto-update ──────────────────────────────────────
const autoUpdate = async (sock) => {
    const ownerJid = (sock?.user?.id||'').split(':')[0].split('@')[0]+'@s.whatsapp.net';
    if (!ownerJid||ownerJid==='@s.whatsapp.net') return;
    try {
        const remote   = await getRemoteSha();
        const localSha = getLocalSha();
        if (localSha&&(localSha===remote.sha||remote.fullSha.startsWith(localSha))) return;

        console.log(`[UPDATER] Auto-updating to ${remote.sha}...`);
        try {
            if (isGit()) await gitPull(); else await zipUpdate();
        } catch(e) {
            sock.sendMessage(ownerJid,{text:`⚠️ *LIAM EYES auto-update failed!*\n${e.message}\n\nRun: \`git pull && npm install\`\n\n${sig()}`}).catch(()=>{});
            return;
        }
        await npmInstall();
        setLocalSha(remote.sha);
        console.log(`[UPDATER] ✅ Updated to ${remote.sha}`);
        sock.sendMessage(ownerJid,{text:`✅ *LIAM EYES updated!* → \`${remote.sha}\`\n📝 ${remote.msg}\n\n${sig()}`}).catch(()=>{});
        await gracefulRestart(null);
    } catch(e) { console.log(`[UPDATER] ${e.message}`); }
};

const startChecker = (sock) => {
    setTimeout(()=>autoUpdate(sock).catch(()=>{}), 60000);
    setInterval(()=>autoUpdate(sock).catch(()=>{}), CHECK_MS);
};

// ── Manual .update command ────────────────────────────────────────
const doUpdate = async (sock, m, reply) => {
    await reply(`🔍 *Checking GitHub...*\n\n${sig()}`);

    let remote;
    try { remote = await getRemoteSha(); }
    catch(e) { return reply(`❌ *GitHub unreachable:* ${e.message}\n\n_Check internet & retry_\n\n${sig()}`); }

    const localSha = getLocalSha();
    if (localSha&&(localSha===remote.sha||remote.fullSha.startsWith(localSha)))
        return reply(`✅ *Already up to date!* \`${localSha}\`\n\n${sig()}`);

    await reply(`📦 *Update found!*\nCurrent: \`${localSha||'?'}\` → Latest: \`${remote.sha}\`\n📝 ${remote.msg}\n\n⏳ Downloading...\n\n${sig()}`);

    // Always try ZIP first (more reliable on hosting platforms)
    let log='', method='';
    try {
        if (isGit()) {
            try { log=await gitPull(); method='git'; }
            catch(e) { log=await zipUpdate(); method='zip(git-fail)'; }
        } else {
            log=await zipUpdate(); method='zip';
        }
    } catch(e) {
        return reply(`❌ *Update failed!*\n${e.message}\n\nManual: \`git pull && npm install\`\n\n${sig()}`);
    }

    try { await reply(`📦 *Installing deps...*\n\n${sig()}`); await npmInstall(); }
    catch(_) {}

    setLocalSha(remote.sha);
    await reply(`✅ *Update success!* \`${remote.sha}\` via ${method}\n📝 ${log.slice(0,150)}\n\n${sig()}`);
    await gracefulRestart(reply);
};

module.exports = { startChecker, doUpdate, getLocalSha };
