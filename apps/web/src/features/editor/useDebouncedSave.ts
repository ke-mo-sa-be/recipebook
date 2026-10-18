import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Autosave: schedule() the latest value; it is saved after `delay` ms of quiet, or at once by
 * flush() (before changing step or leaving). Only the latest value is ever sent.
 */
export function useDebouncedSave<T>(save: (value: T) => Promise<void>, delay = 700) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef<Promise<void> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (running.current) await running.current;
    const job = pending.current;
    if (!job) return true;
    pending.current = null;
    setStatus('saving');
    let ok = true;
    running.current = saveRef
      .current(job.value)
      .then(() => setStatus(pending.current ? 'saving' : 'saved'))
      .catch(() => {
        ok = false;
        // Keep the unsaved value so the next change or flush retries it.
        pending.current ??= job;
        setStatus('error');
      })
      .finally(() => {
        running.current = null;
      });
    await running.current;
    return ok;
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      setStatus('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  // Save on unmount too (closing the wizard, navigating away).
  useEffect(() => () => void flush(), [flush]);

  return { status, schedule, flush };
}
