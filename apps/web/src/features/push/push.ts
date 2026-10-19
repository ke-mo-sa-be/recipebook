import { supabase } from '../../lib/supabaseClient.ts';

/**
 * Web push on this device. The server's public (VAPID) key comes from the `push` function, so a
 * server without keys simply reports 'not-configured' and the app hides the option.
 */
export type PushState = 'unsupported' | 'needs-install' | 'not-configured' | 'denied' | 'off' | 'on';

let keyPromise: Promise<string | null> | null = null;
export function publicKey(): Promise<string | null> {
  keyPromise ??= supabase.functions
    .invoke<{ publicKey: string | null }>('push', { method: 'GET' })
    .then(({ data }) => data?.publicKey ?? null)
    .catch(() => null);
  return keyPromise;
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function pushState(): Promise<PushState> {
  // iPhones only allow push for apps added to the Home Screen.
  if (!supported()) return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (!(await publicKey())) return 'not-configured';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.permission === 'granted' && (await currentSubscription()) ? 'on' : 'off';
}

function b64urlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Ask permission (only ever from a tap), subscribe this browser and register it to me. */
export async function enablePush(): Promise<PushState> {
  const key = await publicKey();
  if (!key) return 'not-configured';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(key) }));
  const json = sub.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
  });
  if (error) {
    await sub.unsubscribe();
    throw error;
  }
  return 'on';
}

/** Stop push on this browser and forget it on the server. */
export async function disablePush(): Promise<PushState> {
  const sub = supported() ? await currentSubscription() : null;
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
  return 'off';
}

/** On sign-out: the next person on this phone must not get my notifications. Never throws. */
export async function forgetThisDevice(): Promise<void> {
  try {
    await disablePush();
  } catch {
    // best effort; the server also drops subscriptions that stop working
  }
}

/**
 * Nudge the server to deliver new notifications now (after a like or comment). It only sends what
 * the database already created, so this can't be used to send anything else.
 */
export function pokePush(): void {
  void publicKey().then((key) => {
    if (key) void supabase.functions.invoke('push', { method: 'POST' }).catch(() => undefined);
  });
}
