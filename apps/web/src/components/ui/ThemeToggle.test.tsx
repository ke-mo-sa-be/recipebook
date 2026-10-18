import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '../../i18n/index.ts';
import { setLanguage } from '../../i18n/index.ts';
import { setTheme } from '../../lib/prefs.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

describe('ThemeToggle', () => {
  it('flips between light and dark from whatever is showing', () => {
    setLanguage('en');
    setTheme('auto'); // the test browser reports a light system theme
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
