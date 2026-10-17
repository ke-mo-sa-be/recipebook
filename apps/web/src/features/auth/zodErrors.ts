import type { ZodError } from 'zod';

/** First error message (an i18n key) per field, for showing under inputs. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '_');
    out[field] ??= issue.message;
  }
  return out;
}
