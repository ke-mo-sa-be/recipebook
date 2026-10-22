import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Link2, Share2, X } from 'lucide-react';
import { Button, buttonClass } from '../../components/ui/Button.tsx';
import { IconButton } from '../../components/ui/IconButton.tsx';
import { Sheet } from '../../components/ui/Sheet.tsx';
import { cx } from '../../components/ui/cx.ts';
import { env } from '../../lib/env.ts';

/** WhatsApp's mark, for the one brand people look for when sharing a recipe here. */
function WhatsAppMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.6.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

/**
 * Share: WhatsApp first (most recipes travel there), then the phone's share sheet, then Copy link.
 * Links go to /s/:id so previews get the recipe card (the `share` function), then open the recipe.
 */
export function ShareButton({ recipeId, title }: { recipeId: string; title: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${env.VITE_SITE_URL.replace(/\/$/, '')}/s/${recipeId}`;
  const text = `${title}\n${url}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-tap items-center gap-2 rounded-pill border border-border bg-surface px-4 font-semibold hover:bg-surface-sunken [&>svg]:size-5"
      >
        <Share2 aria-hidden />
        <span>{t('share.button')}</span>
      </button>
      {open && (
        <Sheet labelledBy="share-h">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <h2 id="share-h" className="text-h2">
                {t('share.title')}
              </h2>
              <IconButton
                label={t('actions.cancel')}
                icon={<X aria-hidden />}
                onClick={() => setOpen(false)}
              />
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(buttonClass('primary', true), 'bg-[#1B7F4B] hover:bg-[#166A3F]')}
            >
              <WhatsAppMark />
              <span>{t('share.whatsapp')}</span>
            </a>
            {canShare && (
              <Button
                variant="secondary"
                full
                icon={<Share2 aria-hidden />}
                onClick={() => void navigator.share({ title, text: title, url }).catch(() => undefined)}
              >
                {t('share.more')}
              </Button>
            )}
            <Button
              variant="secondary"
              full
              icon={copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
              onClick={() =>
                void navigator.clipboard?.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                })
              }
            >
              {copied ? t('share.copied') : t('share.copy')}
            </Button>
          </div>
        </Sheet>
      )}
    </>
  );
}
