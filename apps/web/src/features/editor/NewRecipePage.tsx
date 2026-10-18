import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { Lang } from '@recipebook/core';
import { Headline } from '../../components/ui/Headline.tsx';
import { ChoiceGroup } from '../../components/ui/ChoiceGroup.tsx';
import { Sticker } from '../../components/ui/Sticker.tsx';
import { errorKey } from '../../lib/appError.ts';
import { currentLang } from '../../i18n/index.ts';
import { useUserId } from '../auth/AuthProvider.tsx';
import { createDraft, useRecipesByAuthor } from '../recipes/api.ts';
import { RecipeCard } from '../recipes/RecipeCard.tsx';

/** /add: name the dish first (one field, one button), or continue a draft. */
export function NewRecipePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUserId();
  const drafts = useRecipesByAuthor(uid ?? undefined, 'draft');
  const [lang, setLang] = useState<Lang>(currentLang());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get('name') ?? '').trim();
    if (!name) return setError('recipe.errors.titleRequired');
    setBusy(true);
    setError(null);
    try {
      const id = await createDraft({
        content_lang: lang,
        ...(lang === 'ml' ? { title_ml: name } : { title_en: name }),
      });
      navigate(`/edit/${id}/basics`);
    } catch (err) {
      setError(errorKey(err));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-(--rb-size-reading-max) flex-col gap-6">
      <div className="flex items-end justify-center pt-2" aria-hidden>
        <Sticker slug="kitchen-knife" size={64} tilt={-10} />
        <Sticker slug="cooking" size={88} tilt={4} className="-ml-2" />
        <Sticker slug="tomato" size={60} tilt={9} className="-ml-2" />
      </div>
      <Headline soft={t('wizard.new.soft')}>{t('wizard.new.title')}</Headline>
      <ChoiceGroup<Lang>
        legend={t('wizard.new.writingIn')}
        value={lang}
        onChange={setLang}
        choices={[
          { value: 'ml', label: 'മലയാളം', lang: 'ml' },
          { value: 'en', label: 'English', lang: 'en' },
        ]}
      />
      <form onSubmit={start} className="card flex flex-col gap-3 p-3.5 shadow-md">
        <label htmlFor="new-name" className="px-1 text-small font-bold">
          {t('wizard.new.nameLabel')}
        </label>
        <input
          id="new-name"
          name="name"
          lang={lang}
          maxLength={120}
          autoComplete="off"
          placeholder={lang === 'ml' ? t('wizard.new.placeholderMl') : t('wizard.new.placeholderEn')}
          className="w-full bg-transparent px-1 text-h3 font-medium outline-none placeholder:text-text-muted"
        />
        <div className="flex items-center justify-between gap-2">
          <span role="alert" className="text-small text-danger">
            {error && t(error)}
          </span>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-pill bg-primary px-5 font-semibold text-on-primary disabled:opacity-45"
          >
            {t('wizard.new.start')}
            <ArrowRight aria-hidden className="size-5" />
          </button>
        </div>
      </form>
      {drafts.data && drafts.data.length > 0 && (
        <section aria-labelledby="drafts-h" className="flex flex-col gap-3">
          <h2 id="drafts-h" className="text-h3">
            {t('wizard.new.drafts')}
          </h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            {drafts.data.map((d) => (
              <RecipeCard key={d.id} recipe={d} to={`/edit/${d.id}/basics`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
