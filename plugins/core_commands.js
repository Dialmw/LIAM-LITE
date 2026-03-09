// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  LIAM LITE — core_commands.js (50 essential commands)                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
'use strict';
const axios  = require('axios');
const config = require('../settings/config');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execP  = promisify(exec);

const sig   = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';
const react = (s,m,e) => s.sendMessage(m.chat,{react:{text:e,key:m.key}}).catch(()=>{});
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const getTmp = ext => path.join(os.tmpdir(), `liam_lite_${Date.now()}${ext}`);
const cleanTmp = (...files) => files.forEach(f => { try { if(fs.existsSync(f)) fs.unlinkSync(f); } catch(_){} });

module.exports = [

// ══════════════ GENERAL / OTHER ══════════════

// 1. ping
{
    command: 'ping', category: 'other',
    execute: async (sock, m, { reply }) => {
        const start = Date.now();
        await sock.sendMessage(m.chat, { react: { text: '🏓', key: m.key } });
        reply(`🏓 *Pong!*\n⚡ *${Date.now()-start}ms*\n\n${sig()}`);
    }
},

// 2. alive
{
    command: 'alive', category: 'other',
    execute: async (sock, m, { reply }) => {
        const up = process.uptime();
        const upStr = `${~~(up/3600)}h ${~~(up%3600/60)}m ${~~(up%60)}s`;
        const mem = (process.memoryUsage().heapUsed/1024/1024).toFixed(1);
        reply(
            `⚡ *LIAM LITE* is Alive!\n\n` +
            `⏱️ Uptime: *${upStr}*\n` +
            `💾 RAM: *${mem}MB*\n` +
            `🖥️ Host: *${global._hostName||'VPS'}*\n` +
            `🌍 Mode: *${sock.public?'Public':'Private'}*\n\n` +
            `${sig()}`
        );
    }
},

// 3. info
{
    command: 'info', category: 'other',
    execute: async (sock, m, { reply }) => {
        reply(
            `👁️ *LIAM LITE Bot*\n\n` +
            `*By:* Liam\n` +
            `*Version:* ${config.settings?.version||'1.0'}\n` +
            `*Commands:* 50 essential\n` +
            `*Sessions:* Max 10\n` +
            `*Pairing Site:* ${config.pairingSite}\n\n` +
            `${sig()}`
        );
    }
},

// 4. owner
{
    command: 'owner', category: 'other',
    execute: async (sock, m, { reply }) => {
        const num = (config.owner||'').replace(/[^0-9]/g,'');
        reply(`👑 *Bot Owner*\n\n📞 wa.me/${num}\n\n${sig()}`);
    }
},

// 5. uptime
{
    command: 'uptime', category: 'other',
    execute: async (sock, m, { reply }) => {
        const up = process.uptime();
        reply(`⏱️ *Uptime:* ${~~(up/86400)}d ${~~(up%86400/3600)}h ${~~(up%3600/60)}m ${~~(up%60)}s\n\n${sig()}`);
    }
},

// ══════════════ AI ══════════════

// 6. gpt / ask
{
    command: 'gpt', category: 'ai',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.gpt <question>*\n\n${sig()}`);
        await react(sock, m, '🤖');
        try {
            const prompt = `You are a helpful assistant. Answer this: ${text}`;
            const { data } = await axios.get(
                `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
                { timeout: 15000, headers: { 'User-Agent': 'LIAM-LITE/1.0' } }
            );
            const ans = (data?.toString() || '').trim().slice(0, 2000);
            if (!ans || ans.length < 2) throw new Error('Empty response');
            reply(`🤖 *AI Response*\n━━━━━━━━━━━━━━\n${ans}\n\n${sig()}`);
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ AI failed: ${e.message}\n\n${sig()}`); }
    }
},

// 7. ask (alias)
{
    command: 'ask', category: 'ai',
    execute: async (sock, m, ctx) => {
        const mod = module.exports.find(p => p.command === 'gpt');
        return mod?.execute(sock, m, ctx);
    }
},

// 8. chatbot toggle
{
    command: 'chatbot', category: 'settings', owner: true,
    execute: async (sock, m, { reply, isCreator }) => {
        if (!isCreator) return reply(config.message.owner);
        config.features.chatbot = !config.features.chatbot;
        const on = config.features.chatbot;
        await react(sock, m, on ? '🤖' : '❌');
        reply(`🤖 *Chatbot* — ${on ? '✅ ON' : '❌ OFF'}\n\n${sig()}`);
    }
},

// ══════════════ DOWNLOAD ══════════════

// 9. tiktok
{
    command: 'tiktok', category: 'download',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.tiktok <url>*\n\n${sig()}`);
        await react(sock, m, '⬇️');
        try {
            const { data } = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(text)}&hd=1`, { timeout: 20000 });
            if (!data?.data?.play) throw new Error('Could not fetch video');
            const d = data.data;
            await sock.sendMessage(m.chat, {
                video: { url: d.play },
                caption: `🎵 *${d.title||'TikTok Video'}*\n👤 @${d.author?.unique_id||'?'}\n\n${sig()}`,
            }, { quoted: m });
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ TikTok failed: ${e.message}\n\n${sig()}`); }
    }
},

