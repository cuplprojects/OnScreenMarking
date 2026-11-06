// Centralized Payload & Response Encryption/Decryption Utility
// Uses native Web Crypto API (AES-256-CBC) when available,
// with a pure JavaScript AES-256-CBC engine as fallback for non-secure contexts (e.g. plain HTTP on LAN IPs).

const SECRET_KEY = 'osm-portal-super-secret-encryption-key-2026';

// Base64 helpers
function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Pure JS SHA-256 (32 bytes key derivation)
function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const maxWord = Math.pow(2, 32);
  const words = [];
  const asciiBitLength = ascii.length * 8;
  const hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = candidate * 2; i < 312; i += candidate) {
        isComposite[i] = true;
      }
      if (primeCounter < 8) {
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      }
      k[primeCounter] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const s0_2 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const s1_2 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const t1 = hash[7] + s1_2 + ch + k[i] + w[i];
      const t2 = s0_2 + maj;
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + t1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (t1 + t2) | 0;
    }
    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    keyBytes[i * 4] = (hash[i] >>> 24) & 0xff;
    keyBytes[i * 4 + 1] = (hash[i] >>> 16) & 0xff;
    keyBytes[i * 4 + 2] = (hash[i] >>> 8) & 0xff;
    keyBytes[i * 4 + 3] = hash[i] & 0xff;
  }
  return keyBytes;
}

// Pure JS AES-256 Tables & Methods
const sBox = new Uint8Array([
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
]);

const invSBox = new Uint8Array(256);
for (let i = 0; i < 256; i++) invSBox[sBox[i]] = i;

const rcon = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function subWord(w) {
  return (sBox[(w >>> 24) & 0xff] << 24) |
         (sBox[(w >>> 16) & 0xff] << 16) |
         (sBox[(w >>> 8) & 0xff] << 8) |
         (sBox[w & 0xff]);
}

function rotWord(w) {
  return ((w << 8) | (w >>> 24)) >>> 0;
}

function keyExpansion(key) {
  const Nk = 8;
  const Nr = 14;
  const w = new Uint32Array(4 * (Nr + 1));
  for (let i = 0; i < Nk; i++) {
    w[i] = (key[4 * i] << 24) | (key[4 * i + 1] << 16) | (key[4 * i + 2] << 8) | key[4 * i + 3];
  }
  for (let i = Nk; i < 4 * (Nr + 1); i++) {
    let temp = w[i - 1];
    if (i % Nk === 0) {
      temp = (subWord(rotWord(temp)) ^ (rcon[i / Nk] << 24)) >>> 0;
    } else if (i % Nk === 4) {
      temp = subWord(temp) >>> 0;
    }
    w[i] = (w[i - Nk] ^ temp) >>> 0;
  }
  return w;
}

function addRoundKey(state, w, round) {
  for (let c = 0; c < 4; c++) {
    const word = w[round * 4 + c];
    state[0 + c * 4] ^= (word >>> 24) & 0xff;
    state[1 + c * 4] ^= (word >>> 16) & 0xff;
    state[2 + c * 4] ^= (word >>> 8) & 0xff;
    state[3 + c * 4] ^= word & 0xff;
  }
}

function subBytes(state) {
  for (let i = 0; i < 16; i++) state[i] = sBox[state[i]];
}

function invSubBytes(state) {
  for (let i = 0; i < 16; i++) state[i] = invSBox[state[i]];
}

function shiftRows(state) {
  let t;
  t = state[1]; state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = t;
  t = state[2]; state[2] = state[10]; state[10] = t;
  t = state[6]; state[6] = state[14]; state[14] = t;
  t = state[15]; state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = t;
}

function invShiftRows(state) {
  let t;
  t = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = t;
  t = state[2]; state[2] = state[10]; state[10] = t;
  t = state[6]; state[6] = state[14]; state[14] = t;
  t = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = t;
}

function xtime(x) {
  return ((x << 1) ^ (((x >> 7) & 1) * 0x11b)) & 0xff;
}

