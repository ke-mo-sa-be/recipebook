// deno test --allow-net --allow-env --config supabase/functions/push/deno.json supabase/functions/push/
// Checks the web-push library under Deno against an independent RFC 8291 decryption (WebCrypto) and
// the VAPID signature (RFC 8292), plus the notification wording.
import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1.0.13';
import webpush from 'web-push';
import { payload } from './handler.ts';

const b64u = {
  enc: (b: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(b)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''),
  dec: (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
};
const te = new TextEncoder();
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8),
  );
}

/** RFC 8291 aes128gcm decryption on the browser's side. */
async function decrypt(
  body: Uint8Array,
  uaKeys: CryptoKeyPair,
  uaPublic: Uint8Array,
  authSecret: Uint8Array,
) {
  const salt = body.slice(0, 16);
  const idlen = body[20]!;
  const asPublic = body.slice(21, 21 + idlen);
  const ciphertext = body.slice(21 + idlen);
  const asKey = await crypto.subtle.importKey(
    'raw',
    asPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, uaKeys.privateKey, 256),
  );
  const ikm = await hkdf(authSecret, ecdh, concat(te.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const padded = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext));
  let end = padded.length - 1;
  while (end > 0 && padded[end] === 0) end--;
  assertEquals(padded[end], 2, 'last record ends with the 0x02 delimiter');
  return new TextDecoder().decode(padded.slice(0, end));
}

Deno.test('web-push encrypts so a browser can decrypt, and signs with VAPID', async () => {
  const vapid = webpush.generateVAPIDKeys();
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
  const authSecret = crypto.getRandomValues(new Uint8Array(16));
  const endpoint = 'https://fcm.googleapis.com/fcm/send/test-device';
  const message = JSON.stringify({ title: '❤️ അമ്മിണി liked your recipe', body: 'മീൻ കറി' });

  const req = webpush.generateRequestDetails(
    { endpoint, keys: { p256dh: b64u.enc(uaPublic), auth: b64u.enc(authSecret) } },
    message,
    {
      vapidDetails: {
        subject: 'mailto:ops@example.org',
        publicKey: vapid.publicKey,
        privateKey: vapid.privateKey,
      },
      TTL: 60,
    },
  );
  assertEquals(req.method, 'POST');
  assertEquals(req.endpoint, endpoint);
  assertEquals(req.headers['Content-Encoding'], 'aes128gcm');
  assertEquals(await decrypt(new Uint8Array(req.body as Uint8Array), ua, uaPublic, authSecret), message);

  // Authorization: vapid t=<JWT>, k=<public key>
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(String(req.headers['Authorization']));
  assert(m, 'VAPID authorization header');
  const [h, p, sig] = m[1]!.split('.');
  assertEquals(m[2], vapid.publicKey);
  const claims = JSON.parse(new TextDecoder().decode(b64u.dec(p!)));
  assertEquals(claims.aud, 'https://fcm.googleapis.com');
  assertEquals(claims.sub, 'mailto:ops@example.org');
  assert(
    claims.exp > Date.now() / 1000 && claims.exp <= Date.now() / 1000 + 24 * 3600,
    'expires within a day',
  );
  const k = await crypto.subtle.importKey(
    'raw',
    b64u.dec(m[2]!),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  assert(
    await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, b64u.dec(sig!), te.encode(`${h}.${p}`)),
    'VAPID JWT signature verifies with the advertised key',
  );
});

Deno.test('notifications are worded in the recipient’s language and link to the recipe', () => {
  const base = {
    id: 7,
    actor_name: 'Ammini',
    recipe_id: 'r1',
    recipe_slug: 'kerala-fish-curry',
    title_ml: 'മീൻ കറി',
    title_en: 'Kerala Fish Curry',
    comment_body: 'Lovely with appam!',
    unread: 3,
    subscriptions: [],
  };
  const like = payload({ ...base, kind: 'like', lang: 'en' });
  assertEquals(like.title, '❤️ Ammini liked your recipe');
  assertEquals(like.body, 'Kerala Fish Curry');
  assertEquals(like.url, '/r/r1/kerala-fish-curry');
  assertEquals(like.unread, 3);
  const comment = payload({ ...base, kind: 'comment', lang: 'ml' });
  assertMatch(comment.title, /Ammini മീൻ കറി-ൽ കമന്റ് ചെയ്തു/);
  assertEquals(comment.body, 'Lovely with appam!');
  assertEquals(comment.url, '/r/r1/kerala-fish-curry#comments');
  const cooked = payload({ ...base, kind: 'cooked', lang: 'en' });
  assertEquals(cooked.title, '📸 Ammini cooked your recipe');
  assertEquals(cooked.url, '/r/r1/kerala-fish-curry#cooked');
  const version = payload({ ...base, kind: 'variation', lang: 'ml' });
  assertMatch(version.title, /സ്വന്തം പതിപ്പ്/);
  assertEquals(version.body, 'മീൻ കറി');
});
