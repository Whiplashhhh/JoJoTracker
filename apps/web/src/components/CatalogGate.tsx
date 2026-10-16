import type { CatalogResponse } from '@jojo/shared/client';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { NetworkError, errorMessage } from '../api/client';
import { ErrorPanel, OfflineScreen, Skeleton } from './Feedback';

/** Gère chargement / hors-ligne / erreur du catalogue avant d'afficher la page. */
export function CatalogGate({
  query,
  variant,
  children,
}: {
  query: UseQueryResult<CatalogResponse>;
  variant: 'home' | 'part' | 'list';
  children: (data: CatalogResponse) => ReactNode;
}) {
  if (query.data) return <>{children(query.data)}</>;
  if (query.isError) {
    const retry = () => void query.refetch();
    return query.error instanceof NetworkError ? (
      <OfflineScreen onRetry={retry} />
    ) : (
      <ErrorPanel message={errorMessage(query.error)} onRetry={retry} />
    );
  }
  return <Skeleton variant={variant} />;
}
