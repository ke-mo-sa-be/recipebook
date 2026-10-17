/** An error whose message is an i18n key, safe to show to people via t(error.message). */
export class AppError extends Error {
  constructor(
    public readonly key: string,
    public override readonly cause?: unknown,
  ) {
    super(key);
  }
}

export function errorKey(error: unknown, fallback = 'errors.generic'): string {
  return error instanceof AppError ? error.key : fallback;
}
