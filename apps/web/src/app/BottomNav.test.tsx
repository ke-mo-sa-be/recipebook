import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithApp } from '../test/render.tsx';
import { BottomNav } from './BottomNav.tsx';

describe('BottomNav', () => {
  it('shows five labelled destinations in order, in English', async () => {
    await renderWithApp(<BottomNav />);
    const links = within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Home', 'Search', 'Add', 'Saved', 'Profile']);
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/search', '/add', '/saved', '/me']);
  });

  it('is labelled in Malayalam when Malayalam is chosen', async () => {
    await renderWithApp(<BottomNav />, { lang: 'ml' });
    expect(screen.getByRole('link', { name: 'ചേർക്കുക' })).toHaveAttribute('href', '/add');
  });

  it('marks the current page', async () => {
    await renderWithApp(<BottomNav />, { path: '/saved' });
    expect(screen.getByRole('link', { name: 'Saved' })).toHaveAttribute('aria-current', 'page');
  });
});
