import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '../i18n/index.ts';
import { App } from './App.tsx';

describe('App placeholder', () => {
  it('renders in Malayalam by default and switches to English', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('പാചകപ്പുസ്തകം');
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Recipebook');
    expect(document.documentElement.lang).toBe('en');
  });
});