function mixColumns(state) {
  for (let c = 0; c < 4; c++) {
    const i = c * 4;
    const a0 = state[i], a1 = state[i + 1], a2 = state[i + 2], a3 = state[i + 3];
    const t = a0 ^ a1 ^ a2 ^ a3;
    const u = a0;
    state[i]     ^= t ^ xtime(a0 ^ a1);
    state[i + 1] ^= t ^ xtime(a1 ^ a2);
    state[i + 2] ^= t ^ xtime(a2 ^ a3);
    state[i + 3] ^= t ^ xtime(a3 ^ u);
  }
}

function mul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if ((b & 1) !== 0) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi !== 0) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

function invMixColumns(state) {
  for (let c = 0; c < 4; c++) {
    const i = c * 4;
    const a0 = state[i], a1 = state[i + 1], a2 = state[i + 2], a3 = state[i + 3];
    state[i]     = mul(a0, 0x0e) ^ mul(a1, 0x0b) ^ mul(a2, 0x0d) ^ mul(a3, 0x09);
    state[i + 1] = mul(a0, 0x09) ^ mul(a1, 0x0e) ^ mul(a2, 0x0b) ^ mul(a3, 0x0d);
    state[i + 2] = mul(a0, 0x0d) ^ mul(a1, 0x09) ^ mul(a2, 0x0e) ^ mul(a3, 0x0b);
    state[i + 3] = mul(a0, 0x0b) ^ mul(a1, 0x0d) ^ mul(a2, 0x09) ^ mul(a3, 0x0e);
  }
}

function encryptBlock(block, w) {
  const state = new Uint8Array(block);
  const Nr = 14;
  addRoundKey(state, w, 0);
  for (let round = 1; round < Nr; round++) {
    subBytes(state);
    shiftRows(state);
    mixColumns(state);
    addRoundKey(state, w, round);
  }
  subBytes(state);
  shiftRows(state);
  addRoundKey(state, w, Nr);
  return state;
}

function decryptBlock(block, w) {
  const state = new Uint8Array(block);
  const Nr = 14;
  addRoundKey(state, w, Nr);
  for (let round = Nr - 1; round > 0; round--) {
    invShiftRows(state);
    invSubBytes(state);
    addRoundKey(state, w, round);
    invMixColumns(state);
  }
  invShiftRows(state);
  invSubBytes(state);
  addRoundKey(state, w, 0);
  return state;
}

function pureAesCbcEncrypt(plainBytes, keyBytes, iv) {
  const w = keyExpansion(keyBytes);
  const padLen = 16 - (plainBytes.length % 16);
  const padded = new Uint8Array(plainBytes.length + padLen);
  padded.set(plainBytes);
  padded.fill(padLen, plainBytes.length);

  const out = new Uint8Array(padded.length);
  let prev = new Uint8Array(iv);
  for (let i = 0; i < padded.length; i += 16) {
    const block = padded.subarray(i, i + 16);
    const xorBlock = new Uint8Array(16);
    for (let j = 0; j < 16; j++) xorBlock[j] = block[j] ^ prev[j];
    const enc = encryptBlock(xorBlock, w);
    out.set(enc, i);
    prev = enc;
  }
  return out;
}

function pureAesCbcDecrypt(cipherBytes, keyBytes, iv) {
  const w = keyExpansion(keyBytes);
  const out = new Uint8Array(cipherBytes.length);
  let prev = new Uint8Array(iv);
  for (let i = 0; i < cipherBytes.length; i += 16) {
    const block = cipherBytes.subarray(i, i + 16);
    const dec = decryptBlock(block, w);
    for (let j = 0; j < 16; j++) out[i + j] = dec[j] ^ prev[j];
    prev = block;
  }
  const padLen = out[out.length - 1];
  if (padLen < 1 || padLen > 16) return out;
  return out.subarray(0, out.length - padLen);
}

// Cached key bytes
let cachedKeyBytes = null;
function getKeyBytes() {
  if (!cachedKeyBytes) {
    cachedKeyBytes = sha256(SECRET_KEY);
  }
  return cachedKeyBytes;
}

