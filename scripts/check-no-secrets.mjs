#!/usr/bin/env node
// Fails if anything that looks like a server secret appears where it must not:
//  1. any service-role / secret key reference in the frontend source or build output;
//  2. any real-looking key, JWT or private key in files git would commit.
// Zero dependencies; runs in CI and in `pnpm check`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const problems = [];

// 1. Frontend must never mention the privileged key at all.
const frontendForbidden = /service_role|SERVICE_ROLE|SUPABASE_SECRET_KEY|sb_secret_/;
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === 'node_modules') return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
for (const file of [...walk(join(root, 'apps/web/src')), ...walk(join(root, 'apps/web/dist'))]) {
  if (!/\.(ts|tsx|js|mjs|json|html|css|map)$/.test(file)) continue;
  if (frontendForbidden.test(readFileSync(file, 'utf8')))
    problems.push(`frontend references a server secret: ${file}`);
}

// 2. Committable files must not contain real-looking credentials.
const committable = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  .filter((f) => f !== 'pnpm-lock.yaml' && !f.endsWith('scripts/check-no-secrets.mjs'));
const credentialPatterns = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\bsb_secret_[A-Za-z0-9_-]{16,}/, 'Supabase secret key'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, 'JWT'],
  [/\bxkeysib-[a-f0-9]{20,}/, 'Brevo API key'],
  [/\bGOCSPX-[A-Za-z0-9_-]{20,}/, 'Google OAuth client secret'],
];
for (const file of committable) {
  const path = join(root, file);
  if (!existsSync(path) || statSync(path).size > 2_000_000) continue;
  const text = readFileSync(path, 'utf8');
  for (const [re, label] of credentialPatterns) {
    if (re.test(text)) problems.push(`${label} in ${file}`);
  }
}

if (problems.length) {
  console.error('Secret check FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`Secret check passed (${committable.length} committable files scanned).`);
