// ─────────────────────────────────────────────────────────────────
//  LIAM EYES — Cipher utilities
//  Provides decryption for protected config values
// ─────────────────────────────────────────────────────────────────
'use strict';

const _K = Buffer.from('LIAMEYES');

/** Decrypt XOR+base64 encoded string */
const decrypt = enc => {
    const buf = Buffer.from(enc, 'base64');
    return Buffer.from(buf.map((b, i) => b ^ _K[i % _K.length])).toString();
};

/** Encrypt string to XOR+base64 */
const encrypt = str => {
    const buf = Buffer.from(str);
    return Buffer.from(buf.map((b, i) => b ^ _K[i % _K.length])).toString('base64');
};

/** Simple anti-tamper marker — embedded in output */
const SIGNATURE = Buffer.from('LIAMEYES\x01\x09Alpha').toString('base64');

module.exports = { decrypt, encrypt, SIGNATURE };