let cachedSubtleKey = null;
async function getSubtleKey() {
  if (cachedSubtleKey) return cachedSubtleKey;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const kb = getKeyBytes();
    cachedSubtleKey = await window.crypto.subtle.importKey(
      'raw',
      kb,
      { name: 'AES-CBC' },
      false,
      ['encrypt', 'decrypt']
    );
    return cachedSubtleKey;
  }
  return null;
}

/**
 * Encrypt a plain string or object using AES-256-CBC
 * @param {string|object} data - Payload to encrypt
 * @returns {Promise<string>} Base64 encrypted string (16-byte IV prepended)
 */
export async function encryptString(data) {
  if (data === null || data === undefined) return '';
  const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const enc = new TextEncoder();
  const plainBytes = enc.encode(text);

  // Generate 16 random IV bytes
  const iv = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(iv);
  } else {
    for (let i = 0; i < 16; i++) iv[i] = Math.floor(Math.random() * 256);
  }

  // Try Web Crypto API first
  try {
    const subtleKey = await getSubtleKey();
    if (subtleKey && window.crypto?.subtle) {
      const cipherBuf = await window.crypto.subtle.encrypt(
        { name: 'AES-CBC', iv },
        subtleKey,
        plainBytes
      );
      const combined = new Uint8Array(16 + cipherBuf.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(cipherBuf), 16);
      return uint8ArrayToBase64(combined);
    }
  } catch (err) {
    console.warn('Web Crypto encryption failed, using pure JS fallback:', err);
  }

  // Pure JS fallback
  const cipherBytes = pureAesCbcEncrypt(plainBytes, getKeyBytes(), iv);
  const combined = new Uint8Array(16 + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(cipherBytes, 16);
  return uint8ArrayToBase64(combined);
}

/**
 * Decrypt a Base64 encrypted string (with 16-byte prepended IV) using AES-256-CBC
 * @param {string} encryptedBase64 - Base64 encoded IV + ciphertext
 * @returns {Promise<string>} Decrypted UTF-8 plain text string
 */
export async function decryptString(encryptedBase64) {
  if (!encryptedBase64 || typeof encryptedBase64 !== 'string') return '';
  try {
    const rawBytes = base64ToUint8Array(encryptedBase64.trim());
    if (rawBytes.length < 16) return '';
    const iv = rawBytes.subarray(0, 16);
    const cipherBytes = rawBytes.subarray(16);

    // Try Web Crypto API first
    try {
      const subtleKey = await getSubtleKey();
      if (subtleKey && window.crypto?.subtle) {
        const decryptedBuf = await window.crypto.subtle.decrypt(
          { name: 'AES-CBC', iv },
          subtleKey,
          cipherBytes
        );
        return new TextDecoder().decode(decryptedBuf);
      }
    } catch (subtleErr) {
      // Fallback
    }

    // Pure JS fallback
    const plainBytes = pureAesCbcDecrypt(cipherBytes, getKeyBytes(), iv);
    return new TextDecoder().decode(plainBytes);
  } catch (ex) {
    console.error('Decryption failed:', ex);
    return '';
  }
}

/**
 * Encrypts an outgoing request body into { encryptedData: "..." }
 * @param {object|string} body
 * @returns {Promise<{ encryptedData: string }>}
 */
export async function encryptPayload(body) {
  const cipher = await encryptString(body);
  return { encryptedData: cipher };
}

/**
 * Decrypts an incoming response if encrypted, and parses JSON
 * @param {object|string} responseData
 * @returns {Promise<any>}
 */
export async function decryptResponseData(responseData) {
  if (!responseData) return responseData;

  const encData = responseData.encryptedData || (typeof responseData === 'string' && responseData.startsWith('{') ? null : responseData);
  if (!encData || typeof encData !== 'string') {
    return responseData;
  }

  try {
    const decryptedText = await decryptString(encData);
    if (!decryptedText) return responseData;
    return JSON.parse(decryptedText);
  } catch (err) {
    console.warn('Could not parse decrypted response as JSON, returning plain text:', err);
    return responseData;
  }
}

