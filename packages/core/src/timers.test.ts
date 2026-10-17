import { describe, expect, it } from 'vitest';
import { detectTimerSeconds } from './timers.ts';

describe('detectTimerSeconds', () => {
  it.each([
    ['Simmer for 10 minutes.', 600],
    ['Cook covered 8-10 min on low heat', 600],
    ['Rest the dough for 1 hour', 3600],
    ['Bake 45 mins', 2700],
    ['Leave it for half an hour', 1800],
    ['Soak for two hours', 7200],
    ['10 മിനിറ്റ് ചെറുതീയിൽ വേവിക്കുക', 600],
    ['അര മണിക്കൂർ കുതിർക്കുക', 1800],
    ['അഞ്ച് മിനിറ്റ് ഇളക്കുക', 300],
  ])('%s → %d s', (text, seconds) => expect(detectTimerSeconds(text)).toBe(seconds));

  it.each(['Add 2 cups of water', 'Serve hot with rice', 'Use 3 pieces of kudampuli'])(
    'no timer in "%s"',
    (text) => expect(detectTimerSeconds(text)).toBeNull(),
  );
});
