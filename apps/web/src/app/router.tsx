import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppShell } from './AppShell.tsx';
import { NotFoundPage } from './NotFoundPage.tsx';
import { RouteError } from './RouteError.tsx';
import { HomePage } from '../features/home/HomePage.tsx';
import { SearchPage } from '../features/search/SearchPage.tsx';
import { SavedPage } from '../features/saved/SavedPage.tsx';
import { NewRecipePage } from '../features/editor/NewRecipePage.tsx';
import { EditorPage } from '../features/editor/EditorPage.tsx';
import { RecipePage } from '../features/recipes/RecipePage.tsx';
import { MePage } from '../features/profile/MePage.tsx';
import { ProfilePage } from '../features/profile/ProfilePage.tsx';
import { CategoryPage } from '../features/search/CategoryPage.tsx';
import { WhatsNewPage } from '../features/about/WhatsNewPage.tsx';
import { SettingsPage } from '../features/settings/SettingsPage.tsx';
import { RequireAuth } from '../features/auth/RequireAuth.tsx';
import { SignInPage } from '../features/auth/SignInPage.tsx';
import { SignUpPage } from '../features/auth/SignUpPage.tsx';
import { CheckEmailPage } from '../features/auth/CheckEmailPage.tsx';
import { ForgotPage } from '../features/auth/ForgotPage.tsx';
import { ResetPage } from '../features/auth/ResetPage.tsx';
import { CallbackPage } from '../features/auth/CallbackPage.tsx';

// Route map: docs/UX_FLOWS.md. Feature routes are added per milestone.
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'search', element: <SearchPage /> },
      {
        path: 'saved',
        element: (
          <RequireAuth>
            <SavedPage />
          </RequireAuth>
        ),
      },
      {
        path: 'add',
        element: (
          <RequireAuth>
            <NewRecipePage />
          </RequireAuth>
        ),
      },
      {
        path: 'edit/:id/:step?',
        element: (
          <RequireAuth>
            <EditorPage />
          </RequireAuth>
        ),
      },
      { path: 'r/:id/:slug?', element: <RecipePage /> },
      { path: 'c/:slug', element: <CategoryPage /> },
      { path: 'me', element: <MePage /> },
      { path: 'u/:handle', element: <ProfilePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'whats-new', element: <WhatsNewPage /> },
      { path: 'auth/sign-in', element: <SignInPage /> },
      { path: 'auth/sign-up', element: <SignUpPage /> },
      { path: 'auth/check-email', element: <CheckEmailPage /> },
      { path: 'auth/forgot', element: <ForgotPage /> },
      {
        path: 'auth/reset',
        element: (
          <RequireAuth>
            <ResetPage />
          </RequireAuth>
        ),
      },
      { path: 'auth/callback', element: <CallbackPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
