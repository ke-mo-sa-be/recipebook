import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../../i18n/index.ts';
import { setLanguage } from '../../i18n/index.ts';
import { InstallCard } from './InstallCard.tsx';

describe('InstallCard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('explains Share → Add to Home Screen on an iPhone', () => {
    setLanguage('en');
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
    });
    render(<InstallCard />);
    expect(screen.getByRole('heading', { name: 'Put Paachakam on your home screen' })).toBeInTheDocument();
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
    expect(screen.getByLabelText('Share')).toBeInTheDocument();
  });

  it('stays hidden where the browser offers no install and it is not an iPhone', () => {
    const { container } = render(<InstallCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
