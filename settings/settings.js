// ╔══════════════════════════════════════════════════════════╗
// ║  LIAM LITE — settings.js                               ║
// ╚══════════════════════════════════════════════════════════╝
'use strict';

const settings = {
    // ── Session: paste LIAM:~ here OR set SESSION_ID env var ──
    sessionId:   process.env.SESSION_ID || process.env.LIAM_SESSION_ID || "LIAM:~paste_here",

    // ── Owner phone (no + sign) ────────────────────────────────
    adminNumber: process.env.OWNER_NUMBER || "254705483052",

    // ── Sudo users ─────────────────────────────────────────────
    sudo: [],

    // ── Bot info ───────────────────────────────────────────────
    botName:     "𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄",
    version:     "2.0",
    prefix:      process.env.PREFIX || ".",
    maxSessions: 10,

    // ── Links ──────────────────────────────────────────────────
    channel:     "https://whatsapp.com/channel/0029VbBeZTc1t90aZjks9v2S",
    pairingSite: "https://liam-scanner.onrender.com/pair",
    github:      "https://github.com/Dialmw/LIAM-LITE",

    // ── Telegram archive (for .toarchives command) ─────────────
    telegramBotToken:  process.env.TG_BOT_TOKEN  || "",
    telegramChannelId: process.env.TG_CHANNEL_ID || "",

    // ── Menu + mode ────────────────────────────────────────────
    menuStyle:   "fancy",   // fancy | classic | buttons
    mode:        process.env.BOT_MODE || "public",
    timezone:    "Africa/Nairobi",

    // ── Features ───────────────────────────────────────────────
    features: {
        antidelete:      true,
        autoviewstatus:  false,
        autoreactstatus: false,
        autosavestatus:  false,
        chatbot:         false,
        welcome:         true,
        anticall:        false,
        antilink:        false,
        alwaysonline:    false,
        autotyping:      false,
        autorecord:      false,
        autoread:        false,
    },

    statusReactEmojis: ["😍","🔥","💯","❤️","👀","✨","🎯"],
    antiDeleteTarget:  "owner",
};

module.exports = settings;
