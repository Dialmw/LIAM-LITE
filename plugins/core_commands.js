// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  LIAM LITE — core_commands.js  (exact command set per menu spec)       ║
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
const crypto = require('crypto');

const sig   = () => '> 👁️ 𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄';
const react = (s,m,e) => s.sendMessage(m.chat,{react:{text:e,key:m.key}}).catch(()=>{});
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const getTmp = ext => path.join(os.tmpdir(), `liam_lite_${Date.now()}${ext}`);
const ownerOnly = (ctx, r) => { if(!ctx.isCreator) { r(config.message?.owner||'⚠️ Owner only!'); return true; } return false; };

// ── Social download helpers ───────────────────────────────────────────────────
const igDL = async url => {
    const enc = encodeURIComponent(url);
    for (const fn of [
        () => axios.get(`https://api.ryzendesu.vip/api/downloader/igdl?url=${enc}`,{timeout:18000}),
        () => axios.get(`https://api.vreden.my.id/api/igdl?url=${enc}`,{timeout:18000}),
        () => axios.post('https://api.cobalt.tools/api/json',{url,isAudioOnly:false},{headers:{'Content-Type':'application/json','Accept':'application/json'},timeout:18000}),
    ]) {
        try {
            const {data} = await fn();
            const items = data?.data?.result||data?.data||data?.result||data?.media||(data?.url?[{url:data.url}]:null);
            if(items?.length) return items.map(i=>({url:i?.url||i?.download_url||i,type:i?.type||'video'})).filter(i=>i.url);
            if(data?.url) return [{url:data.url,type:'video'}];
        } catch(_){}
    }
    throw new Error('Instagram download failed');
};
const fbDL = async url => {
    const enc = encodeURIComponent(url);
    for (const api of [
        `https://api.tiklydown.eu.org/api/download?url=${enc}`,
        `https://api.ryzendesu.vip/api/downloader/fbdl?url=${enc}`,
    ]) {
        try {
            const {data} = await axios.get(api,{timeout:18000});
            const u = data?.data?.hd||data?.data?.sd||data?.hd||data?.sd||data?.url||data?.result?.[0]?.url;
            if(u) return u;
        } catch(_){}
    }
    throw new Error('Facebook download failed');
};
const twDL = async url => {
    const enc = encodeURIComponent(url);
    for (const api of [
        `https://api.tiklydown.eu.org/api/download?url=${enc}`,
        `https://api.ryzendesu.vip/api/downloader/twitter?url=${enc}`,
    ]) {
        try {
            const {data} = await axios.get(api,{timeout:18000});
            const u = data?.url||data?.data?.[0]?.url||data?.result?.[0]?.url;
            if(u) return u;
        } catch(_){}
    }
    throw new Error('Twitter download failed');
};