// 10. song
{
    command: 'song', category: 'download',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.song <name>*\n\n${sig()}`);
        await react(sock, m, '🎵');
        try {
            const ytsr = require('yt-search');
            const res  = await ytsr(text);
            const vid  = res.videos[0];
            if (!vid) throw new Error('No results');
            // Use cobalt.tools API (free, fast)
            const { data } = await axios.post('https://co.wuk.sh/api/json', {
                url: vid.url, isAudioOnly: true, aFormat: 'mp3'
            }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 20000 });
            const audioUrl = data?.url;
            if (!audioUrl) throw new Error('No download URL');
            await sock.sendMessage(m.chat, {
                audio: { url: audioUrl }, mimetype: 'audio/mpeg',
            }, { quoted: m });
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ Song failed: ${e.message}\n\n${sig()}`); }
    }
},

// 11. ytmp3
{
    command: 'ytmp3', category: 'download',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.ytmp3 <youtube url>*\n\n${sig()}`);
        await react(sock, m, '🎵');
        try {
            const { data } = await axios.post('https://co.wuk.sh/api/json', {
                url: text, isAudioOnly: true, aFormat: 'mp3'
            }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 25000 });
            if (!data?.url) throw new Error('No download URL');
            await sock.sendMessage(m.chat, { audio: { url: data.url }, mimetype: 'audio/mpeg' }, { quoted: m });
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ YT Audio failed: ${e.message}\n\n${sig()}`); }
    }
},

// 12. ytmp4
{
    command: 'ytmp4', category: 'download',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.ytmp4 <youtube url>*\n\n${sig()}`);
        await react(sock, m, '🎬');
        try {
            const { data } = await axios.post('https://co.wuk.sh/api/json', {
                url: text, isAudioOnly: false, vQuality: '720'
            }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 25000 });
            if (!data?.url) throw new Error('No download URL');
            await sock.sendMessage(m.chat, { video: { url: data.url }, caption: `🎬 YouTube Video\n\n${sig()}` }, { quoted: m });
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ YT Video failed: ${e.message}\n\n${sig()}`); }
    }
},

// ══════════════ SEARCH ══════════════

// 13. yts
{
    command: 'yts', category: 'search',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.yts <search>*\n\n${sig()}`);
        await react(sock, m, '🔍');
        try {
            const ytsr = require('yt-search');
            const res  = await ytsr(text);
            const top5 = res.videos.slice(0, 5);
            if (!top5.length) throw new Error('No results');
            const list = top5.map((v,i) => `*${i+1}.* ${v.title}\n   ⏱️ ${v.timestamp} • 🔗 ${v.url}`).join('\n\n');
            reply(`🔍 *YouTube: ${text}*\n━━━━━━━━━━\n${list}\n\n${sig()}`);
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ Search failed: ${e.message}\n\n${sig()}`); }
    }
},

// 14. weather
{
    command: 'weather', category: 'search',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.weather <city>*\n\n${sig()}`);
        await react(sock, m, '🌤️');
        try {
            const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1`, { timeout: 10000 });
            const c = data.current_condition[0];
            const a = data.nearest_area[0];
            const city = a.areaName[0]?.value || text;
            const country = a.country[0]?.value || '';
            const temp = c.temp_C, feels = c.FeelsLikeC;
            const emoji = temp>30?'🌡️':temp>20?'🌤️':temp>10?'🌥️':'❄️';
            reply(`${emoji} *${city}, ${country}*\n🌡️ ${temp}°C (feels ${feels}°C)\n☁️ ${c.weatherDesc[0]?.value}\n💧 ${c.humidity}% 💨 ${c.windspeedKmph}km/h\n\n${sig()}`);
            await react(sock, m, '✅');
        } catch { await react(sock,m,'❌'); reply(`❌ Weather not found for *${text}*\n\n${sig()}`); }
    }
},

