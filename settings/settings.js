// ╔══════════════════════════════════════════════════════════╗
// ║  LIAM LITE — settings.js                               ║
// ╚══════════════════════════════════════════════════════════╝
'use strict';

const settings = {
    sessionId:   "LIAM:~paste_your_session_id_here",
    adminNumber: "254705483052",
    sudo:        [],
    maxSessions: 10,
    botName:     "𝐋𝐈𝐀𝐌 𝐋𝐈𝐓𝐄",
    version:     "1.0",
    prefix:      ".",
    tagline:     "👁️ Fast & Light WhatsApp Bot",
    channel:     "https://whatsapp.com/channel/0029VbBeZTc1t90aZjks9v2S",
    pairingSite: "https://liam-scanner.onrender.com/pair",
    github:      "https://github.com/Dialmw/LIAM-EYES",
    menuStyle:   "fancy",
    mode:        "public",
    timezone:    "Africa/Nairobi",

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
