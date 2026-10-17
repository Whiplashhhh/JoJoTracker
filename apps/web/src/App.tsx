import { MotionConfig } from 'motion/react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
} from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { NetworkError, errorMessage } from './api/client';
import { useMe } from './api/queries';
import { AppShell } from './components/AppShell';
import { ErrorPanel, NotFoundPanel, OfflineScreen, Skeleton } from './components/Feedback';
import { Toaster } from './components/Toaster';
import { UpdatePrompt } from './components/UpdatePrompt';
import { TrackingProvider } from './features/tracking/TrackingProvider';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { PartPage } from './pages/PartPage';
import { PartsPage } from './pages/PartsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ThemeProvider } from './theme/ThemeProvider';

/** Garde d'authentification : redirige vers /connexion si personne n'est connecté. */
function RequireAuth() {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <Skeleton />;
  // Des données déjà connues priment sur l'échec d'un rafraîchissement en arrière-plan.
  if (me.isError && me.data === undefined) {
    return me.error instanceof NetworkError ? (
      <OfflineScreen onRetry={() => void me.refetch()} />
    ) : (
      <ErrorPanel message={errorMessage(me.error)} onRetry={() => void me.refetch()} />
    );
  }
  if (!me.data) {
    return (
      <Navigate
        to="/connexion"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }
  return (
    <TrackingProvider>
      <Outlet />
    </TrackingProvider>
  );
}

function Root() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ScrollRestoration />
        <Outlet />
        <Toaster />
        <UpdatePrompt />
      </ThemeProvider>
    </MotionConfig>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/connexion', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <HomePage /> },
              { path: 'parties', element: <PartsPage /> },
              { path: 'parties/:partNumber', element: <PartPage /> },
              { path: 'profil', element: <ProfilePage /> },
              { path: '*', element: <NotFoundPanel /> },
            ],
          },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
