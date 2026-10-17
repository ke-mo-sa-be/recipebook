import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '../i18n/index.ts';

/** Render a component inside a router and a fresh query client, in the given language. */
export async function renderWithApp(ui: ReactNode, { path = '/', lang = 'en' as 'en' | 'ml' } = {}) {
  await i18n.changeLanguage(lang);
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    router,
    ...render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}
