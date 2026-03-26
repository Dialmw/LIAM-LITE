// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  LIAM EYES — dl.js v7  (Maximum Coverage Music Engine 2025)           ║
// ║  10+ API sources, dynamic cobalt instances, parallel fast batch        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
'use strict';
const axios = require('axios');
const UA  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';
const UAB = 'LIAM-EYES-Bot/7.0 (+https://github.com/Dialmw/LIAM-EYES-)'; // for cobalt instances
const ytId = url => url?.match(/(?:v=|youtu\.be\/|\/v\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)?.[1];
const safe = (t, ext) => `${(t||'audio').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().slice(0,60)}.${ext}`;

const get  = (url, cfg={}) => axios.get(url,  { headers:{'User-Agent':UA,'Accept':'application/json',...cfg.headers}, timeout:cfg.timeout||15000, ...cfg });
const post = (url, data, cfg={}) => axios.post(url, data, { headers:{'User-Agent':UA,'Content-Type':'application/json','Accept':'application/json',...cfg.headers}, timeout:cfg.timeout||15000, ...cfg });

// ── Dynamic cobalt instance cache ─────────────────────────────────────────────
let _cobaltInstances = null;
let _cobaltCacheTime = 0;

const getCobaltInstances = async () => {
    const now = Date.now();
    if (_cobaltInstances && now - _cobaltCacheTime < 10 * 60 * 1000) return _cobaltInstances;
    try {
        const r = await axios.get('https://instances.cobalt.best/api/instances.json', {
            headers: { 'User-Agent': UAB }, timeout: 8000,
        });
        const instances = (r.data || [])
            .filter(i => i.online && i.api && (i.services?.youtube || i.services?.['youtube music']))
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 8)
            .map(i => `https://${i.api}`);
        if (instances.length > 0) {
            _cobaltInstances = instances;
            _cobaltCacheTime = now;
            return instances;
        }
    } catch (_) {}
    // Fallback hardcoded instances
    return [
        'https://api.cobalt.tools',
        'https://cobalt.tools',
        'https://cobalt.privacyredirect.com',
        'https://cbl.in.ua',
    ];
};

