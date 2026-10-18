import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { QueryClientProvider } from '@tanstack/react-query';
import './i18n/index.ts';
import './theme/app.css';
import { applyPrefs } from './lib/prefs.ts';
import { queryClient } from './lib/queryClient.ts';
import { AuthProvider } from './features/auth/AuthProvider.tsx';
import { router } from './app/router.tsx';
import { initInstall } from './features/install/install.ts';

applyPrefs();
initInstall();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
