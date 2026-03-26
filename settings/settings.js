// ╔══════════════════════════════════════════════════════════╗
// ║  LIAM LITE — settings.js                               ║
// ║  Mini bot: 50 commands, max 10 sessions, ultra-fast    ║
// ╚══════════════════════════════════════════════════════════╝
'use strict';

const settings = {
    // Paste your Session ID here
    sessionId: "LIAM:~paste_your_session_id_here",

    // Owner phone number (with country code, no +)
    adminNumber: "254705483052",

    // Sudo users
    sudo: [],

    // Max sessions — 10 hard limit
    maxSessions: 10,

    // Bot info
    botName:     "𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄",
    version:     "1.0",
    prefix:      ".",
    tagline:     "👁️ Fast & Light WhatsApp Bot",
    channel:     "https://whatsapp.com/channel/0029VbBeZTc1t90aZjks9v2S",
    pairingSite: "https://liam-scanner.onrender.com/pair",
    github:      "https://github.com/Dialmw/LIAM-EYES",

    // Menu style: "classic" or "fancy"
    menuStyle: "fancy",

    // Mode
    mode: "public",

    // Timezone
    timezone: "Africa/Nairobi",

    // Features
    features: {
        antidelete:      true,
        autoviewstatus:  false,
        autoreactstatus: false,
        chatbot:         false,
        welcome:         true,
        anticall:        false,
        antilink:        false,
    },

    // Status emojis
    statusReactEmojis: ["😍","🔥","💯","❤️","👀","✨","🎯"],

    // Anti-delete target: "owner" | "same"
    antiDeleteTarget: "owner",

    // ── 🎵 API ────────────────────────────────────────────────────────────────
    api: {
        baseurl:     "https://hector-api.vercel.app/",
        apikey:      "hector",
        rapidApiKey: process.env.RAPIDAPI_KEY || "",
    },

    // ── 🔐 GITHUB GATE ────────────────────────────────────────────────────────
    // REQUIRED: Set your GitHub username.
    // To deploy LIAM LITE you MUST:
    //   1. Fork  → https://github.com/Dialmw/LIAM-LITE
    //   2. Star  → https://github.com/Dialmw/LIAM-LITE
    // Bot will refuse to start if not met.
    githubUsername: process.env.GITHUB_USERNAME || "",  // ← set GITHUB_USERNAME env var or paste your GitHub username here
    githubRepo:     "LIAM-LITE",             // do not change
    githubOwner:    "Dialmw",               // do not change
    githubGate:     true,                    // set false to skip (dev only)
};

module.exports = settings;

