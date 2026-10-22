import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@recipebook/core';
import { Headline } from '../../components/ui/Headline.tsx';
import { TextField } from '../../components/ui/TextField.tsx';
import { TextArea } from '../../components/ui/TextArea.tsx';
import { SelectField } from '../../components/ui/SelectField.tsx';
import { ChoiceGroup } from '../../components/ui/ChoiceGroup.tsx';
import { Chip } from '../../components/ui/Chip.tsx';
import { Stepper } from '../../components/ui/Stepper.tsx';
import { DietMark } from '../recipes/DietMark.tsx';
import { useLookups, type Diet } from '../recipes/api.ts';
import type { EditorFields, SetField } from './editorState.ts';

const DIETS: Diet[] = ['veg', 'egg', 'nonveg', 'vegan'];

export function BasicsStep({ fields, setField }: { fields: EditorFields; setField: SetField }) {
  const { t } = useTranslation();
  const lookups = useLookups();
  const ml = fields.content_lang === 'ml';
  const titleFields = [
    { key: 'title_ml' as const, label: t('wizard.basics.titleMl'), lang: 'ml' },
    { key: 'title_en' as const, label: t('wizard.basics.titleEn'), lang: 'en' },
  ];
  if (!ml) titleFields.reverse();

  const fromVariation = useSearchParams()[0].get('from') === 'variation';
  return (
    <div className="flex flex-col gap-6">
      <Headline soft={t('wizard.basics.soft')}>{t('wizard.basics.title')}</Headline>
      {fromVariation && (
        <p role="note" className="rounded-lg bg-leaf-soft p-3 text-small text-on-leaf-soft">
          {t('variations.startedFrom')}
        </p>
      )}
      <ChoiceGroup<Lang>
        legend={t('wizard.new.writingIn')}
        value={fields.content_lang}
        onChange={(v) => setField('content_lang', v)}
        choices={[
          { value: 'ml', label: 'മലയാളം', lang: 'ml' },
          { value: 'en', label: 'English', lang: 'en' },
        ]}
      />
      {titleFields.map((f, i) => (
        <TextField
          key={f.key}
          lang={f.lang}
          label={i === 0 ? f.label : `${f.label} ${t('wizard.optional')}`}
          value={fields[f.key] ?? ''}
          maxLength={120}
          onChange={(e) => setField(f.key, e.target.value || null)}
        />
      ))}
      <TextArea
        lang={fields.content_lang}
        label={`${t('wizard.basics.description')} ${t('wizard.optional')}`}
        value={fields.description ?? ''}
        maxLength={500}
        rows={2}
        onChange={(e) => setField('description', e.target.value || null)}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-bold">{t('wizard.basics.category')}</legend>
        <div className="flex flex-wrap gap-2">
          {lookups.data?.categories.map((c) => (
            <Chip
              key={c.id}
              sticker={c.sticker}
              active={fields.category_id === c.id}
              onClick={() => setField('category_id', c.id)}
            >
              {t(`categories.${c.slug}`)}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-bold">{t('wizard.basics.diet')}</legend>
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <Chip key={d} active={fields.diet === d} onClick={() => setField('diet', d)}>
              <span className="inline-flex items-center gap-1.5">
                <DietMark diet={d} />
                {t(`diet.${d}`)}
              </span>
            </Chip>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <span className="text-small font-bold">{t('wizard.basics.prep')}</span>
          <Stepper
            label={t('wizard.basics.prep')}
            value={fields.prep_minutes}
            step={5}
            suffix={t('wizard.basics.minShort')}
            onChange={(v) => setField('prep_minutes', v)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-small font-bold">{t('wizard.basics.cook')}</span>
          <Stepper
            label={t('wizard.basics.cook')}
            value={fields.cook_minutes}
            step={5}
            suffix={t('wizard.basics.minShort')}
            onChange={(v) => setField('cook_minutes', v)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-small font-bold">{t('wizard.basics.servings')}</span>
          <Stepper
            label={t('wizard.basics.servings')}
            value={fields.servings}
            min={1}
            max={200}
            onChange={(v) => setField('servings', v)}
          />
        </div>
      </div>
      <SelectField
        label={`${t('wizard.basics.region')} ${t('wizard.optional')}`}
        value={fields.region_id ?? ''}
        placeholder={t('wizard.basics.regionNone')}
        options={(lookups.data?.regions ?? []).map((r) => ({
          value: String(r.id),
          label: t(`regions.${r.slug}`),
        }))}
        onChange={(e) => setField('region_id', e.target.value ? Number(e.target.value) : null)}
      />
    </div>
  );
}
