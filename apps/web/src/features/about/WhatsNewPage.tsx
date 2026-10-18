import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { currentLang } from '../../i18n/index.ts';
import { APP_VERSION, RELEASES } from './releases.ts';
import { markVersionSeen } from './seen.ts';

/** /whats-new: plain-language release notes for cooks. */
export function WhatsNewPage() {
  const { t } = useTranslation();
  const lang = currentLang();
  const date = new Intl.DateTimeFormat(lang === 'ml' ? 'ml-IN' : 'en-IN', { dateStyle: 'medium' });
  useEffect(markVersionSeen, []);

  return (
    <div className="mx-auto flex w-full max-w-(--rb-size-reading-max) flex-col gap-4">
      <PageHeader back title={t('whatsNew.title')} soft={t('about.version', { version: APP_VERSION })} />
      {RELEASES.map((r) => (
        <section key={r.version} aria-labelledby={`v-${r.version}`} className="card flex flex-col gap-3 p-5">
          <h2 id={`v-${r.version}`} className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-h3">{t('about.version', { version: r.version })}</span>
            <span className="text-small text-text-muted">{date.format(new Date(r.date))}</span>
          </h2>
          <ul className="flex list-disc flex-col gap-2 ps-5">
            {r.notes[lang].map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
