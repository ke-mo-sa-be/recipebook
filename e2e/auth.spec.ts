import { expect, test, type Page } from '@playwright/test';
import { latestLinkFor } from './mailpit.ts';
import { expectNoClipping } from './layout-helpers.ts';

const stamp = Date.now().toString(36);
const email = `e2e-${stamp}@example.com`;
const handle = `e2e_${stamp}`;
const password = 'curry-leaf-42';
const newPassword = 'kudampuli-77';
const shots = 'e2e/.results/screens';

async function chooseEnglish(page: Page) {
  await expect(page.getByRole('dialog', { name: /Choose your language/ })).toBeVisible();
  await page.getByRole('button', { name: 'English' }).click();
}

test.describe.configure({ mode: 'serial' });

test('sign up, confirm by email, onboard, edit settings', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: `${shots}/01-first-visit.png` });
  await chooseEnglish(page);

  const nav = page.getByRole('navigation', { name: /^(Main|പ്രധാന മെനു)$/ });
  await nav.getByRole('link', { name: 'Profile' }).click();
  await page.getByRole('link', { name: 'Create account' }).click();

  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Please enter your name.')).toBeVisible();

  await page.getByLabel('Your name').fill('E2E Cook');
  await page.getByLabel('Email').fill(` ${email} `);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.screenshot({ path: `${shots}/02-sign-up.png` });
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/auth\/check-email/);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await page.screenshot({ path: `${shots}/03-check-email.png` });

  // Signing in before confirming is refused, with a way to resend.
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Please confirm your email first.')).toBeVisible();

  // Open the confirmation link: lands on /auth/callback, which signs in and shows onboarding.
  await page.goto(await latestLinkFor(email, 'Confirm'));
  const onboarding = page.getByRole('dialog', { name: 'Welcome, E2E Cook!' });
  await expect(onboarding).toBeVisible();
  await page.screenshot({ path: `${shots}/04-onboarding.png` });
  await onboarding.getByLabel('Username').fill('Bad Handle!');
  await onboarding.getByRole('button', { name: 'Done' }).click();
  await expect(onboarding.getByText('Use 3–30 small letters, numbers or _ only.')).toBeVisible();
  await onboarding.getByLabel('Username').fill(handle);
  await onboarding.getByLabel('District (optional)').selectOption('ekm');
  await onboarding.getByRole('button', { name: 'Done' }).click();
  await expect(onboarding).toBeHidden();

  await nav.getByRole('link', { name: 'Profile' }).click();
  await expect(page).toHaveURL(`/u/${handle}`);
  await expect(page.getByRole('heading', { name: 'E2E Cook' })).toBeVisible();
  await expect(page.getByText(`@${handle} · Ernakulam`)).toBeVisible();
  await page.screenshot({ path: `${shots}/05-profile.png` });

  // Settings: Malayalam, extra-large text, dark theme — the nav must still fit and work.
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('radio', { name: 'മലയാളം' }).check({ force: true });
  await expect(page.getByRole('heading', { name: 'സെറ്റിംഗ്സ്' })).toBeVisible();
  await page.getByRole('radio', { name: 'വളരെ വലുത്' }).check({ force: true });
  await page.getByRole('radio', { name: 'ഡാർക്ക്' }).check({ force: true });
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'xl');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ml');
  const links = nav.getByRole('link');
  await expect(links).toHaveCount(5);
  await expectNoClipping(page);
  await page.screenshot({ path: `${shots}/06-settings-ml-xl-dark.png`, fullPage: true });

  // Profile form in Settings saves.
  await page.getByLabel('നിങ്ങളെക്കുറിച്ച് (വേണമെങ്കിൽ)').fill('Sadya every Onam.');
  await page.getByRole('button', { name: 'സേവ് ചെയ്യുക' }).click();
  await expect(page.getByText('സേവ് ചെയ്തു!')).toBeVisible();

  await page.getByRole('button', { name: 'സൈൻ ഔട്ട്' }).click();
  await expect(page).toHaveURL('/');
});

test('sign in on a fresh device picks up saved preferences; wrong password is explained', async ({
  page,
}) => {
  await page.goto('/auth/sign-in');
  await chooseEnglish(page);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText("That email and password don't match.")).toBeVisible();

  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/');
  // Language and text size saved to the profile follow the person to this new browser.
  await expect(page.locator('html')).toHaveAttribute('lang', 'ml');
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'xl');
  await expectNoClipping(page);
  await page.screenshot({ path: `${shots}/07-home-signed-in-ml.png` });
});

test('reset a forgotten password by email', async ({ page }) => {
  await page.goto('/auth/forgot');
  await chooseEnglish(page);
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send link' }).click();
  await expect(page.getByText('a link is on its way')).toBeVisible();

  await page.goto(await latestLinkFor(email, 'Reset'));
  await expect(page).toHaveURL(/\/auth\/reset/);
  await page.getByLabel(/New password|പുതിയ പാസ്‌വേഡ്/).fill(newPassword);
  await page.getByRole('button', { name: /Save new password|പുതിയ പാസ്‌വേഡ് സേവ്/ }).click();
  await expect(page.getByRole('status')).toBeVisible();

  // Old password no longer works; the new one does.
  const res = await page.request.post('http://127.0.0.1:54321/auth/v1/token?grant_type=password', {
    headers: { apikey: process.env.E2E_PUBLISHABLE_KEY ?? '' },
    data: { email, password },
  });
  expect(res.status()).toBe(400);
  const ok = await page.request.post('http://127.0.0.1:54321/auth/v1/token?grant_type=password', {
    headers: { apikey: process.env.E2E_PUBLISHABLE_KEY ?? '' },
    data: { email, password: newPassword },
  });
  expect(ok.status()).toBe(200);
});
