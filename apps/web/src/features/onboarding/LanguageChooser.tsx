import { useState } from 'react';
import { brand } from '../../brand/brand.ts';
import { hasChosenLanguage, setLanguage } from '../../i18n/index.ts';
import { buttonClass } from '../../components/ui/Button.tsx';
import { Sheet } from '../../components/ui/Sheet.tsx';

/**
 * First visit only. Deliberately bilingual and not translated: the person hasn't picked a language yet.
 */
export function LanguageChooser() {
  const [open, setOpen] = useState(() => !hasChosenLanguage());
  if (!open) return null;
  function choose(lang: 'ml' | 'en') {
    setLanguage(lang);
    setOpen(false);
  }
  /* eslint-disable i18next/no-literal-string -- shown before any language is chosen */
  return (
    <Sheet labelledBy="lang-title">
      <div className="flex flex-col items-center gap-5 text-center">
        <img src={brand.logo} alt="" className="size-16" />
        <h2 id="lang-title" className="text-h2">
          <span lang="ml">ഭാഷ തിരഞ്ഞെടുക്കൂ</span>
          <br />
          <span lang="en" className="text-h3 text-text-muted">
            Choose your language
          </span>
        </h2>
        <button type="button" lang="ml" className={buttonClass('primary', true)} onClick={() => choose('ml')}>
          മലയാളം
        </button>
        <button
          type="button"
          lang="en"
          className={buttonClass('secondary', true)}
          onClick={() => choose('en')}
        >
          English
        </button>
        <p className="text-small text-text-muted">
          <span lang="ml">പിന്നീട് സെറ്റിംഗ്സിൽ മാറ്റാം.</span>{' '}
          <span lang="en">You can change this later in Settings.</span>
        </p>
      </div>
    </Sheet>
  );
  /* eslint-enable i18next/no-literal-string */
}