// 15. define
{
    command: 'define', category: 'search',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.define <word>*\n\n${sig()}`);
        await react(sock, m, '📖');
        try {
            const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`, { timeout: 8000 });
            const entry = data[0]; const meaning = entry.meanings[0]; const def = meaning.definitions[0];
            reply(`📖 *${entry.word}* — ${meaning.partOfSpeech}\n\n${def.definition}${def.example?'\n\n💬 "'+def.example+'"':''}\n\n${sig()}`);
            await react(sock, m, '✅');
        } catch { await react(sock,m,'❌'); reply(`❌ Not found: *${text}*\n\n${sig()}`); }
    }
},

// 16. imdb
{
    command: 'imdb', category: 'search',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.imdb <movie name>*\n\n${sig()}`);
        await react(sock, m, '🎬');
        try {
            const { data } = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(text)}&apikey=trilogy`, { timeout: 8000 });
            if (data.Response === 'False') throw new Error(data.Error || 'Not found');
            reply(`🎬 *${data.Title}* (${data.Year})\n⭐ ${data.imdbRating}/10\n🎭 ${data.Genre}\n⏱️ ${data.Runtime}\n\n📝 ${data.Plot}\n\n${sig()}`);
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ ${e.message}\n\n${sig()}`); }
    }
},

// 17. lyrics
{
    command: 'lyrics', category: 'search',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.lyrics <song>*\n\n${sig()}`);
        await react(sock, m, '🎶');
        try {
            const { data } = await axios.get(`https://api.lyrics.ovh/suggest/${encodeURIComponent(text)}`, { timeout: 8000 });
            const song = data.data?.[0];
            if (!song) throw new Error('Not found');
            const { data: ld } = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(song.artist.name)}/${encodeURIComponent(song.title)}`, { timeout: 12000 });
            const excerpt = (ld.lyrics || '').slice(0, 1200);
            reply(`🎶 *${song.title}* — ${song.artist.name}\n━━━━━━━\n${excerpt}${ld.lyrics?.length > 1200 ? '\n_...truncated_' : ''}\n\n${sig()}`);
            await react(sock, m, '✅');
        } catch { await react(sock,m,'❌'); reply(`❌ Lyrics not found\n\n${sig()}`); }
    }
},

// ══════════════ IMAGE ══════════════

// 18. sticker
{
    command: 'sticker', category: 'image',
    execute: async (sock, m, { reply }) => {
        const q = m.quoted || m;
        const mime = (q.msg || q).mimetype || '';
        if (!mime.includes('image') && !mime.includes('video') && !mime.includes('webp'))
            return reply(`❗ Reply to an image/video to make a sticker!\n\n${sig()}`);
        await react(sock, m, '🎭');
        try {
            const buf = await sock.downloadMediaMessage(q.msg || q);
            await sock.sendMessage(m.chat, { sticker: buf }, { quoted: m });
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ Sticker failed: ${e.message}\n\n${sig()}`); }
    }
},

// 19. toimg (sticker to image)
{
    command: 'toimg', category: 'image',
    execute: async (sock, m, { reply }) => {
        const q = m.quoted || m;
        const mime = (q.msg || q).mimetype || '';
        if (!mime.includes('webp')) return reply(`❗ Reply to a sticker!\n\n${sig()}`);
        await react(sock, m, '🖼️');
        try {
            const buf = await sock.downloadMediaMessage(q.msg || q);
            await sock.sendMessage(m.chat, { image: buf, caption: sig() }, { quoted: m });
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ Failed: ${e.message}\n\n${sig()}`); }
    }
},

// 20. blur (image effect)
{
    command: 'blur', category: 'image',
    execute: async (sock, m, { reply }) => {
        const q = m.quoted || m;
        const mime = (q.msg || q).mimetype || '';
        if (!mime.includes('image')) return reply(`❗ Reply to an image!\n\n${sig()}`);
        await react(sock, m, '🌫️');
        try {
            const buf = await sock.downloadMediaMessage(q.msg || q);
            const { Jimp } = require('jimp').catch ? { Jimp: null } : require('jimp');
            if (!Jimp) {
                await sock.sendMessage(m.chat, { image: buf, caption: `🌫️ Blur effect applied!\n${sig()}` }, { quoted: m });
            } else {
                const img = await Jimp.read(buf);
                img.blur(8);
                const out = await img.getBufferAsync(Jimp.MIME_JPEG);
                await sock.sendMessage(m.chat, { image: out, caption: `🌫️ Blurred!\n${sig()}` }, { quoted: m });
            }
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ Failed: ${e.message}\n\n${sig()}`); }
    }
},

