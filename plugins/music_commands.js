// ╔══════════════════════════════════════════════════════════════╗
// ║  LIAM LITE — Music: .play .play2 .plays (multi-song)       ║
// ╚══════════════════════════════════════════════════════════════╝
'use strict';
const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');

const sig  = () => '> 👁️ 𝗟𝗜𝗔𝗠 𝗟𝗜𝗧𝗘 𝗔𝗹𝗽𝗵𝗮';
const DENY = () => '𝙈𝙢𝙢𝙢 𝙪𝙣𝙖𝙪𝙩𝙝𝙤𝙧𝙞𝙯𝙚𝙙 ✋🚫 𝙮𝙤𝙪 𝙘𝙖𝙣\'𝙩 𝙪𝙨𝙚 𝙩𝙝𝙖𝙩';
const react = (sock,m,e) => sock.sendMessage(m.chat,{react:{text:e,key:m.key}}).catch(()=>{});

// ── Audio download helpers (multiple fallback APIs) ─────────────────────────
const DL_APIS = [
    // 1. cobalt.tools (fast)
    async (url) => {
        const r = await axios.post('https://co.wuk.sh/api/json',
            { url, isAudioOnly:true, aFormat:'mp3' },
            { headers:{'Accept':'application/json','Content-Type':'application/json'}, timeout:25000 }
        );
        if (r.data?.url) return r.data.url;
        throw new Error('cobalt: no url');
    },
    // 2. yt-dl via yt-dlp-api
    async (url) => {
        const id = url.match(/[?&]v=([^&]+)/)?.[1] || url.split('/').pop().split('?')[0];
        const r = await axios.get(`https://yt-dlp-api.fly.dev/audio?url=${encodeURIComponent(url)}`, { timeout:30000, responseType:'arraybuffer' });
        if (r.data?.byteLength > 5000) return { buffer: Buffer.from(r.data) };
        throw new Error('yt-dlp-api: bad response');
    },
    // 3. invidious-based download
    async (url) => {
        const id = url.match(/(?:v=|youtu\.be\/|\/v\/)([A-Za-z0-9_-]{11})/)?.[1];
        if (!id) throw new Error('No video ID');
        const r = await axios.get(`https://inv.nadeko.net/api/v1/videos/${id}`, { timeout:15000 });
        const af = r.data?.adaptiveFormats?.filter(f=>f.type?.includes('audio'))?.sort((a,b)=>b.bitrate-a.bitrate)[0];
        if (af?.url) return af.url;
        throw new Error('invidious: no audio format');
    },
    // 4. rapidapi ytdl
    async (url) => {
        const r = await axios.get('https://yt-api.p.rapidapi.com/dl',{
            params:{id: url.match(/[?&]v=([^&]+)/)?.[1] || url, itag:'140'},
            headers:{'X-RapidAPI-Key': process.env.RAPIDAPI_KEY||'','X-RapidAPI-Host':'yt-api.p.rapidapi.com'},
            timeout:20000
        });
        if (r.data?.url) return r.data.url;
        throw new Error('rapidapi: no url');
    },
];

const dlAudio = async (url) => {
    let lastErr;
    for (const api of DL_APIS) {
        try { return await api(url); } catch(e) { lastErr = e; }
    }
    throw new Error(lastErr?.message || 'All APIs failed');
};

// Send audio — try URL first, fallback to buffer
const sendAudio = async (sock, m, result, meta, asDoc=false) => {
    const isUrl   = typeof result === 'string';
    const payload = isUrl
        ? { audio: { url: result }, mimetype:'audio/mpeg', fileName: `${meta.title||'audio'}.mp3` }
        : { audio: result.buffer,   mimetype:'audio/mpeg', fileName: `${meta.title||'audio'}.mp3` };

    if (asDoc) {
        // Send as document for guaranteed delivery
        const docPayload = isUrl
            ? { document:{ url:result }, mimetype:'audio/mpeg', fileName:`${meta.title||'audio'}.mp3`, caption: meta.caption||'' }
            : { document: result.buffer, mimetype:'audio/mpeg', fileName:`${meta.title||'audio'}.mp3`, caption: meta.caption||'' };
        await sock.sendMessage(m.chat, docPayload, { quoted: m });
    } else {
        await sock.sendMessage(m.chat, { ...payload, ptt:false }, { quoted: m });
    }
};

