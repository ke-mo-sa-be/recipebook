import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithApp } from '../../test/render.tsx';
import { SettingsPage } from './SettingsPage.tsx';

vi.mock('../auth/AuthProvider.tsx', () => ({
  useAuth: () => ({ session: null, loading: false }),
  useUserId: () => null,
}));

describe('SettingsPage (signed out)', () => {
  it('applies text size and theme to the whole page immediately', async () => {
    await renderWithApp(<SettingsPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Extra large' }));
    expect(document.documentElement.dataset.textSize).toBe('xl');
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(screen.getByRole('radio', { name: 'Auto' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('switches language and remembers it', async () => {
    await renderWithApp(<SettingsPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'മലയാളം' }));
    expect(await screen.findByRole('heading', { name: 'സെറ്റിംഗ്സ്' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ml');
    expect(localStorage.getItem('rb-lang')).toBe('ml');
  });

  it('does not show account sections when signed out', async () => {
    await renderWithApp(<SettingsPage />);
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });
});