module.exports = [

// ══════════════════════════════════════════════════════════════
// AI
// ══════════════════════════════════════════════════════════════
{command:'ask',category:'ai',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`❓ Usage: .ask <question>\n\n${sig()}`);
    await react(sock,m,'🤖');
    try{
        const{data}=await axios.get(`https://text.pollinations.ai/${encodeURIComponent('You are Liam, a helpful WhatsApp assistant. Answer: '+text)}`,{timeout:12000,headers:{'User-Agent':'LIAM-LITE'}});
        const ans=(data?.toString()||'').trim().slice(0,2000);
        if(!ans)throw new Error('Empty response');
        reply(`🤖 ${ans}\n\n${sig()}`);
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ AI failed\n\n${sig()}`);}
}},
{command:'gpt',category:'ai',execute:async(sock,m,ctx)=>{
    const mod=module.exports.find(p=>p.command==='ask');
    return mod?.execute(sock,m,ctx);
}},
{command:'chatbot',category:'settings',execute:async(sock,m,{reply,isCreator})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    config.features.chatbot=!config.features.chatbot;
    const on=config.features.chatbot;
    await react(sock,m,on?'🤖':'❌');
    reply(`🤖 *Chatbot:* ${on?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},

// ══════════════════════════════════════════════════════════════
// DOWNLOAD  (short aliases)
// ══════════════════════════════════════════════════════════════
{command:'tt',category:'download',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`❓ .tt <tiktok url>\n\n${sig()}`);
    await react(sock,m,'⬇️');
    try{
        const{data}=await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(text)}&hd=1`,{timeout:20000});
        if(!data?.data?.play)throw new Error('Not found');
        const d=data.data;
        await sock.sendMessage(m.chat,{video:{url:d.play},caption:`🎵 *${d.title||'TikTok'}*\n👤 @${d.author?.unique_id||'?'}\n\n${sig()}`},{quoted:m});
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ TikTok: ${e.message}\n\n${sig()}`);}
}},
{command:'tiktok',category:'download',execute:async(sock,m,ctx)=>{const p=module.exports.find(x=>x.command==='tt');return p?.execute(sock,m,ctx);}},
{command:'ig',category:'download',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`❓ .ig <instagram url>\n\n${sig()}`);
    await react(sock,m,'📸');
    try{
        const items=await igDL(text);
        if(!items?.length)throw new Error('No media found');
        for(const item of items.slice(0,4)){
            const isVid=item.type?.includes('video')||item.url?.includes('.mp4');
            await sock.sendMessage(m.chat,isVid?{video:{url:item.url},caption:`📸 Instagram\n\n${sig()}`}:{image:{url:item.url},caption:`📸 Instagram\n\n${sig()}`},{quoted:m});
        }
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ Instagram: ${e.message}\n\n${sig()}`);}
}},
{command:'fb',category:'download',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`❓ .fb <facebook url>\n\n${sig()}`);
    await react(sock,m,'📘');
    try{
        const url=await fbDL(text);
        await sock.sendMessage(m.chat,{video:{url},caption:`📘 Facebook Video\n\n${sig()}`},{quoted:m});
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ Facebook: ${e.message}\n\n${sig()}`);}
}},
{command:'tw',category:'download',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`❓ .tw <twitter/x url>\n\n${sig()}`);
    await react(sock,m,'🐦');
    try{
        const url=await twDL(text);
        await sock.sendMessage(m.chat,{video:{url},caption:`🐦 Twitter/X\n\n${sig()}`},{quoted:m});
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ Twitter: ${e.message}\n\n${sig()}`);}
}},
{command:'vid',category:'download',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`❓ .vid <title or YouTube URL>\n\n${sig()}`);
    await react(sock,m,'🎬');
    try{
        let vidUrl=text,title=text;
        if(!/^https?:\/\//i.test(text)){
            const ytsr=require('yt-search');
            const res=await ytsr(text);
            const v=res.videos?.[0];
            if(!v)throw new Error('No results');
            vidUrl=v.url;title=v.title;
        }
        await reply(`⬇️ *Downloading:* _${title}_`);
        const{dlVideo}=require('../library/dl');
        const result=await dlVideo(vidUrl,'360');
        await sock.sendMessage(m.chat,{video:{url:result.url},mimetype:'video/mp4',caption:`🎬 *${result.title||title}*\n\n${sig()}`},{quoted:m});
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ Video: ${e.message}\n\n${sig()}`);}
}},
{command:'video',category:'download',execute:async(sock,m,ctx)=>{const p=module.exports.find(x=>x.command==='vid');return p?.execute(sock,m,ctx);}},
{command:'dl',category:'download',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`❓ .dl <direct url>\n\n${sig()}`);
    await react(sock,m,'⬇️');
    try{
        const{data,headers}=await axios.get(text,{responseType:'arraybuffer',timeout:30000});
        const mime=headers['content-type']||'application/octet-stream';
        const ext=mime.split('/')[1]?.split(';')[0]||'bin';
        const buf=Buffer.from(data);
        if(mime.includes('image'))await sock.sendMessage(m.chat,{image:buf,caption:`⬇️ Downloaded\n\n${sig()}`},{quoted:m});
        else if(mime.includes('video'))await sock.sendMessage(m.chat,{video:buf,caption:`⬇️ Downloaded\n\n${sig()}`},{quoted:m});
        else if(mime.includes('audio'))await sock.sendMessage(m.chat,{audio:buf,mimetype:mime},{quoted:m});
        else await sock.sendMessage(m.chat,{document:buf,mimetype:mime,fileName:`file.${ext}`,caption:`⬇️ Downloaded\n\n${sig()}`},{quoted:m});
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ Download failed: ${e.message}\n\n${sig()}`);}
}},

// ══════════════════════════════════════════════════════════════
// FUN & GAMES
// ══════════════════════════════════════════════════════════════
{command:'8ball',category:'fun',execute:async(sock,m,{text,prefix,reply})=>{
    if(!text)return reply(`🎱 .8ball <question>\n\n${sig()}`);
    const pool=['✅ It is certain','✅ Without a doubt','✅ Yes, definitely','🟡 Ask again later','🟡 Cannot predict now','❌ Don\'t count on it','❌ Very doubtful','❌ My sources say no'];
    await react(sock,m,'🎱');
    reply(`🎱 *Magic 8-Ball*\n\n❓ _${text}_\n\n${pool[~~(Math.random()*pool.length)]}\n\n${sig()}`);
}},
{command:'joke',category:'fun',execute:async(sock,m,{reply})=>{
    await react(sock,m,'😂');
    try{
        const{data}=await axios.get('https://official-joke-api.appspot.com/random_joke',{timeout:8000});
        reply(`😂 *Joke!*\n\n${data.setup}\n\n> _${data.punchline}_\n\n${sig()}`);
    }catch(_){
        const jokes=['Why don\'t scientists trust atoms?\nBecause they make up everything! 😂','I told my wife she was drawing her eyebrows too high.\nShe looked surprised! 😳','Why can\'t a bicycle stand?\nIt\'s two-tired! 🚲'];
        reply(`😂 *Joke!*\n\n${jokes[~~(Math.random()*jokes.length)]}\n\n${sig()}`);
    }
}},
{command:'meme',category:'fun',execute:async(sock,m,{reply})=>{
    await react(sock,m,'😂');
    try{
        const{data}=await axios.get('https://meme-api.com/gimme',{timeout:8000});
        if(!data?.url)throw new Error('No meme');
        await sock.sendMessage(m.chat,{image:{url:data.url},caption:`😂 *${data.title||'Meme'}*\n\n${sig()}`},{quoted:m});
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ Meme failed\n\n${sig()}`);}
}},
{command:'truth',category:'fun',execute:async(sock,m,{reply})=>{
    await react(sock,m,'🤔');
    const truths=['Have you ever lied to get out of trouble?','What\'s your biggest secret?','What\'s the most embarrassing thing you\'ve done?','Have you ever cheated on a test?','What do you fear most?'];
    reply(`🤔 *Truth!*\n\n${truths[~~(Math.random()*truths.length)]}\n\n${sig()}`);
}},
{command:'dare',category:'fun',execute:async(sock,m,{reply})=>{
    await react(sock,m,'😈');
    const dares=['Send a silly selfie 📸','Speak in an accent for the next 5 minutes','Tell us your most embarrassing story','Do 10 pushups right now 💪','Call someone and sing happy birthday'];
    reply(`😈 *Dare!*\n\n${dares[~~(Math.random()*dares.length)]}\n\n${sig()}`);
}},