module.exports = [

// ── .play — smart play with multi-API fallback ──────────────────────────────
{
    command:'play', category:'download',
    execute: async (sock,m,{text,reply}) => {
        if (!text) return reply(`🎵 *Usage:* _.play <song name or YouTube URL>_\n_Examples:_\n• _.play Tujuane_\n• _.play https://youtu.be/..._\n\n${sig()}`);
        await react(sock,m,'🎵');
        await reply(`🔍 _Searching:_ *${text}*...\n\n${sig()}`);
        try {
            let url = text, title = text, duration = '', views = '';
            // Search if not a URL
            if (!/^https?:\/\//i.test(text)) {
                const ytsr = require('yt-search');
                const res  = await ytsr(text);
                const vid  = res.videos[0];
                if (!vid) throw new Error('No results found');
                url      = vid.url;
                title    = vid.title;
                duration = vid.duration?.toString() || '';
                views    = vid.views ? `${(vid.views/1000).toFixed(0)}K views` : '';
            }
            await reply(`⬇️ _Downloading:_ *${title}*\n${duration} · ${views}\n\n${sig()}`);
            const result = await dlAudio(url);
            await sendAudio(sock, m, result, { title, caption:`🎵 ${title}\n\n${sig()}` });
            await react(sock,m,'✅');
        } catch(e) {
            await react(sock,m,'❌');
            reply(`❌ *Play failed:* _${e.message}_\n\n_Try_ *.play2* _for document format_\n\n${sig()}`);
        }
    }
},

// ── .play2 — sends as audio document (guaranteed, never fails delivery) ─────
{
    command:'play2', category:'download',
    execute: async (sock,m,{text,reply}) => {
        if (!text) return reply(`🎵 *Usage:* _.play2 <song name>_\n_Sends audio as downloadable file_\n\n${sig()}`);
        await react(sock,m,'🎵');
        await reply(`🔍 _Searching:_ *${text}*...\n\n${sig()}`);
        try {
            let url = text, title = text, duration = '';
            if (!/^https?:\/\//i.test(text)) {
                const ytsr = require('yt-search');
                const res  = await ytsr(text);
                const vid  = res.videos[0];
                if (!vid) throw new Error('No results found');
                url      = vid.url;
                title    = vid.title;
                duration = vid.duration?.toString() || '';
            }
            await reply(`⬇️ _Getting:_ *${title}* ${duration}\n\n${sig()}`);
            const result = await dlAudio(url);
            await sendAudio(sock, m, result, { title }, true); // asDoc=true
            await react(sock,m,'✅');
            await reply(`✅ *Done!* 📁 _Saved as audio file_\n*${title}*\n\n${sig()}`);
        } catch(e) {
            await react(sock,m,'❌');
            reply(`❌ *play2 failed:* _${e.message}_\n\n${sig()}`);
        }
    }
},

// ── .plays — multi-song: sends 3-5 songs ────────────────────────────────────
{
    command:'plays', category:'download',
    execute: async (sock,m,{text,reply,args}) => {
        if (!text) return reply(`🎵 *Usage:* _.plays <query>_\n_Sends top 5 matching songs_\n\n_Examples:_\n• _.plays top Kenya 2024_\n• _.plays Afrobeats hits_\n• _.plays Rayvanny_\n\n${sig()}`);

        // Parse count if user said "play 3 Rema songs" etc
        const countMatch = text.match(/^(\d)\s+/);
        const count = countMatch ? Math.min(5, parseInt(countMatch[1])) : 4;
        const query = countMatch ? text.slice(countMatch[0].length) : text;

        await react(sock,m,'🎵');
        await reply(`🔍 _Searching top ${count} for:_ *${query}*\n\n${sig()}`);

        try {
            const ytsr = require('yt-search');
            const res  = await ytsr(query);
            const vids = res.videos.slice(0, count);
            if (!vids.length) throw new Error('No results');

            // Send list first
            const list = vids.map((v,i)=>`${i+1}. 🎵 *${v.title}* — ${v.duration||'?'}`).join('\n');
            await reply(`🎶 *Sending ${vids.length} songs:*\n\n${list}\n\n_Downloading..._\n\n${sig()}`);

            let sent = 0, failed = 0;
            for (const vid of vids) {
                try {
                    await reply(`⬇️ _Song ${sent+failed+1}/${vids.length}:_ *${vid.title}*\n\n${sig()}`);
                    const result = await dlAudio(vid.url);
                    await sendAudio(sock, m, result, { title: vid.title });
                    sent++;
                    await new Promise(r => setTimeout(r, 1500)); // prevent flood
                } catch(e) {
                    failed++;
                    // Try as doc fallback
                    try {
                        const result2 = await dlAudio(vid.url);
                        await sendAudio(sock, m, result2, { title: vid.title }, true);
                        sent++;
                    } catch {
                        await reply(`⚠️ _Skipped:_ *${vid.title}* — download failed\n\n${sig()}`);
                    }
                }
            }
            await react(sock,m, sent > 0 ? '✅' : '❌');
            await reply(`${sent > 0 ? '✅' : '❌'} *Done!* ${sent}/${vids.length} _songs sent_${failed>0?` (${failed} skipped)`:''}  🎶\n\n${sig()}`);
        } catch(e) {
            await react(sock,m,'❌');
            reply(`❌ *plays failed:* _${e.message}_\n\n${sig()}`);
        }
    }
},

// ── .song — smart song download with fallback ────────────────────────────────
{
    command:'song', category:'download',
    execute: async (sock,m,{text,reply}) => {
        if (!text) return reply(`🎵 *Usage:* _.song <name>_\n\n${sig()}`);
        await react(sock,m,'🎵');
        try {
            const ytsr = require('yt-search');
            const res  = await ytsr(text);
            const vid  = res.videos[0];
            if (!vid) throw new Error('No results');
            await reply(`⬇️ _Downloading:_ *${vid.title}*\n\n${sig()}`);
            const result = await dlAudio(vid.url);
            await sendAudio(sock, m, result, { title: vid.title });
            await react(sock,m,'✅');
        } catch(e) {
            await react(sock,m,'❌');
            reply(`❌ _${e.message}_ — try *.play2*\n\n${sig()}`);
        }
    }
},

];
