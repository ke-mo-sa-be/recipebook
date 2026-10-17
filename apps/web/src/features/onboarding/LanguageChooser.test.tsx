import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageChooser } from './LanguageChooser.tsx';
import '../../i18n/index.ts';

describe('LanguageChooser', () => {
  beforeEach(() => localStorage.clear());

  it('asks on the first visit, in both languages, and remembers the answer', () => {
    const { unmount } = render(<LanguageChooser />);
    expect(screen.getByRole('dialog', { name: /Choose your language/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    unmount();
    render(<LanguageChooser />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
