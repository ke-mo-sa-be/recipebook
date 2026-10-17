// Reads auth emails from the local Supabase test inbox (Mailpit).
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:54324';
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:54321';

type Summary = { ID: string; Subject: string; To: Array<{ Address: string }> };

export async function latestLinkFor(email: string, subjectPart: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/messages`)).json()) as { messages: Summary[] };
    const msg = list.messages.find(
      (m) =>
        m.To.some((t) => t.Address.toLowerCase() === email.toLowerCase()) && m.Subject.includes(subjectPart),
    );
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { HTML: string };
      const href = /href="([^"]*\/verify\?[^"]*)"/.exec(full.HTML)?.[1];
      if (!href) throw new Error(`no verify link in "${msg.Subject}"`);
      const link = new URL(href.replaceAll('&amp;', '&'));
      // Links point at the public auth URL (staging); tests talk to the local gateway directly.
      const local = new URL(API);
      link.protocol = local.protocol;
      link.host = local.host;
      return link.toString();
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no "${subjectPart}" email for ${email} within ${timeoutMs} ms`);
}