// ══════════════════════════════════════════════════════════════
// GROUP
// ══════════════════════════════════════════════════════════════
{command:'kick',category:'group',execute:async(sock,m,{reply,isAdmins,isBotAdmins,isCreator,sender})=>{
    if(!m.isGroup)return reply('⚠️ Groups only!\n\n'+sig());
    if(!isAdmins&&!isCreator)return reply('⚠️ Admins only!\n\n'+sig());
    if(!isBotAdmins)return reply('⚠️ Bot needs admin rights!\n\n'+sig());
    const target=m.mentionedJid?.[0]||m.quoted?.sender;
    if(!target)return reply('❓ Tag or reply to the user to kick\n\n'+sig());
    try{await sock.groupParticipantsUpdate(m.chat,[target],'remove');await react(sock,m,'✅');}
    catch(e){await react(sock,m,'❌');reply(`❌ Kick failed: ${e.message}\n\n${sig()}`);}
}},
{command:'tagall',category:'group',execute:async(sock,m,{text,reply,participants,isAdmins,isCreator,groupName})=>{
    if(!m.isGroup)return reply('⚠️ Groups only!\n\n'+sig());
    if(!isAdmins&&!isCreator)return reply('⚠️ Admins only!\n\n'+sig());
    const mentions=participants.map(p=>p.id);
    const msg=(text||`📢 Attention ${groupName}!`)+'\n\n'+mentions.map(j=>`@${j.split('@')[0]}`).join(' ');
    await sock.sendMessage(m.chat,{text:msg,mentions},{quoted:m});
    await react(sock,m,'✅');
}},
{command:'mute',category:'group',execute:async(sock,m,{reply,isAdmins,isBotAdmins,isCreator})=>{
    if(!m.isGroup)return reply('⚠️ Groups only!\n\n'+sig());
    if(!isAdmins&&!isCreator)return reply('⚠️ Admins only!\n\n'+sig());
    if(!isBotAdmins)return reply('⚠️ Bot needs admin!\n\n'+sig());
    try{await sock.groupSettingUpdate(m.chat,'announcement');await react(sock,m,'🔇');reply(`🔇 *Group muted*\n\n${sig()}`);}
    catch(e){reply(`❌ ${e.message}\n\n${sig()}`);}
}},
{command:'unmute',category:'group',execute:async(sock,m,{reply,isAdmins,isBotAdmins,isCreator})=>{
    if(!m.isGroup)return reply('⚠️ Groups only!\n\n'+sig());
    if(!isAdmins&&!isCreator)return reply('⚠️ Admins only!\n\n'+sig());
    if(!isBotAdmins)return reply('⚠️ Bot needs admin!\n\n'+sig());
    try{await sock.groupSettingUpdate(m.chat,'not_announcement');await react(sock,m,'🔊');reply(`🔊 *Group unmuted*\n\n${sig()}`);}
    catch(e){reply(`❌ ${e.message}\n\n${sig()}`);}
}},
{command:'promote',category:'group',execute:async(sock,m,{reply,isAdmins,isBotAdmins,isCreator})=>{
    if(!m.isGroup)return reply('⚠️ Groups only!\n\n'+sig());
    if(!isAdmins&&!isCreator)return reply('⚠️ Admins only!\n\n'+sig());
    if(!isBotAdmins)return reply('⚠️ Bot needs admin!\n\n'+sig());
    const target=m.mentionedJid?.[0]||m.quoted?.sender;
    if(!target)return reply('❓ Tag the user to promote\n\n'+sig());
    try{await sock.groupParticipantsUpdate(m.chat,[target],'promote');await react(sock,m,'⬆️');reply(`✅ Promoted @${target.split('@')[0]}\n\n${sig()}`);}
    catch(e){reply(`❌ ${e.message}\n\n${sig()}`);}
}},
{command:'demote',category:'group',execute:async(sock,m,{reply,isAdmins,isBotAdmins,isCreator})=>{
    if(!m.isGroup)return reply('⚠️ Groups only!\n\n'+sig());
    if(!isAdmins&&!isCreator)return reply('⚠️ Admins only!\n\n'+sig());
    if(!isBotAdmins)return reply('⚠️ Bot needs admin!\n\n'+sig());
    const target=m.mentionedJid?.[0]||m.quoted?.sender;
    if(!target)return reply('❓ Tag the user to demote\n\n'+sig());
    try{await sock.groupParticipantsUpdate(m.chat,[target],'demote');await react(sock,m,'⬇️');reply(`✅ Demoted @${target.split('@')[0]}\n\n${sig()}`);}
    catch(e){reply(`❌ ${e.message}\n\n${sig()}`);}
}},
{command:'antilink',category:'group',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.antilink=arg==='on'?true:arg==='off'?false:!config.features.antilink;
    const on=config.features.antilink;
    await react(sock,m,on?'🔗':'✅');
    reply(`🔗 *Anti-Link:* ${on?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},
{command:'welcome',category:'group',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.welcome=arg==='on'?true:arg==='off'?false:!config.features.welcome;
    const on=config.features.welcome;
    await react(sock,m,on?'👋':'❌');
    reply(`👋 *Welcome/Goodbye:* ${on?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},
{command:'poll',category:'group',execute:async(sock,m,{text,reply})=>{
    if(!m.isGroup)return reply('⚠️ Groups only!\n\n'+sig());
    if(!text||!text.includes(','))return reply('❓ .poll <question>, <opt1>, <opt2>, ...\n\n'+sig());
    const parts=text.split(',').map(s=>s.trim());
    const question=parts[0];
    const options=parts.slice(1).filter(Boolean).slice(0,12);
    if(options.length<2)return reply('❓ Need at least 2 options\n\n'+sig());
    try{
        await sock.sendMessage(m.chat,{poll:{name:question,values:options,selectableCount:1}});
        await react(sock,m,'📊');
    }catch(e){
        // Fallback if poll not supported
        const txt=`📊 *Poll:* ${question}\n\n${options.map((o,i)=>`${i+1}. ${o}`).join('\n')}\n\nReply with your choice!\n\n${sig()}`;
        reply(txt);
    }
}},
{command:'hidetag',category:'group',execute:async(sock,m,{text,reply,participants,isAdmins,isCreator})=>{
    if(!m.isGroup)return reply('⚠️ Groups only!\n\n'+sig());
    if(!isAdmins&&!isCreator)return reply('⚠️ Admins only!\n\n'+sig());
    const mentions=participants.map(p=>p.id);
    await sock.sendMessage(m.chat,{text:text||'📢',mentions},{quoted:m});
    await react(sock,m,'✅');
}},
{command:'link',category:'group',execute:async(sock,m,{reply,isAdmins,isCreator})=>{
    if(!m.isGroup)return reply('⚠️ Groups only!\n\n'+sig());
    if(!isAdmins&&!isCreator)return reply('⚠️ Admins only!\n\n'+sig());
    try{const code=await sock.groupInviteCode(m.chat);reply(`🔗 *Group Link:*\nhttps://chat.whatsapp.com/${code}\n\n${sig()}`);}
    catch(e){reply(`❌ ${e.message}\n\n${sig()}`);}
}},

// ══════════════════════════════════════════════════════════════
// IMAGE
// ══════════════════════════════════════════════════════════════
{command:'blur',category:'image',execute:async(sock,m,{reply})=>{
    const q=m.quoted||m;
    const mime=(q.msg||q).mimetype||'';
    if(!mime.includes('image'))return reply('❗ Reply to an image\n\n'+sig());
    await react(sock,m,'🔵');
    try{
        const buf=await sock.downloadMediaMessage(q);
        const FormData=require('form-data');
        const form=new FormData();
        form.append('image',buf,{filename:'img.jpg',contentType:'image/jpeg'});
        const{data}=await axios.post('https://api.deepai.org/api/waifu2x',form,{headers:{...form.getHeaders(),'api-key':'quickstart-QUdJIGlzIGNvbWluZy4uLi4K'},timeout:20000,responseType:'arraybuffer'}).catch(()=>({data:null}));
        if(data&&Buffer.from(data).length>1000){
            await sock.sendMessage(m.chat,{image:Buffer.from(data),caption:`🔵 *Blurred*\n\n${sig()}`},{quoted:m});
        } else {
            // Simple blur using a tint overlay approach via URL
            await sock.sendMessage(m.chat,{image:buf,caption:`🔵 *Image*\n_Blur processing unavailable_\n\n${sig()}`},{quoted:m});
        }
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ Blur failed: ${e.message}\n\n${sig()}`);}
}},
{command:'sticker',category:'image',execute:async(sock,m,{reply})=>{
    const q=m.quoted||m;
    const mime=(q.msg||q).mimetype||'';
    if(!mime.includes('image')&&!mime.includes('video')&&!mime.includes('webp'))return reply('❗ Reply to an image or video\n\n'+sig());
    await react(sock,m,'🎨');
    try{
        if(mime.includes('video'))await sock.sendVideoAsSticker(m.chat,await sock.downloadMediaMessage(q),m,{packname:'LIAM LITE',author:'Liam'});
        else await sock.sendImageAsSticker(m.chat,await sock.downloadMediaMessage(q),m,{packname:'LIAM LITE',author:'Liam'});
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ Sticker failed: ${e.message}\n\n${sig()}`);}
}},
{command:'toimg',category:'image',execute:async(sock,m,{reply})=>{
    const q=m.quoted||m;
    if(!(q?.msg?.mimetype||'').includes('webp')&&!((q?.mimetype||'').includes('webp')))return reply('❗ Reply to a sticker\n\n'+sig());
    try{
        const buf=await sock.downloadMediaMessage(q.msg||q);
        await sock.sendMessage(m.chat,{image:buf,caption:`🖼️ *Converted*\n\n${sig()}`},{quoted:m});
        await react(sock,m,'✅');
    }catch(e){reply(`❌ ${e.message}\n\n${sig()}`);}
}},
{command:'take',category:'image',execute:async(sock,m,ctx)=>{
    if(!ctx.isCreator)return ctx.reply(`⚠️ Owner only!\n\n${sig()}`);
    const arg=(ctx.args[0]||'').toLowerCase();
    const current=!!config.features?.stickerCollect;
    const on=arg==='on'?true:arg==='off'?false:!current;
    if(!config.features)config.features={};
    config.features.stickerCollect=on;
    await react(sock,m,on?'🎴':'❌');
    ctx.reply(`🎴 *Sticker Collect*\n\n`+(on
        ?`╔═══════════════════╗\n║  ✅  E N A B L E D  ║\n╚═══════════════════╝\n\n_Every sticker sent in any chat is saved to .stickerpark_`
        :`╔══════════════════════╗\n║  ❌  D I S A B L E D  ║\n╚══════════════════════╝\n\n_Collection stopped_`
    )+`\n\n${sig()}`);
}},
{command:'stickerpark',category:'image',execute:async(sock,m,ctx)=>{
    const _fs=require('fs'),_path=require('path');
    const dir=_path.join(__dirname,'..','settings','stickerpark');
    if(!_fs.existsSync(dir))return ctx.reply(`📭 Sticker park empty.\nEnable with *.take on*\n\n${sig()}`);
    const files=_fs.readdirSync(dir).filter(f=>f.endsWith('.webp'));
    if(!files.length)return ctx.reply(`📭 No stickers collected yet.\nEnable with *.take on*\n\n${sig()}`);
    await react(sock,m,'🎴');
    await ctx.reply(`🎴 *Sticker Park* — ${files.length} sticker${files.length!==1?'s':''}\n\n${sig()}`);
    for(const file of files.slice(0,20)){
        const buf=_fs.readFileSync(_path.join(dir,file));
        await sock.sendMessage(m.chat,{sticker:buf},{quoted:m}).catch(()=>{});
    }
    if(files.length>20)await ctx.reply(`_Showing 20 of ${files.length}._\n\n${sig()}`);
    await react(sock,m,'✅');
}},

// ══════════════════════════════════════════════════════════════
// OTHER
// ══════════════════════════════════════════════════════════════
{command:'alive',category:'other',execute:async(sock,m,{reply})=>{
    const up=process.uptime();
    const d=~~(up/86400),h=~~(up%86400/3600),mn=~~(up%3600/60),s=~~(up%60);
    const mem=(process.memoryUsage().heapUsed/1024/1024).toFixed(1);
    const ping=Math.max(0,Date.now()-(m.messageTimestamp||0)*1000);
    await react(sock,m,'⚡');
    reply(`⚡ *LIAM LITE — Online!*\n\n⏱️ Uptime: ${d}d ${h}h ${mn}m ${s}s\n💾 RAM: ${mem}MB\n📶 Ping: ${ping}ms\n🖥️ Host: ${global._hostName||'Panel'}\n\n${sig()}`);
}},
{command:'ping',category:'other',execute:async(sock,m,{reply})=>{
    const start=Date.now();
    await react(sock,m,'🏓');
    reply(`🏓 *Pong!* ${Date.now()-start}ms\n\n${sig()}`);
}},
{command:'uptime',category:'other',execute:async(sock,m,{reply})=>{
    const up=process.uptime();
    const d=~~(up/86400),h=~~(up%86400/3600),mn=~~(up%3600/60);
    reply(`⏱️ *Uptime:* ${d}d ${h}h ${mn}m\n\n${sig()}`);
}},
{command:'owner',category:'other',execute:async(sock,m,{reply})=>{
    const num=(config.owner||config.adminNumber||'').replace(/[^0-9]/g,'');
    reply(`👑 *Owner:*\nhttps://wa.me/${num}\n\n${sig()}`);
}},
{command:'about',category:'other',execute:async(sock,m,{reply})=>{
    reply(`👁️ *LIAM LITE*\n\nFast & light WhatsApp bot\n📦 Source: ${config.github||'https://github.com/Dialmw/LIAM-LITE'}\n🔗 Pair: ${config.pairingSite||'https://liam-scanner.onrender.com/pair'}\n\n${sig()}`);
}},
{command:'repo',category:'other',execute:async(sock,m,{reply})=>{
    reply(`🐙 *Repository:*\n${config.github||'https://github.com/Dialmw/LIAM-LITE'}\n\n${sig()}`);
}},

// ══════════════════════════════════════════════════════════════
// REACTION
// ══════════════════════════════════════════════════════════════
{command:'hug',category:'reaction',execute:async(sock,m,{pushname,reply})=>{
    const target=m.mentionedJid?.[0]||m.quoted?.sender;
    const t=target?`@${target.split('@')[0]}`:'someone';
    const gifs=['https://media.giphy.com/media/3M4NpbLCTxBqU/giphy.gif','https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif'];
    try{await sock.sendMessage(m.chat,{image:{url:gifs[~~(Math.random()*gifs.length)]},caption:`🤗 *${pushname}* hugs ${t}!\n\n${sig()}`,mentions:target?[target]:[]},{quoted:m});}
    catch(_){reply(`🤗 *${pushname}* hugs ${t}!\n\n${sig()}`);}
}},
{command:'kiss',category:'reaction',execute:async(sock,m,{pushname,reply})=>{
    const target=m.mentionedJid?.[0]||m.quoted?.sender;
    const t=target?`@${target.split('@')[0]}`:'someone';
    try{await sock.sendMessage(m.chat,{image:{url:'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif'},caption:`😘 *${pushname}* kisses ${t}!\n\n${sig()}`,mentions:target?[target]:[]},{quoted:m});}
    catch(_){reply(`😘 *${pushname}* kisses ${t}!\n\n${sig()}`);}
}},
{command:'slap',category:'reaction',execute:async(sock,m,{pushname,reply})=>{
    const target=m.mentionedJid?.[0]||m.quoted?.sender;
    const t=target?`@${target.split('@')[0]}`:'someone';
    try{await sock.sendMessage(m.chat,{image:{url:'https://media.giphy.com/media/uqSU9IEIEBBaW/giphy.gif'},caption:`👋 *${pushname}* slaps ${t}!\n\n${sig()}`,mentions:target?[target]:[]},{quoted:m});}
    catch(_){reply(`👋 *${pushname}* slaps ${t}!\n\n${sig()}`);}
}},
{command:'bite',category:'reaction',execute:async(sock,m,{pushname,reply})=>{
    const target=m.mentionedJid?.[0]||m.quoted?.sender;
    const t=target?`@${target.split('@')[0]}`:'someone';
    reply(`🦷 *${pushname}* bites ${t}! Ouch! 😱\n\n${sig()}`);
}},
{command:'cuddle',category:'reaction',execute:async(sock,m,{pushname,reply})=>{
    const target=m.mentionedJid?.[0]||m.quoted?.sender;
    const t=target?`@${target.split('@')[0]}`:'someone';
    try{await sock.sendMessage(m.chat,{image:{url:'https://media.giphy.com/media/l2QDM9Jnim1YVILXa/giphy.gif'},caption:`🥰 *${pushname}* cuddles ${t}!\n\n${sig()}`,mentions:target?[target]:[]},{quoted:m});}
    catch(_){reply(`🥰 *${pushname}* cuddles ${t}!\n\n${sig()}`);}
}},

// ══════════════════════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════════════════════
{command:'weather',category:'search',execute:async(sock,m,{text,prefix,reply})=>{
    if(!text)return reply(`☀️ .weather <city>\n\n${sig()}`);
    try{
        const{data}=await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1`,{timeout:8000});
        const cur=data.current_condition[0];
        const loc=data.nearest_area[0];
        const city=loc.areaName[0].value+', '+loc.country[0].value;
        reply(`☀️ *${city}*\n\n🌡️ ${cur.temp_C}°C / ${cur.temp_F}°F\n💧 Humidity: ${cur.humidity}%\n💨 Wind: ${cur.windspeedKmph}km/h\n☁️ ${cur.weatherDesc[0].value}\n\n${sig()}`);
    }catch(_){reply(`❌ City not found\n\n${sig()}`);}
}},
{command:'lyrics',category:'search',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`🎵 .lyrics <song name>\n\n${sig()}`);
    await react(sock,m,'🎵');
    try{
        const{data}=await axios.get(`https://api.lyrics.ovh/suggest/${encodeURIComponent(text)}`,{timeout:10000});
        const song=data.data?.[0];
        if(!song)throw new Error('Not found');
        const{data:ld}=await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(song.artist.name)}/${encodeURIComponent(song.title)}`,{timeout:10000});
        const lyr=(ld.lyrics||'').slice(0,2000);
        reply(`🎵 *${song.title}* — ${song.artist.name}\n\n${lyr}\n\n${sig()}`);
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ Lyrics not found\n\n${sig()}`);}
}},
{command:'imdb',category:'search',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`🎬 .imdb <movie/show name>\n\n${sig()}`);
    await react(sock,m,'🎬');
    try{
        const{data}=await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(text)}&apikey=trilogy`,{timeout:8000});
        if(data.Response==='False')throw new Error(data.Error||'Not found');
        reply(`🎬 *${data.Title}* (${data.Year})\n\n⭐ IMDB: ${data.imdbRating}\n🎭 Genre: ${data.Genre}\n📝 ${data.Plot?.slice(0,200)}\n🎥 Director: ${data.Director}\n\n${sig()}`);
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ ${e.message}\n\n${sig()}`);}
}},