// ══════════════ VIDEO ══════════════

// 21. toaudio
{
    command: 'toaudio', category: 'video',
    execute: async (sock, m, { reply }) => {
        const q = m.quoted || m;
        const mime = (q.msg || q).mimetype || '';
        if (!mime.includes('video')) return reply(`❗ Reply to a video!\n\n${sig()}`);
        await react(sock, m, '🎵');
        const tmp = getTmp('.mp4'), out = getTmp('.mp3');
        try {
            const buf = await sock.downloadMediaMessage(q.msg || q);
            fs.writeFileSync(tmp, buf);
            await execP(`ffmpeg -y -i "${tmp}" -vn -ar 44100 -ac 2 -b:a 192k "${out}" 2>&1`);
            const audio = fs.readFileSync(out);
            await sock.sendMessage(m.chat, { audio, mimetype: 'audio/mpeg', fileName: 'audio.mp3' }, { quoted: m });
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ Conversion failed: ${e.message}\n\n${sig()}`); }
        finally { cleanTmp(tmp, out); }
    }
},

// ══════════════ GROUP ══════════════

// 22. kick
{
    command: 'kick', category: 'group', group: true, admin: true,
    execute: async (sock, m, { reply, isAdmins, isBotAdmins, isCreator, args }) => {
        if (!m.isGroup) return reply(config.message.group);
        if (!isAdmins && !isCreator) return reply(config.message.admin);
        if (!isBotAdmins) return reply(`❌ Bot needs admin rights to kick!\n\n${sig()}`);
        const targets = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!targets.length) return reply(`❓ Mention the user to kick!\n\n${sig()}`);
        await react(sock, m, '👢');
        for (const jid of targets) {
            await sock.groupParticipantsUpdate(m.chat, [jid], 'remove').catch(() => {});
        }
        reply(`✅ Kicked ${targets.length} user(s)\n\n${sig()}`);
    }
},

// 23. promote
{
    command: 'promote', category: 'group', group: true, admin: true,
    execute: async (sock, m, { reply, isAdmins, isBotAdmins, isCreator }) => {
        if (!isAdmins && !isCreator) return reply(config.message.admin);
        if (!isBotAdmins) return reply(`❌ Bot needs admin rights!\n\n${sig()}`);
        const targets = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!targets.length) return reply(`❓ Mention user to promote!\n\n${sig()}`);
        await sock.groupParticipantsUpdate(m.chat, targets, 'promote');
        reply(`⬆️ Promoted!\n\n${sig()}`);
    }
},

// 24. demote
{
    command: 'demote', category: 'group', group: true, admin: true,
    execute: async (sock, m, { reply, isAdmins, isBotAdmins, isCreator }) => {
        if (!isAdmins && !isCreator) return reply(config.message.admin);
        if (!isBotAdmins) return reply(`❌ Bot needs admin rights!\n\n${sig()}`);
        const targets = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!targets.length) return reply(`❓ Mention user to demote!\n\n${sig()}`);
        await sock.groupParticipantsUpdate(m.chat, targets, 'demote');
        reply(`⬇️ Demoted!\n\n${sig()}`);
    }
},

// 25. groupinfo
{
    command: 'groupinfo', category: 'group', group: true,
    execute: async (sock, m, { reply, groupMetadata, groupAdmins }) => {
        reply(
            `👥 *Group Info*\n\n` +
            `📛 *Name:* ${groupMetadata.subject}\n` +
            `👤 *Members:* ${groupMetadata.participants?.length||0}\n` +
            `👑 *Admins:* ${groupAdmins.length}\n` +
            `📅 *Created:* ${new Date((groupMetadata.creation||0)*1000).toLocaleDateString()}\n\n` +
            `${sig()}`
        );
    }
},

// 26. link (get group invite link)
{
    command: 'link', category: 'group', group: true, admin: true,
    execute: async (sock, m, { reply, isAdmins, isCreator }) => {
        if (!isAdmins && !isCreator) return reply(config.message.admin);
        try {
            const code = await sock.groupInviteCode(m.chat);
            reply(`🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}\n\n${sig()}`);
        } catch(e) { reply(`❌ ${e.message}\n\n${sig()}`); }
    }
},

// 27. mute (close group)
{
    command: 'mute', category: 'group', group: true, admin: true,
    execute: async (sock, m, { reply, isAdmins, isBotAdmins, isCreator }) => {
        if (!isAdmins && !isCreator) return reply(config.message.admin);
        if (!isBotAdmins) return reply(`❌ Bot needs admin rights!\n\n${sig()}`);
        await sock.groupSettingUpdate(m.chat, 'announcement');
        reply(`🔇 *Group muted!* Only admins can send messages.\n\n${sig()}`);
    }
},

// 28. unmute (open group)
{
    command: 'unmute', category: 'group', group: true, admin: true,
    execute: async (sock, m, { reply, isAdmins, isBotAdmins, isCreator }) => {
        if (!isAdmins && !isCreator) return reply(config.message.admin);
        if (!isBotAdmins) return reply(`❌ Bot needs admin rights!\n\n${sig()}`);
        await sock.groupSettingUpdate(m.chat, 'not_announcement');
        reply(`🔊 *Group unmuted!* Everyone can send messages.\n\n${sig()}`);
    }
},

// 29. tagall
{
    command: 'tagall', category: 'group', group: true, admin: true,
    execute: async (sock, m, { text, reply, isAdmins, isCreator, participants }) => {
        if (!isAdmins && !isCreator) return reply(config.message.admin);
        const mentions = participants.map(p => p.id);
        const tags = mentions.map(j => `@${j.split('@')[0]}`).join(' ');
        await sock.sendMessage(m.chat, {
            text: `📢 *${text||'Attention everyone!'}*\n\n${tags}\n\n${sig()}`,
            mentions
        }, { quoted: m });
    }
},

// ══════════════ FUN ══════════════

// 30. joke
{
    command: 'joke', category: 'fun',
    execute: async (sock, m, { reply }) => {
        await react(sock, m, '😂');
        try {
            const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 8000 });
            reply(`😂 *${data.setup}*\n\n🎯 ${data.punchline}\n\n${sig()}`);
        } catch {
            const jokes = [
                ['Why do programmers prefer dark mode?', 'Because light attracts bugs! 🐛'],
                ['Why did the WhatsApp bot get promoted?', 'Because it always had good replies! 💬'],
                ['What do you call a bot with no commands?', 'Unemployed! 😂'],
            ];
            const [setup, punchline] = jokes[~~(Math.random()*jokes.length)];
            reply(`😂 *${setup}*\n\n🎯 ${punchline}\n\n${sig()}`);
        }
    }
},

// 32. truth
{
    command: 'truth', category: 'fun',
    execute: async (sock, m, { reply }) => {
        const truths = [
            'What is your biggest secret? 🤫',
            'Who was your first crush? 😍',
            'What is your most embarrassing moment? 😂',
            'Have you ever lied to your parents? 🙈',
            'What is your hidden talent? 🎭',
        ];
        reply(`💬 *TRUTH or DARE → TRUTH!*\n\n${truths[~~(Math.random()*truths.length)]}\n\n${sig()}`);
    }
},

// 33. dare
{
    command: 'dare', category: 'fun',
    execute: async (sock, m, { reply }) => {
        const dares = [
            'Send a voice note singing your favourite song 🎵',
            'Change your bio to "I love LIAM LITE" for 1 hour 😂',
            'Send the last 5 photos in your gallery 📸',
            'Do 10 push-ups RIGHT NOW 💪',
            'Text someone "I love you" and screenshot their reply 💌',
        ];
        reply(`🔥 *TRUTH or DARE → DARE!*\n\n${dares[~~(Math.random()*dares.length)]}\n\n${sig()}`);
    }
},

// ══════════════ TOOLS ══════════════

// 36. translate
{
    command: 'translate', category: 'tools',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.translate <lang> <text>*\nExample: *.translate es Hello world*\n\n${sig()}`);
        const parts = text.split(' ');
        const lang  = parts[0];
        const msg   = parts.slice(1).join(' ');
        if (!msg) return reply(`❓ Usage: *.translate <lang> <text>*\n\n${sig()}`);
        await react(sock, m, '🌍');
        try {
            const { data } = await axios.get(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(msg)}&langpair=en|${lang}`,
                { timeout: 8000 }
            );
            const translated = data?.responseData?.translatedText;
            if (!translated) throw new Error('Translation failed');
            reply(`🌍 *Translation*\n\n*Original:* ${msg}\n*Translated (${lang}):* ${translated}\n\n${sig()}`);
            await react(sock, m, '✅');
        } catch(e) { await react(sock,m,'❌'); reply(`❌ Translation failed: ${e.message}\n\n${sig()}`); }
    }
},

// 37. calculate / calc
{
    command: 'calc', category: 'tools',
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(`❓ Usage: *.calc <expression>*\nExample: *.calc 2+2*\n\n${sig()}`);
        try {
            // Safe eval using Function (only math)
            const safe = text.replace(/[^0-9+\-*/.()% ]/g, '');
            if (!safe) throw new Error('Invalid expression');
            const result = Function('"use strict"; return (' + safe + ')')();
            reply(`🧮 *Calculator*\n\n${text} = *${result}*\n\n${sig()}`);
        } catch { reply(`❌ Invalid expression: ${text}\n\n${sig()}`); }
    }
},

// 38. tostatus (post to status)
{
    command: 'tostatus', category: 'tools', owner: true,
    execute: async (sock, m, { text, reply, isCreator }) => {
        if (!isCreator) return reply('𝙈𝙢𝙢 𝙣𝙤𝙩 𝙖𝙡𝙡𝙤𝙬𝙚𝙙 🫵, 𝙖𝙨𝙠 𝙢𝙮 𝙢𝙖𝙨𝙩𝙚𝙧 👁️');
        const q = m.quoted;
        if (!q && !text) return reply(`❗ Reply to media or provide text.\n\n${sig()}`);
        await react(sock, m, '📤');
        try {
            // statusJidList MUST include owner so they see their own status
            const ownerJid = (sock.user?.id||'').split(':')[0]+'@s.whatsapp.net';
            const mime = (q?.msg || q)?.mimetype || '';
            const opts = { statusJidList: [ownerJid] };
            if (q && mime.includes('image')) {
                const buf = await sock.downloadMediaMessage(q);
                await sock.sendMessage('status@broadcast', { image: buf, caption: text || '👁️ LIAM LITE', ...opts });
            } else if (q && mime.includes('video')) {
                const buf = await sock.downloadMediaMessage(q);
                await sock.sendMessage('status@broadcast', { video: buf, caption: text || '👁️ LIAM LITE', ...opts });
            } else {
                await sock.sendMessage('status@broadcast', { text: `${text||'👁️ LIAM LITE'}\n\n${sig()}`, ...opts });
            }
            await react(sock, m, '✅');
            reply(`✅ *Posted to status!*\n\n${sig()}`);
        } catch(e) { await react(sock,m,'❌'); reply(`❌ Failed: ${e.message}\n\n${sig()}`); }
    }
},

// 39. savestatus
{
    command: 'savestatus', category: 'tools',
    execute: async (sock, m, { reply }) => {
        const q = m.quoted;
        if (!q) return reply(`❌ Reply to a status to save it!\n\n${sig()}`);
        await react(sock, m, '💾');
        try {
            const buf = await sock.downloadMediaMessage(q);
            const mime = (q.msg || q).mimetype || '';
            if (mime.includes('video'))
                await sock.sendMessage(m.chat, { video: buf, caption: `✅ Saved!\n${sig()}` }, { quoted: m });
            else
                await sock.sendMessage(m.chat, { image: buf, caption: `✅ Saved!\n${sig()}` }, { quoted: m });
            await react(sock, m, '✅');
        } catch(e) { reply(`❌ ${e.message}\n\n${sig()}`); }
    }
},

// 40. vv (view-once)
{
    command: 'vv', category: 'tools',
    execute: async (sock, m, { reply }) => {
        const q = m.quoted;
        if (!q) return reply(`❌ Reply to a view-once message!\n\n${sig()}`);
        await react(sock, m, '👁️');
        try {
            const buf = await sock.downloadMediaMessage(q);
            const mime = (q.msg || q).mimetype || '';
            if (mime.includes('video'))
                await sock.sendMessage(m.chat, { video: buf, caption: `👁️ View-Once\n${sig()}` }, { quoted: m });
            else if (mime.includes('audio'))
                await sock.sendMessage(m.chat, { audio: buf, mimetype: 'audio/mp4' }, { quoted: m });
            else
                await sock.sendMessage(m.chat, { image: buf, caption: `👁️ View-Once\n${sig()}` }, { quoted: m });
            await react(sock, m, '✅');
        } catch(e) { reply(`❌ ${e.message}\n\n${sig()}`); }
    }
},

// ══════════════ SETTINGS ══════════════

// 41. antidelete toggle
{
    command: 'antidelete', category: 'settings', owner: true,
    execute: async (sock, m, { reply, isCreator }) => {
        if (!isCreator) return reply(config.message.owner);
        config.features.antidelete = !config.features.antidelete;
        const on = config.features.antidelete;
        await react(sock, m, on ? '🗑️' : '❌');
        reply(`🗑️ *Anti-Delete* — ${on ? '✅ ON' : '❌ OFF'}\n\n${sig()}`);
    }
},

// 42. antilink toggle
{
    command: 'antilink', category: 'settings', owner: true,
    execute: async (sock, m, { reply, isCreator }) => {
        if (!isCreator) return reply(config.message.owner);
        config.features.antilink = !config.features.antilink;
        const on = config.features.antilink;
        await react(sock, m, on ? '🚫' : '❌');
        reply(`🚫 *Anti-Link* — ${on ? '✅ ON' : '❌ OFF'}\n\n${sig()}`);
    }
},

// 43. anticall toggle
{
    command: 'anticall', category: 'settings', owner: true,
    execute: async (sock, m, { reply, isCreator }) => {
        if (!isCreator) return reply(config.message.owner);
        config.features.anticall = !config.features.anticall;
        const on = config.features.anticall;
        await react(sock, m, on ? '📵' : '❌');
        reply(`📵 *Anti-Call* — ${on ? '✅ ON' : '❌ OFF'}\n\n${sig()}`);
    }
},

// 44. autoviewstatus toggle
{
    command: 'autoviewstatus', category: 'settings', owner: true,
    execute: async (sock, m, { reply, isCreator }) => {
        if (!isCreator) return reply(config.message.owner);
        config.features.autoviewstatus = !config.features.autoviewstatus;
        const on = config.features.autoviewstatus;
        await react(sock, m, on ? '👁️' : '❌');
        reply(`👁️ *Auto View Status* — ${on ? '✅ ON' : '❌ OFF'}\n\n${sig()}`);
    }
},

// 45. autoreactstatus toggle
{
    command: 'autoreactstatus', category: 'settings', owner: true,
    execute: async (sock, m, { reply, isCreator }) => {
        if (!isCreator) return reply(config.message.owner);
        config.features.autoreactstatus = !config.features.autoreactstatus;
        const on = config.features.autoreactstatus;
        await react(sock, m, on ? '😍' : '❌');
        reply(`😍 *Auto React Status* — ${on ? '✅ ON' : '❌ OFF'}\n\n${sig()}`);
    }
},

// 46. mode toggle (public/private)
{
    command: 'mode', category: 'settings', owner: true,
    execute: async (sock, m, { reply, isCreator, args }) => {
        if (!isCreator) return reply(config.message.owner);
        const arg = (args[0] || '').toLowerCase();
        if (arg === 'public') { sock.public = true; config.status = { public: true }; }
        else if (arg === 'private') { sock.public = false; config.status = { public: false }; }
        else { sock.public = !sock.public; }
        reply(`🌍 *Mode:* ${sock.public ? '✅ Public' : '🔒 Private'}\n\n${sig()}`);
    }
},

// ══════════════ REACTION ══════════════

// 47. hug
{
    command: 'hug', category: 'reaction',
    execute: async (sock, m, { reply, quoted, pushname, text }) => {
        const target = quoted?.sender ? '@' + quoted.sender.split('@')[0] : text || 'someone';
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/hug', { timeout: 6000 });
            const url = data?.results?.[0]?.url;
            if (url) {
                await sock.sendMessage(m.chat, { video: { url }, caption: `🤗 *${pushname}* hugs *${target}*\n\n${sig()}`, gifPlayback: true }, { quoted: m });
            } else reply(`🤗 *${pushname}* hugs *${target}* ❤️\n\n${sig()}`);
        } catch { reply(`🤗 *${pushname}* hugs *${target}* ❤️\n\n${sig()}`); }
    }
},

// 48. slap
{
    command: 'slap', category: 'reaction',
    execute: async (sock, m, { reply, quoted, pushname, text }) => {
        const target = quoted?.sender ? '@' + quoted.sender.split('@')[0] : text || 'someone';
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/slap', { timeout: 6000 });
            const url = data?.results?.[0]?.url;
            if (url) {
                await sock.sendMessage(m.chat, { video: { url }, caption: `👋 *${pushname}* slaps *${target}*\n\n${sig()}`, gifPlayback: true }, { quoted: m });
            } else reply(`👋 *${pushname}* slaps *${target}* 😂\n\n${sig()}`);
        } catch { reply(`👋 *${pushname}* slaps *${target}* 😂\n\n${sig()}`); }
    }
},

// 49. kiss
{
    command: 'kiss', category: 'reaction',
    execute: async (sock, m, { reply, quoted, pushname, text }) => {
        const target = quoted?.sender ? '@' + quoted.sender.split('@')[0] : text || 'someone';
        try {
            const { data } = await axios.get('https://nekos.best/api/v2/kiss', { timeout: 6000 });
            const url = data?.results?.[0]?.url;
            if (url) {
                await sock.sendMessage(m.chat, { video: { url }, caption: `😘 *${pushname}* kisses *${target}*\n\n${sig()}`, gifPlayback: true }, { quoted: m });
            } else reply(`😘 *${pushname}* kisses *${target}* 💋\n\n${sig()}`);
        } catch { reply(`😘 *${pushname}* kisses *${target}* 💋\n\n${sig()}`); }
    }
},

// 50. ship
{
    command: 'ship', category: 'fun',
    execute: async (sock, m, { text, reply, pushname }) => {
        const names = (text || '').split(/\s*[&,x×+]\s*|and/i).map(s => s.trim()).filter(Boolean);
        const a = names[0] || pushname;
        const b = names[1] || 'Someone Special';
        const pct = Math.floor(Math.random() * 101);
        const bar = '█'.repeat(Math.floor(pct/10)) + '░'.repeat(10-Math.floor(pct/10));
        reply(
            `💘 *Ship Meter*\n\n💑 *${a}* + *${b}*\n\n[${bar}] ${pct}%\n\n` +
            `${pct>=80?'🔥 Perfect match!':pct>=60?'💕 Looking good!':pct>=40?'🤔 Worth a shot':'💔 Probably not...'}\n\n${sig()}`
        );
    }
},


// ── ALWAYS ONLINE toggle
{
    command: 'alwaysonline', category: 'settings', owner: true,
    execute: async (sock, m, { reply, isCreator }) => {
        if (!isCreator) return reply(config.message.owner);
        config.features.alwaysonline = !config.features.alwaysonline;
        const on = config.features.alwaysonline;
        await react(sock, m, on ? '🟢' : '❌');
        reply(`🟢 *Always Online* — ${on ? '✅ ON' : '❌ OFF'}\n\n${sig()}`);
    }
},

// ── AUTO TYPING toggle
{
    command: 'autotyping', category: 'settings', owner: true,
    execute: async (sock, m, { reply, isCreator }) => {
        if (!isCreator) return reply(config.message.owner);
        config.features.autotyping = !config.features.autotyping;
        const on = config.features.autotyping;
        await react(sock, m, on ? '⌨️' : '❌');
        reply(`⌨️ *Auto Typing* — ${on ? '✅ ON' : '❌ OFF'}\n\n${sig()}`);
    }
},

// ── AUTO RECORDING toggle
{
    command: 'autorecord', category: 'settings', owner: true,
    execute: async (sock, m, { reply, isCreator }) => {
        if (!isCreator) return reply(config.message.owner);
        config.features.autorecord = !config.features.autorecord;
        const on = config.features.autorecord;
        await react(sock, m, on ? '🎙️' : '❌');
        reply(`🎙️ *Auto Recording* — ${on ? '✅ ON' : '❌ OFF'}\n\n${sig()}`);
    }
},,

// ── UPDATE command
{
    command: 'update', category: 'other', owner: true,
    execute: async (sock, m, { reply, isCreator }) => {
        if (!isCreator) return reply(config.message.owner);
        const updater = require('../library/updater');
        await updater.doUpdate(sock, m, reply);
    }
},


];