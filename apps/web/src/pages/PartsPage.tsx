import { computeProgress } from '@jojo/shared/client';
import { useCatalog } from '../api/queries';
import { CatalogGate } from '../components/CatalogGate';
import { PartCover } from '../components/PartCover';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePageTheme } from '../theme/theme-context';

export function PartsPage() {
  usePageTheme(undefined);
  useDocumentTitle('Mes parties');
  const catalog = useCatalog();
  return (
    <CatalogGate query={catalog} variant="list">
      {(data) => {
        const progress = computeProgress(data.episodes, data.today);
        return (
          <div className="parts-page">
            <header className="page-head">
              <p className="page-head__kicker" aria-hidden="true">
                ドドドド
              </p>
              <h1 className="page-head__title">Mes parties</h1>
              <p className="page-head__sub">
                {progress.watched} / {progress.total} épisodes vus · {data.parts.length} parties
              </p>
            </header>
            <div className="covers covers--wide">
              {data.parts.map((part) => (
                <PartCover key={part.number} part={part} catalog={data} />
              ))}
            </div>
          </div>
        );
      }}
    </CatalogGate>
  );
}