// ══════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════
{command:'mode',category:'settings',execute:async(sock,m,{args,reply,isCreator})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    const arg=(args[0]||'').toLowerCase();
    if(arg==='public'){sock.public=true;config.status={...config.status,public:true};}
    else if(arg==='private'){sock.public=false;config.status={...config.status,public:false};}
    else{sock.public=!sock.public;config.status={...config.status,public:sock.public};}
    await react(sock,m,'🌍');
    reply(`🌍 *Mode:* ${sock.public?'Public':'Private'}\n\n${sig()}`);
}},
{command:'setprefix',category:'settings',execute:async(sock,m,{args,reply,isCreator})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    if(!args[0])return reply(`❓ .setprefix <symbol>\nExample: .setprefix !\n\n${sig()}`);
    config.prefix=args[0];
    reply(`✅ *Prefix set to:* ${args[0]}\n\n${sig()}`);
}},
{command:'antidelete',category:'settings',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    const on=arg==='on'?true:arg==='off'?false:!config.features.antidelete;
    config.features.antidelete=on;
    await react(sock,m,on?'🗑️':'❌');
    reply(`🗑️ *Anti-Delete:* ${on?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},
{command:'sudo',category:'settings',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    const target=m.mentionedJid?.[0]||m.quoted?.sender;
    if(!target)return reply(`❓ Tag the user to add/remove as sudo\n\n${sig()}`);
    const num=target.split('@')[0];
    config.sudo=config.sudo||[];
    const idx=config.sudo.indexOf(num);
    if(idx===-1){config.sudo.push(num);reply(`✅ @${num} added as sudo\n\n${sig()}`);}
    else{config.sudo.splice(idx,1);reply(`✅ @${num} removed from sudo\n\n${sig()}`);}
}},
{command:'antibot',category:'settings',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.antibug=arg==='on'?true:arg==='off'?false:!config.features.antibug;
    await react(sock,m,config.features.antibug?'🛡️':'❌');
    reply(`🛡️ *Anti-Bot/Bug:* ${config.features.antibug?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},
{command:'antiban',category:'settings',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.antibug=arg==='on'?true:arg==='off'?false:!config.features.antibug;
    reply(`🛡️ *Anti-Ban:* ${config.features.antibug?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},
{command:'antiflood',category:'settings',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.antiflood=arg==='on'?true:arg==='off'?false:!config.features.antiflood;
    await react(sock,m,config.features.antiflood?'🌊':'❌');
    reply(`🌊 *Anti-Flood:* ${config.features.antiflood?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},
{command:'autoread',category:'settings',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.autoread=arg==='on'?true:arg==='off'?false:!config.features.autoread;
    await react(sock,m,config.features.autoread?'👁️':'❌');
    reply(`👁️ *Auto-Read:* ${config.features.autoread?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},
{command:'autoviewstatus',category:'settings',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.autoviewstatus=arg==='on'?true:arg==='off'?false:!config.features.autoviewstatus;
    await react(sock,m,config.features.autoviewstatus?'👀':'❌');
    reply(`👀 *Auto View Status:* ${config.features.autoviewstatus?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},
{command:'autoreactstatus',category:'settings',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.autoreactstatus=arg==='on'?true:arg==='off'?false:!config.features.autoreactstatus;
    await react(sock,m,config.features.autoreactstatus?'😍':'❌');
    reply(`😍 *Auto React Status:* ${config.features.autoreactstatus?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},
{command:'setstatusemoji',category:'settings',execute:async(sock,m,{text,reply,isCreator})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    if(!text)return reply(`❓ .setstatusemoji 😍 🔥 💯\n_Space-separated emojis_\n\n${sig()}`);
    const emojis=text.trim().split(/\s+/).filter(Boolean);
    config.statusReactEmojis=emojis;
    reply(`✅ *Status emojis:* ${emojis.join(' ')}\n\n${sig()}`);
}},
{command:'pair',category:'settings',execute:async(sock,m,{reply})=>{
    reply(`🔗 *Pair Site:*\n${config.pairingSite||'https://liam-scanner.onrender.com/pair'}\n\n${sig()}`);
}},
{command:'anticall',category:'settings',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.anticall=arg==='on'?true:arg==='off'?false:!config.features.anticall;
    await react(sock,m,config.features.anticall?'📵':'❌');
    reply(`📵 *Anti-Call:* ${config.features.anticall?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},

// ══════════════════════════════════════════════════════════════
// TOOLS
// ══════════════════════════════════════════════════════════════
{command:'calc',category:'tools',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`🧮 .calc <expression>\nExample: .calc 25*4+10\n\n${sig()}`);
    try{
        const safe=text.replace(/[^0-9+\-*/().^%\s]/g,'');
        const result=Function(`"use strict";return (${safe})`)();
        reply(`🧮 *Calculator*\n\n${text} = *${result}*\n\n${sig()}`);
    }catch(_){reply(`❌ Invalid expression\n\n${sig()}`);}
}},
{command:'translate',category:'tools',execute:async(sock,m,{text,prefix,reply})=>{
    if(!text)return reply(`🌍 .translate <lang> <text>\nExample: .translate sw Hello\n\n${sig()}`);
    const parts=text.split(' ');
    const lang=parts[0]||'en';
    const q=parts.slice(1).join(' ');
    if(!q)return reply(`🌍 .translate <lang> <text>\n\n${sig()}`);
    try{
        const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(q)}`;
        const{data}=await axios.get(url,{timeout:8000});
        const translated=(data[0]||[]).map(v=>v[0]).join('');
        reply(`🌍 *Translation (→${lang})*\n\n${translated}\n\n${sig()}`);
    }catch(_){reply(`❌ Translation failed\n\n${sig()}`);}
}},
{command:'tts',category:'tools',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`🔊 .tts <text>\n\n${sig()}`);
    await react(sock,m,'🔊');
    try{
        const url=`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
        await sock.sendMessage(m.chat,{audio:{url},mimetype:'audio/mpeg',ptt:true},{quoted:m});
        await react(sock,m,'✅');
    }catch(_){reply(`❌ TTS failed\n\n${sig()}`);}
}},
{command:'qr',category:'tools',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`🔲 .qr <text or url>\n\n${sig()}`);
    await react(sock,m,'🔲');
    try{
        const url=`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(text)}`;
        await sock.sendMessage(m.chat,{image:{url},caption:`🔲 *QR Code*\n📝 ${text.slice(0,50)}\n\n${sig()}`},{quoted:m});
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ ${e.message}\n\n${sig()}`);}
}},
{command:'ssweb',category:'tools',execute:async(sock,m,{args,reply})=>{
    const url=args[0];
    if(!url||!url.startsWith('http'))return reply(`📸 .ssweb <url>\nExample: .ssweb https://google.com\n\n${sig()}`);
    await react(sock,m,'📸');
    try{
        const ssUrl=`https://image.thum.io/get/width/1280/png/${encodeURIComponent(url)}`;
        await sock.sendMessage(m.chat,{image:{url:ssUrl},caption:`📸 *Screenshot*\n🌐 ${url}\n\n${sig()}`},{quoted:m});
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ Screenshot failed\n\n${sig()}`);}
}},
{command:'base64',category:'tools',execute:async(sock,m,{args,text,reply})=>{
    if(!text)return reply(`🔐 .base64 encode <text>  or  .base64 decode <b64>\n\n${sig()}`);
    const mode=(args[0]||'encode').toLowerCase();
    const input=text.replace(/^(encode|decode)\s+/i,'').trim();
    if(!input)return reply(`❓ Provide text to encode/decode\n\n${sig()}`);
    try{
        const result=mode==='decode'?Buffer.from(input,'base64').toString('utf8'):Buffer.from(input).toString('base64');
        reply(`🔐 *Base64 ${mode}*\n\n\`${result.slice(0,500)}\`\n\n${sig()}`);
    }catch(_){reply(`❌ Failed\n\n${sig()}`);}
}},
{command:'genpass',category:'tools',execute:async(sock,m,{args,reply})=>{
    const len=Math.min(Math.max(parseInt(args[0])||16,6),64);
    const charset='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
    const pass=Array.from(crypto.randomBytes(len)).map(b=>charset[b%charset.length]).join('');
    reply(`🔐 *Password (${len} chars)*\n\n\`${pass}\`\n\n⚠️ Never share passwords!\n\n${sig()}`);
}},
{command:'uuid',category:'tools',execute:async(sock,m,{reply})=>{
    const uuid=crypto.randomUUID?crypto.randomUUID():[8,4,4,4,12].map(n=>crypto.randomBytes(Math.ceil(n/2)).toString('hex').slice(0,n)).join('-');
    reply(`🔑 *UUID*\n\n\`${uuid}\`\n\n${sig()}`);
}},
{command:'ip',category:'tools',execute:async(sock,m,{args,reply})=>{
    const host=args[0];
    if(!host)return reply(`🌐 .ip <domain or IP>\nExample: .ip google.com\n\n${sig()}`);
    await react(sock,m,'🌐');
    try{
        const{data}=await axios.get(`https://ipapi.co/${host}/json/`,{timeout:8000});
        if(data.error)throw new Error(data.reason||'Not found');
        reply(`🌐 *IP Info: ${host}*\n\n📍 ${data.city||'?'}, ${data.region||'?'}, ${data.country_name||'?'}\n🌍 Continent: ${data.continent_code||'?'}\n📡 ISP: ${data.org||'?'}\n🏳️ Country Code: ${data.country||'?'}\n\n${sig()}`);
        await react(sock,m,'✅');
    }catch(e){await react(sock,m,'❌');reply(`❌ ${e.message}\n\n${sig()}`);}
}},
{command:'time',category:'tools',execute:async(sock,m,{text,reply})=>{
    const tz=text||config.timezone||'Africa/Nairobi';
    try{
        const now=new Date().toLocaleString('en-US',{timeZone:tz,dateStyle:'full',timeStyle:'medium'});
        reply(`🕒 *Time — ${tz}*\n\n${now}\n\n${sig()}`);
    }catch(_){reply(`❌ Invalid timezone\nUse format: Africa/Nairobi\n\n${sig()}`);}
}},

// ══════════════════════════════════════════════════════════════
// VIDEO (convert)
// ══════════════════════════════════════════════════════════════
{command:'toaudio',category:'video',execute:async(sock,m,{reply})=>{
    const q=m.quoted||m;
    const mime=(q.msg||q).mimetype||'';
    if(!mime.includes('video')&&!mime.includes('audio'))return reply('❗ Reply to a video or audio message\n\n'+sig());
    await react(sock,m,'🎵');
    try{
        const buf=await sock.downloadMediaMessage(q);
        const tmp=getTmp('.mp4');
        const out=getTmp('.mp3');
        fs.writeFileSync(tmp,buf);
        await execP(`ffmpeg -i "${tmp}" -vn -ab 128k -ar 44100 "${out}" -y`);
        const audio=fs.readFileSync(out);
        await sock.sendMessage(m.chat,{audio,mimetype:'audio/mpeg',ptt:false},{quoted:m});
        await react(sock,m,'✅');
        try{fs.unlinkSync(tmp);fs.unlinkSync(out);}catch(_){}
    }catch(e){await react(sock,m,'❌');reply(`❌ Convert failed: ${e.message}\n\n${sig()}`);}
}},
{command:'tovideo',category:'video',execute:async(sock,m,{reply})=>{
    const q=m.quoted||m;
    const mime=(q.msg||q).mimetype||'';
    if(!mime.includes('audio'))return reply('❗ Reply to an audio message\n\n'+sig());
    await react(sock,m,'🎬');
    try{
        const buf=await sock.downloadMediaMessage(q);
        const tmp=getTmp('.mp3');
        const out=getTmp('.mp4');
        fs.writeFileSync(tmp,buf);
        await execP(`ffmpeg -f lavfi -i color=c=black:size=480x360 -i "${tmp}" -shortest -c:v libx264 -c:a aac "${out}" -y`);
        const video=fs.readFileSync(out);
        await sock.sendMessage(m.chat,{video,mimetype:'video/mp4',caption:'🎬 Converted\n\n'+sig()},{quoted:m});
        await react(sock,m,'✅');
        try{fs.unlinkSync(tmp);fs.unlinkSync(out);}catch(_){}
    }catch(e){await react(sock,m,'❌');reply(`❌ Convert failed: ${e.message}\n\n${sig()}`);}
}},
{command:'volvideo',category:'video',execute:async(sock,m,{args,reply})=>{
    const q=m.quoted||m;
    const mime=(q.msg||q).mimetype||'';
    if(!mime.includes('video'))return reply('❗ Reply to a video\n\n'+sig());
    const vol=parseFloat(args[0])||2.0;
    await react(sock,m,'🔊');
    try{
        const buf=await sock.downloadMediaMessage(q);
        const tmp=getTmp('.mp4');
        const out=getTmp('_vol.mp4');
        fs.writeFileSync(tmp,buf);
        await execP(`ffmpeg -i "${tmp}" -vf "null" -af "volume=${vol}" "${out}" -y`);
        const video=fs.readFileSync(out);
        await sock.sendMessage(m.chat,{video,mimetype:'video/mp4',caption:`🔊 Volume x${vol}\n\n${sig()}`},{quoted:m});
        await react(sock,m,'✅');
        try{fs.unlinkSync(tmp);fs.unlinkSync(out);}catch(_){}
    }catch(e){await react(sock,m,'❌');reply(`❌ ${e.message}\n\n${sig()}`);}
}},

// ══════════════════════════════════════════════════════════════
// GENERAL
// ══════════════════════════════════════════════════════════════
{command:'afk',category:'general',execute:async(sock,m,{text,reply,sender})=>{
    global._afkUsers=global._afkUsers||new Map();
    global._afkUsers.set(sender,{reason:text||'AFK',since:Date.now()});
    await react(sock,m,'💤');
    reply(`💤 *AFK mode on*\n_${text||'Away from keyboard'}_\n\n${sig()}`);
}},
{command:'note',category:'general',execute:async(sock,m,{text,reply,sender})=>{
    global._notes=global._notes||new Map();
    if(!text)return reply(`📝 Your notes:\n${[...(global._notes.get(sender)||[])].join('\n')||'No notes'}\n\n${sig()}`);
    const notes=global._notes.get(sender)||[];
    notes.push(text);
    global._notes.set(sender,notes);
    reply(`📝 *Note saved!*\n_${text}_\n\n${sig()}`);
}},
{command:'pm',category:'general',execute:async(sock,m,{text,reply})=>{
    const target=m.mentionedJid?.[0];
    const msg=text?.replace(/@\S+\s*/,'').trim();
    if(!target||!msg)return reply(`❓ .pm @user <message>\n\n${sig()}`);
    try{
        await sock.sendMessage(target,{text:`📨 Message from ${m.pushName||'someone'}:\n\n${msg}\n\n${sig()}`});
        await react(sock,m,'✅');
        reply(`✅ Message sent!\n\n${sig()}`);
    }catch(e){reply(`❌ ${e.message}\n\n${sig()}`);}
}},
{command:'speed',category:'general',execute:async(sock,m,{reply})=>{
    const start=Date.now();
    await react(sock,m,'⚡');
    const ping=Date.now()-start;
    const mem=(process.memoryUsage().heapUsed/1024/1024).toFixed(1);
    reply(`⚡ *Speed Test*\n\n🏓 Ping: ${ping}ms\n💾 RAM: ${mem}MB\n\n${sig()}`);
}},
{command:'color',category:'general',execute:async(sock,m,{text,reply})=>{
    if(!text)return reply(`🎨 .color <hex or name>\nExample: .color #ff6b6b\n\n${sig()}`);
    await react(sock,m,'🎨');
    try{
        const hex=text.startsWith('#')?text:`#${text}`;
        const url=`https://www.thecolorapi.com/id?hex=${hex.replace('#','')}&format=json`;
        const{data}=await axios.get(url,{timeout:8000});
        reply(`🎨 *Color: ${hex}*\n\n🏷️ Name: ${data.name?.value||'?'}\n🔴 RGB: ${data.rgb?.value||'?'}\n🔵 HEX: ${data.hex?.value||hex}\n🎨 HSL: ${data.hsl?.value||'?'}\n\n${sig()}`);
        await react(sock,m,'✅');
    }catch(_){reply(`❌ Invalid color\n\n${sig()}`);}
}},

// ══════════════════════════════════════════════════════════════
// OWNER
// ══════════════════════════════════════════════════════════════
{command:'kill',category:'owner',execute:async(sock,m,{reply,isCreator})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    global._botPaused=()=>true;
    await react(sock,m,'🔴');
    reply(`🔴 *Bot paused*\nUse .wake to resume\n\n${sig()}`);
}},
{command:'wake',category:'owner',execute:async(sock,m,{reply,isCreator})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    global._botPaused=()=>false;
    await react(sock,m,'🟢');
    reply(`🟢 *Bot active*\n\n${sig()}`);
}},
{command:'update',category:'owner',execute:async(sock,m,{reply,isCreator})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    await react(sock,m,'🔄');
    const gh=config.github||'https://github.com/Dialmw/LIAM-LITE';
    const repo=gh.replace('https://github.com/','').replace(/\/$/,'');
    try{
        const{data:commit}=await axios.get(`https://api.github.com/repos/${repo}/commits/main`,{headers:{'User-Agent':'LIAM-LITE'},timeout:12000});
        const sha=commit?.sha?.slice(0,7)||'?';
        const msg=commit?.commit?.message?.split('\n')[0]||'No message';
        const date=commit?.commit?.committer?.date?.split('T')[0]||'?';
        const fs2=require('fs'),path2=require('path'),https=require('https'),{execSync}=require('child_process');
        const isGit=fs2.existsSync(path2.join(process.cwd(),'.git'));
        let status='';
        if(isGit){
            try{const out=execSync('git pull origin main --ff-only 2>&1',{cwd:process.cwd(),timeout:30000}).toString();
                status=out.includes('Already up to date')?'\n\n✅ Already up to date!':'\n\n✅ Updated! Restarting...';
                if(!out.includes('Already up to date'))setTimeout(()=>process.exit(0),1500);
            }catch(_){status=`\n\n📦 Manual: ${gh}/archive/refs/heads/main.zip`;}
        }else{status=`\n\n📦 Manual: ${gh}/archive/refs/heads/main.zip`;}
        await react(sock,m,'✅');
        reply(`🔄 *Update Check*\n\n📌 ${sha} (${date})\n💬 ${msg}${status}\n\n${sig()}`);
    }catch(e){await react(sock,m,'❌');reply(`❌ ${e.message}\n\n${sig()}`);}
}},
{command:'setname',category:'owner',execute:async(sock,m,{text,reply,isCreator})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    if(!text)return reply(`❓ .setname <name>\n\n${sig()}`);
    try{await sock.updateProfileName(text);await react(sock,m,'✅');reply(`✅ Name → ${text}\n\n${sig()}`);}
    catch(e){reply(`❌ ${e.message}\n\n${sig()}`);}
}},
{command:'setbio',category:'owner',execute:async(sock,m,{text,reply,isCreator})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    if(!text)return reply(`❓ .setbio <bio text>\n\n${sig()}`);
    try{await sock.updateProfileStatus(text);await react(sock,m,'✅');reply(`✅ Bio updated\n\n${sig()}`);}
    catch(e){reply(`❌ ${e.message}\n\n${sig()}`);}
}},
{command:'ka',category:'owner',execute:async(sock,m,{reply,isCreator})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    config.features.keepalive=!config.features.keepalive;
    const on=config.features.keepalive;
    if(on){global._kaInt=global._kaInt||setInterval(()=>sock.sendPresenceUpdate('available').catch(()=>{}),45000);}
    else{clearInterval(global._kaInt);global._kaInt=null;}
    await react(sock,m,on?'💚':'🔴');
    reply(`${on?'💚':'🔴'} *Keepalive:* ${on?'ON':'OFF'}\n\n${sig()}`);
}},
{command:'online',category:'owner',execute:async(sock,m,{reply,isCreator})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    config.features.alwaysonline=!config.features.alwaysonline;
    const on=config.features.alwaysonline;
    if(on){global._olInt=global._olInt||setInterval(()=>sock.sendPresenceUpdate('available').catch(()=>{}),30000);}
    else{clearInterval(global._olInt);global._olInt=null;sock.sendPresenceUpdate('unavailable').catch(()=>{});}
    await react(sock,m,on?'🟢':'⚫');
    reply(`${on?'🟢':'⚫'} *Always Online:* ${on?'ON':'OFF'}\n\n${sig()}`);
}},
{command:'autotyping',category:'owner',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.autotyping=arg==='on'?true:arg==='off'?false:!config.features.autotyping;
    await react(sock,m,config.features.autotyping?'⌨️':'❌');
    reply(`⌨️ *Auto Typing:* ${config.features.autotyping?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},
{command:'autorecord',category:'owner',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.autorecording=arg==='on'?true:arg==='off'?false:!config.features.autorecording;
    await react(sock,m,config.features.autorecording?'🎙️':'❌');
    reply(`🎙️ *Auto Recording:* ${config.features.autorecording?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},
{command:'autobio',category:'owner',execute:async(sock,m,{reply,isCreator,args})=>{
    if(!isCreator)return reply(config.message?.owner||'⚠️ Owner only!');
    config.features=config.features||{};
    const arg=(args[0]||'').toLowerCase();
    config.features.autobio=arg==='on'?true:arg==='off'?false:!config.features.autobio;
    await react(sock,m,config.features.autobio?'📝':'❌');
    reply(`📝 *Auto Bio:* ${config.features.autobio?'✅ ON':'❌ OFF'}\n\n${sig()}`);
}},

];
