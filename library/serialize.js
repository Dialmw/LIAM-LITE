// © 2025 Liam — serialize.js for @whiskeysockets/baileys rc.9+
// sock.decodeJid removed — use jidNormalizedUser directly
'use strict';
const {
    jidNormalizedUser,
    proto,
    getContentType,
    areJidsSameUser,
} = require('@whiskeysockets/baileys');

// Safe jid decoder — replaces removed sock.decodeJid
const decodeJid = raw => {
    if (!raw) return raw;
    const str = String(raw);
    // strip device suffix :XX@ → @
    return str.replace(/:\d+@/, '@').trim() || str;
};

const smsg = async (sock, m, store) => {
    if (!m) return m;
    const M = proto.WebMessageInfo;

    if (m.key) {
        m.id      = m.key.id;
        m.chat    = m.key.remoteJid;
        m.fromMe  = m.key.fromMe;
        m.isGroup = (m.chat || '').endsWith('@g.us');
        m.from    = (m.chat || '').startsWith('status')
            ? jidNormalizedUser(m.key?.participant || m.participant || m.chat)
            : jidNormalizedUser(m.chat);
        m.sender  = decodeJid(
            m.fromMe && sock.user?.id ||
            m.key.participant || m.participant || m.chat || ''
        );
        if (m.isGroup) m.participant = decodeJid(m.key.participant) || '';
        m.isBaileys = (m.id || '').startsWith('BAE5') && m.id.length === 16;
    }

    if (m.message) {
        // Unwrap wrappers
        if (m.message.ephemeralMessage)
            m.message = m.message.ephemeralMessage.message;
        if (m.message.viewOnceMessage)
            m.message = m.message.viewOnceMessage.message;
        if (m.message.viewOnceMessageV2)
            m.message = m.message.viewOnceMessageV2.message;

        m.mtype = getContentType(m.message);
        m.msg   = m.mtype ? m.message[m.mtype] : null;

        // Safe body
        m.body = '';
        try {
            m.body =
                m.message.conversation                                                      ||
                m.msg?.caption                                                              ||
                m.msg?.text                                                                 ||
                (m.mtype === 'extendedTextMessage'      && m.msg?.text)                    ||
                (m.mtype === 'listResponseMessage'      && m.msg?.singleSelectReply?.selectedRowId) ||
                (m.mtype === 'buttonsResponseMessage'   && m.msg?.selectedButtonId)        ||
                (m.mtype === 'templateButtonReplyMessage' && m.msg?.selectedId)            ||
                m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || '';
        } catch (_) { m.body = ''; }
        m.text = m.body;

        m.mentionedJid = m.msg?.contextInfo?.mentionedJid || [];

        // Quoted
        const rawQuoted = m.msg?.contextInfo?.quotedMessage;
        m.quoted = null;
        if (rawQuoted) {
            try {
                const qtype = getContentType(rawQuoted);
                let qmsg = rawQuoted[qtype];
                if (['productMessage'].includes(qtype)) {
                    const qt2 = getContentType(qmsg);
                    qmsg = qmsg?.[qt2];
                }
                if (typeof qmsg === 'string') qmsg = { text: qmsg };
                m.quoted = qmsg || {};
                m.quoted.mtype    = qtype;
                m.quoted.key      = {
                    remoteJid:   m.msg.contextInfo.remoteJid || m.from,
                    participant: jidNormalizedUser(m.msg.contextInfo.participant),
                    fromMe:      areJidsSameUser(
                        jidNormalizedUser(m.msg.contextInfo.participant),
                        jidNormalizedUser(sock?.user?.id)
                    ),
                    id: m.msg.contextInfo.stanzaId,
                };
                m.quoted.id       = m.msg.contextInfo.stanzaId;
                m.quoted.chat     = m.msg.contextInfo.remoteJid || m.chat;
                m.quoted.from     = /g\.us|status/.test(m.quoted.chat)
                    ? m.quoted.key.participant : m.quoted.chat;
                m.quoted.sender   = decodeJid(m.msg.contextInfo.participant);
                m.quoted.fromMe   = m.quoted.sender === sock.user?.id;
                m.quoted.text     = qmsg?.text || qmsg?.caption || qmsg?.conversation ||
                                    qmsg?.contentText || qmsg?.selectedDisplayText || qmsg?.title || '';
                m.quoted.mentionedJid = m.msg.contextInfo.mentionedJid || [];
                m.quoted.download = () => sock.downloadMediaMessage(
                    M.fromObject({ key: m.quoted.key, message: rawQuoted })
                );
                m.getQuotedObj = m.getQuotedMessage = async () => {
                    if (!m.quoted.id) return false;
                    const q = await store.loadMessage(m.chat, m.quoted.id);
                    return q ? smsg(sock, q, store) : false;
                };
            } catch (_) { m.quoted = null; }
        }
    } else {
        m.body = ''; m.text = ''; m.mtype = ''; m.msg = null;
        m.quoted = null; m.mentionedJid = [];
    }

    if (m.msg?.url) m.download = () => sock.downloadMediaMessage(m.msg);

    return m;
};

module.exports = { smsg };