// ════════════════════════════════════════════════════════════════════════════════
// API 1: cobalt (community instances — no bot protection)
// ════════════════════════════════════════════════════════════════════════════════
const api_cobalt = async (ytUrl) => {
    const instances = await getCobaltInstances();
    for (const ep of instances) {
        try {
            const r = await axios.post(`${ep}/api/json`,
                { url: ytUrl, isAudioOnly: true, aFormat: 'mp3', audioBitrate: '128' },
                { headers: { 'User-Agent': UAB, 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 14000 });
            const u = r.data?.url || r.data?.audio;
            if (u) return { url: u, title: r.data?.filename?.replace(/\.mp3$/i,'') || 'audio' };
        } catch (_) {}
    }
    throw new Error('cobalt: all instances failed');
};

// ════════════════════════════════════════════════════════════════════════════════
// API 2: piped.video mirrors
// ════════════════════════════════════════════════════════════════════════════════
const api_piped = async (id) => {
    const mirrors = [
        'https://pipedapi.kavin.rocks','https://pipedapi.in','https://piped.smnz.de',
        'https://piped.adminforge.de','https://piped.moomoo.me','https://api.piped.yt',
        'https://pipedapi.tokhmi.xyz','https://pipedapi.syncpundit.io',
    ];
    for (const m of mirrors) {
        try {
            const r = await get(`${m}/streams/${id}`, { timeout: 10000 });
            const streams = (r.data?.audioStreams||[]).filter(s=>s.url).sort((a,b)=>(b.bitrate||0)-(a.bitrate||0));
            if (streams[0]?.url) return { url: streams[0].url, title: r.data?.title||'audio' };
        } catch (_) {}
    }
    throw new Error('piped: no working mirror');
};

// ════════════════════════════════════════════════════════════════════════════════
// API 3: invidious mirrors
// ════════════════════════════════════════════════════════════════════════════════
const api_inv = async (id) => {
    const instances = [
        'https://inv.nadeko.net','https://y.com.sb','https://invidious.nerdvpn.de',
        'https://yt.dragonrender.io','https://invidious.privacyredirect.com',
        'https://iv.melmac.space','https://invidious.incogniweb.net',
        'https://invidious.fdn.fr','https://invidious.tiekoetter.com',
    ];
    for (const inst of instances) {
        try {
            const r = await get(`${inst}/api/v1/videos/${id}`, { timeout: 10000 });
            const fmts = (r.data?.adaptiveFormats||[]).filter(f=>f.type?.includes('audio')).sort((a,b)=>(b.bitrate||0)-(a.bitrate||0));
            if (fmts[0]?.url) return { url: fmts[0].url, title: r.data?.title||'audio' };
        } catch (_) {}
    }
    throw new Error('invidious: no working instance');
};

// ════════════════════════════════════════════════════════════════════════════════
// API 4: y2mate
// ════════════════════════════════════════════════════════════════════════════════
const api_y2mate = async (ytUrl, id) => {
    const a = await post('https://www.y2mate.com/mates/analyzeV2/ajax',
        `k_query=https://youtube.com/watch?v=${id}&k_page=Youtube&hl=en&q_auto=0`,
        { headers: {'Content-Type':'application/x-www-form-urlencoded'}, timeout: 18000 });
    if (a.data?.status !== 'ok') throw new Error('y2: analyze failed');
    const mp3 = a.data?.links?.mp3 || {};
    const k = Object.keys(mp3)[0];
    if (!k) throw new Error('y2: no mp3 links');
    const c = await post('https://www.y2mate.com/mates/convertV2/index',
        `vid=${id}&k=${mp3[k].k}`,
        { headers: {'Content-Type':'application/x-www-form-urlencoded'}, timeout: 25000 });
    if (c.data?.dlink) return { url: c.data.dlink, title: a.data?.title||'audio' };
    throw new Error('y2: convert failed');
};

// ════════════════════════════════════════════════════════════════════════════════
// API 5: fabdl
// ════════════════════════════════════════════════════════════════════════════════
const api_fabdl = async (id) => {
    const r = await get(`https://api.fabdl.com/youtube/get?url=https://www.youtube.com/watch?v=${id}&type=mp3`);
    if (r.data?.result?.download_url) return { url: r.data.result.download_url, title: r.data.result.title||'audio' };
    const { process_id:pid, gid, title } = r.data?.result || {};
    if (!pid) throw new Error('fabdl: no process');
    for (let i = 0; i < 10; i++) {
        await new Promise(x => setTimeout(x, 2000));
        const p = await get(`https://api.fabdl.com/youtube/mp3convert-progress?id=${gid}&pid=${pid}`, { timeout: 8000 });
        if (p.data?.result?.download_url) return { url: p.data.result.download_url, title: title||'audio' };
    }
    throw new Error('fabdl: timeout');
};

// ════════════════════════════════════════════════════════════════════════════════
// API 6: yt1s.com (fast, no key)
// ════════════════════════════════════════════════════════════════════════════════
const api_yt1s = async (id) => {
    const a = await post('https://www.yt1s.com/api/ajaxSearch/index',
        `q=https://www.youtube.com/watch?v=${id}&vt=mp3`,
        { headers:{'Content-Type':'application/x-www-form-urlencoded','Referer':'https://www.yt1s.com/'}, timeout: 15000 });
    if (a.data?.status !== 'ok') throw new Error('yt1s: search failed');
    const links = a.data?.links?.mp3 || {};
    const key   = Object.keys(links).find(k => k.includes('128') || k.includes('mp3'));
    if (!key) throw new Error('yt1s: no mp3');
    const c = await post('https://www.yt1s.com/api/ajaxConvert/convert',
        `vid=${id}&k=${links[key].k}`,
        { headers:{'Content-Type':'application/x-www-form-urlencoded','Referer':'https://www.yt1s.com/'}, timeout: 20000 });
    if (c.data?.dlink) return { url: c.data.dlink, title: a.data?.title||'audio' };
    throw new Error('yt1s: convert failed');
};

// ════════════════════════════════════════════════════════════════════════════════
// API 7: mp3download.to
// ════════════════════════════════════════════════════════════════════════════════
const api_mp3dl = async (id) => {
    const r = await post('https://mp3download.to/api/json',
        { url: `https://www.youtube.com/watch?v=${id}`, type: 'mp3' },
        { headers:{'Origin':'https://mp3download.to','Referer':'https://mp3download.to/'}, timeout: 18000 });
    const u = r.data?.url || r.data?.download_url || r.data?.link;
    if (u) return { url: u, title: r.data?.title||'audio' };
    throw new Error('mp3dl: no url');
};

// ════════════════════════════════════════════════════════════════════════════════
// API 8: loader.to (y2mate sister)
// ════════════════════════════════════════════════════════════════════════════════
const api_loaderto = async (id) => {
    const a = await get(`https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${id}&f=mp3`,
        { headers:{'Referer':'https://loader.to/'}, timeout: 12000 });
    const dlUrl = a.data?.url;
    if (dlUrl) return { url: dlUrl, title: 'audio' };
    throw new Error('loaderto: no url');
};

// ════════════════════════════════════════════════════════════════════════════════
// API 9: ndown.org
// ════════════════════════════════════════════════════════════════════════════════
const api_ndown = async (id) => {
    const r = await get(`https://ndown.org/api/download?url=https://www.youtube.com/watch?v=${id}&type=mp3`);
    const u = r.data?.link || r.data?.url || r.data?.data?.link;
    if (u) return { url: u, title: r.data?.title||'audio' };
    throw new Error('ndown: no link');
};

// ════════════════════════════════════════════════════════════════════════════════
// API 10: convert2mp3.net style (yt-download.org)
// ════════════════════════════════════════════════════════════════════════════════
const api_ytdl_org = async (id) => {
    const r = await get(`https://www.yt-download.org/api/button/mp3/${id}`,
        { headers:{'Referer':'https://www.yt-download.org/'}, timeout: 12000 });
    // Response is usually HTML with the download link
    if (typeof r.data === 'string') {
        const match = r.data.match(/href="(https?:\/\/[^"]+\.mp3[^"]*)"/i);
        if (match) return { url: match[1], title: 'audio' };
    }
    const u = r.data?.url || r.data?.link;
    if (u) return { url: u, title: r.data?.title||'audio' };
    throw new Error('ytdl_org: no url');
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN: dlAudio — parallel fast batch then sequential fallbacks
// ════════════════════════════════════════════════════════════════════════════════
const firstSuccess = (fns, timeoutMs) => new Promise((resolve, reject) => {
    let done = false, pending = fns.length;
    const errs = [];
    const timer = setTimeout(() => { if (!done) { done = true; reject(new Error('batch timeout')); } }, timeoutMs);
    for (const fn of fns) {
        Promise.resolve().then(fn)
            .then(r => { if (!done && r?.url) { done = true; clearTimeout(timer); resolve(r); } else { pending--; if (pending === 0 && !done) reject(new Error('all failed')); } })
            .catch(e => { errs.push(e.message); pending--; if (pending === 0 && !done) reject(new Error('all failed: ' + errs[0])); });
    }
});

const dlAudio = async (ytUrl) => {
    const id = ytId(ytUrl);
    if (!id && /^https?:\/\//i.test(ytUrl)) return { url: ytUrl, title: 'audio', thumb: '' };
    if (!id) throw new Error('Invalid YouTube URL');

    // Batch 1: fastest (parallel, 16s window)
    try {
        const r = await firstSuccess([
            () => api_cobalt(ytUrl),
            () => api_piped(id),
            () => api_ndown(id),
        ], 16000);
        if (r?.url) { console.log('  ✔ [music] batch-1'); return { ...r, thumb: '' }; }
    } catch (_) {}

    // Batch 2: medium (parallel, 22s window)
    try {
        const r = await firstSuccess([
            () => api_inv(id),
            () => api_y2mate(ytUrl, id),
            () => api_yt1s(id),
        ], 22000);
        if (r?.url) { console.log('  ✔ [music] batch-2'); return { ...r, thumb: '' }; }
    } catch (_) {}

    // Batch 3: last resort (parallel, 28s window)
    try {
        const r = await firstSuccess([
            () => api_fabdl(id),
            () => api_mp3dl(id),
            () => api_loaderto(id),
            () => api_ytdl_org(id),
        ], 28000);
        if (r?.url) { console.log('  ✔ [music] batch-3'); return { ...r, thumb: '' }; }
    } catch (_) {}

    throw new Error('Music unavailable — all 10 APIs failed. Try again in 30 seconds.');
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN: dlVideo
// ════════════════════════════════════════════════════════════════════════════════
const dlVideo = async (ytUrl, quality = '360') => {
    const id = ytId(ytUrl);
    // cobalt instances
    try {
        const instances = await getCobaltInstances();
        for (const ep of instances.slice(0, 3)) {
            try {
                const r = await axios.post(`${ep}/api/json`,
                    { url: ytUrl, isAudioOnly: false, vQuality: quality },
                    { headers: { 'User-Agent': UAB, 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 14000 });
                const u = r.data?.url || r.data?.video;
                if (u) return { url: u, title: r.data?.filename||'video', thumb: '' };
            } catch (_) {}
        }
    } catch (_) {}
    // piped video
    if (id) {
        for (const m of ['https://pipedapi.kavin.rocks','https://pipedapi.in','https://piped.smnz.de']) {
            try {
                const r = await get(`${m}/streams/${id}`, { timeout: 10000 });
                const streams = (r.data?.videoStreams||[]).filter(s=>s.url).sort((a,b)=>parseInt(b.quality||0)-parseInt(a.quality||0));
                if (streams[0]?.url) return { url: streams[0].url, title: r.data?.title||'video', thumb: '' };
            } catch (_) {}
        }
    }
    throw new Error('Video download failed — try again');
};

const sendAudio = async (sock, m, result, asDoc = false) => {
    const fname = safe(result.title||'audio', 'mp3');
    try {
        await sock.sendMessage(m.chat,
            asDoc ? { document:{url:result.url}, mimetype:'audio/mpeg', fileName:fname }
                  : { audio:{url:result.url}, mimetype:'audio/mpeg', fileName:fname, ptt:false },
            { quoted: m });
    } catch (_) {
        await sock.sendMessage(m.chat, { document:{url:result.url}, mimetype:'audio/mpeg', fileName:fname }, { quoted: m });
    }
};

const sendVideo = async (sock, m, result, caption) =>
    sock.sendMessage(m.chat, {
        video:{url:result.url}, mimetype:'video/mp4',
        fileName:safe(result.title||'video','mp4'),
        caption: caption || `🎬 *${result.title||'Video'}*\n\n> 👁️ 𝐋𝐈𝐀𝐌 𝐄𝐘𝐄𝐒`,
    }, { quoted: m });

const fmtDur = v => v?.duration?.timestamp || v?.duration || '';

module.exports = { dlAudio, dlVideo, sendAudio, sendVideo, fmtDur, ytId, safe };
