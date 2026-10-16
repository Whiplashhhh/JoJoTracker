import { useSearchParams } from 'react-router';
import { useCatalog, useMe } from '../api/queries';
import { CatalogGate } from '../components/CatalogGate';
import { InstallBanner } from '../components/Install';
import { PartCover } from '../components/PartCover';
import { ProgressHero } from '../components/ProgressHero';
import { ResumeCard } from '../components/ResumeCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePageTheme } from '../theme/theme-context';

export function HomePage() {
  usePageTheme(undefined);
  useDocumentTitle(null);
  const [params] = useSearchParams();
  const me = useMe();
  const catalog = useCatalog();

  return (
    <CatalogGate query={catalog} variant="home">
      {(data) => (
        <div className="home">
          <header className="topbar">
            <p className="topbar__brand" aria-hidden="true">
              JoJo<span>Tracker</span>
            </p>
            <p className="topbar__hello">
              Salut <strong>{me.data?.user.username}</strong>
            </p>
          </header>
          <div className="home__grid">
            <div className="home__main">
              <ProgressHero catalog={data} />
              <ResumeCard catalog={data} highlight={params.has('reprendre')} />
              <InstallBanner />
            </div>
            <section className="home__parts" aria-labelledby="parts-title">
              <h2 id="parts-title" className="section-title">
                <span>Les parties</span>
                <span className="section-title__jp" aria-hidden="true">
                  ドドドド
                </span>
              </h2>
              <div className="covers">
                {data.parts.map((part) => (
                  <PartCover key={part.number} part={part} catalog={data} />
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </CatalogGate>
  );
}
