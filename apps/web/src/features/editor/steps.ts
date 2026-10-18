export const WIZARD_STEPS = ['basics', 'photo', 'ingredients', 'steps', 'review'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];
export const isWizardStep = (s: string | undefined): s is WizardStep =>
  (WIZARD_STEPS as readonly string[]).includes(s ?? '');
