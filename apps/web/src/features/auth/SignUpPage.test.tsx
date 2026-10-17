import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithApp } from '../../test/render.tsx';
import { SignUpPage } from './SignUpPage.tsx';
import * as api from './api.ts';

vi.mock('./api.ts', () => ({ signUp: vi.fn(), signInWithGoogle: vi.fn() }));

describe('SignUpPage', () => {
  beforeEach(() => vi.mocked(api.signUp).mockReset());

  it('explains every problem in plain language and does not submit', async () => {
    await renderWithApp(<SignUpPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Please enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Your password needs at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toHaveAttribute('aria-invalid', 'true');
    expect(api.signUp).not.toHaveBeenCalled();
  });

  it('signs up with the chosen language and goes to "check your email"', async () => {
    vi.mocked(api.signUp).mockResolvedValue(undefined);
    const { router } = await renderWithApp(<SignUpPage />, { lang: 'ml' });
    fireEvent.change(screen.getByLabelText('നിങ്ങളുടെ പേര്'), { target: { value: 'Ammini' } });
    fireEvent.change(screen.getByLabelText('ഇമെയിൽ'), { target: { value: 'Ammini@Example.com' } });
    fireEvent.change(screen.getByLabelText('പാസ്‌വേഡ്'), { target: { value: 'curry-leaf-42' } });
    fireEvent.click(screen.getByRole('button', { name: 'അക്കൗണ്ട് തുടങ്ങുക' }));
    await waitFor(() =>
      expect(api.signUp).toHaveBeenCalledWith({
        displayName: 'Ammini',
        email: 'ammini@example.com',
        password: 'curry-leaf-42',
        lang: 'ml',
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/auth/check-email'));
  });

  it('hides "Continue with Google" until Google is configured', async () => {
    await renderWithApp(<SignUpPage />);
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument();
  });
});
