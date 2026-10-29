// ════════════════════════════════════════════════════════════════════════════
// ║  👁️  LIAM EYES WhatsApp Bot                                            ║
// ║  © 2025 Liam — All Rights Reserved                                     ║
// ║  Unauthorized redistribution, modification, or resale is prohibited.   ║
// ║  GitHub: https://github.com/Dialmw/LIAM-EYES                          ║
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
//  LIAM EYES — auth.js
//  Protected admin credentials — do not modify
// ════════════════════════════════════════════════════════════════════════════
'use strict';

// Admin credentials — XOR-encrypted, key=0x5A
// © 2025 LIAM EYES — All Rights Reserved
// Unauthorized distribution or modification of this code is prohibited.

const _K = 0x5A;
const _EA = '686f6e6d6a6f6e62696a6f68';  // creator: 254705483052
const _ES = ['2564423438353536', '3736333335323239', '38363433323135373236'];  // sudo placeholders (empty by default)

const _d  = hex => Buffer.from(hex, 'hex').map(b => b ^ _K).toString('ascii');
// Privileged numbers — 254743285563 and 254705483052 get 6 sessions; others get 3
const _EP = ['686f6e6d6e6968626f6f6c69', '686f6e6d6a6f6e62696a6f68'];

module.exports = {
    getOwner: () => _d(_EA),
    getSudo:  (customList = []) => customList,
    isOwner:  (jid, customOwner) => {
        const num = (jid || '').split('@')[0].replace(/:\d+/, '');
        const ownerNum = customOwner || _d(_EA);
        return num === ownerNum || jid === ownerNum + '@s.whatsapp.net';
    },
    // Returns true if this number gets elevated session quota
    isPrivileged: (num) => {
        const n = (num || '').replace(/\D/g,'').replace(/^0+/,'');
        return _EP.some(e => _d(e).replace(/\D/g,'') === n);
    },
    // Get session limit for a number:
    //   254743285563 → 6 sessions
    //   254705483052 → 6 sessions
    //   any other    → defaultLimit (3)
    getSessionLimit: (num, defaultLimit = 3) => {
        const n = (num || '').replace(/\D/g,'').replace(/^0+/,'');
        return _EP.some(e => _d(e).replace(/\D/g,'') === n) ? 6 : defaultLimit;
    },
    validate: () => {
        try { const v = _d(_EA); return /^\d{10,15}$/.test(v); }
        catch(_) { return false; }
    }
};
