import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal bottom sheet (centred dialog on wide screens). Focus moves into the sheet on open and the
 * page behind (#root) is inert, so the sheet is portalled to <body>. Sheets used here are required steps, so there is no click-outside dismiss.
 */
export function Sheet({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    ref.current?.querySelector<HTMLElement>('input, button, select, [tabindex]')?.focus();
    return () => root?.removeAttribute('inert');
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-scrim md:items-center">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[32px] bg-bg p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lg md:max-w-md md:rounded-[32px]"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
