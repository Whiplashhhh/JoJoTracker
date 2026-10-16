import {
  computePartProgress,
  type CatalogResponse,
  type EpisodeView,
  type PartView,
} from '@jojo/shared/client';
import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useCatalog } from '../api/queries';
import { BottomSheet } from '../components/BottomSheet';
import { CatalogGate } from '../components/CatalogGate';
import { EpisodeRow } from '../components/EpisodeRow';
import { NotFoundPanel } from '../components/Feedback';
import { BackIcon, MoreIcon } from '../components/Icons';
import { STATUS_LABELS } from '../lib/labels';
import { useTracking } from '../features/tracking/context';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePageTheme } from '../theme/theme-context';

interface Group {
  key: string;
  name: string | null;
  episodes: EpisodeView[];
}

function groupBySeason(part: PartView, episodes: EpisodeView[]): Group[] {
  if (part.seasons.length === 0) return [{ key: 'all', name: null, episodes }];
  return part.seasons
    .map((s) => ({
      key: s.key,
      name: s.name,
      episodes: episodes.filter((e) => e.season === s.key),
    }))
    .filter((g) => g.episodes.length > 0);
}

function PartContent({ part, catalog }: { part: PartView; catalog: CatalogResponse }) {
  const tracking = useTracking();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const episodes = catalog.episodes.filter((e) => e.partNumber === part.number);
  const progress = computePartProgress(catalog.episodes, part.number, catalog.today);
  const groups = groupBySeason(part, episodes);

  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    const row = document.querySelector(`[data-episode="${CSS.escape(id)}"]`);
    row?.scrollIntoView({ block: 'center' });
    row?.classList.add('ep--focus');
  }, [location.hash]);

  return (
    <div className="part">
      <header className="part-head">
        <div className="part-head__lines" aria-hidden="true" />
        <span className="part-head__numeral" aria-hidden="true">
          {part.number}
        </span>
        <div className="part-head__bar">
          <Link to="/parties" className="icon-btn" aria-label="Retour aux parties">
            <BackIcon />
          </Link>
          <button
            type="button"
            className="icon-btn"
            aria-label="Actions sur la partie"
            aria-haspopup="dialog"
            onClick={() => {
              setMenuOpen(true);
            }}
          >
            <MoreIcon />
          </button>
        </div>
        <p className="part-head__tag">Partie {part.number}</p>
        <h1 className="part-head__title">{part.name}</h1>
        <p className="part-head__sub">
          {episodes.length} épisodes
          {part.seasons.length > 0 && ` · ${part.seasons.length} saisons`}
        </p>
      </header>

      <div
        className={`sticky-progress sticky-progress--${progress.status}`}
        style={
          {
            '--ratio': `${progress.total ? progress.watched / progress.total : 0}`,
          } as CSSProperties
        }
      >
        <div
          className="sticky-progress__bar"
          role="progressbar"
          aria-label={`Progression de la partie ${part.number}`}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.watched}
          aria-valuetext={`${progress.watched} sur ${progress.total} épisodes vus`}
        >
          <span className="sticky-progress__fill" />
        </div>
        <p className="sticky-progress__text" aria-hidden="true">
          <strong>{progress.watched}</strong>/{progress.total}
          <span className="sticky-progress__pct">{progress.percent}%</span>
        </p>
        <span className="sticky-progress__status">{STATUS_LABELS[progress.status]}</span>
      </div>

      {groups.map((group) => (
        <section
          key={group.key}
          className="season"
          aria-label={group.name ?? `Épisodes de la partie ${part.number}`}
        >
          {group.name && (
            <h2 className="season__title">
              <span>{group.name}</span>
              <small>
                {group.episodes.filter((e) => e.watched).length}/{group.episodes.length}
              </small>
            </h2>
          )}
          <ol className="episodes">
            {group.episodes.map((ep) => (
              <EpisodeRow
                key={ep.id}
                episode={ep}
                today={catalog.today}
                hit={tracking.hits.get(ep.id)}
                busy={tracking.pending.has(ep.id)}
                onToggle={tracking.toggle}
                onReveal={tracking.requestReveal}
              />
            ))}
          </ol>
        </section>
      ))}

      <p className="part__tip">
        Astuce : appui long sur une bande censurée pour révéler un titre (avec confirmation).
      </p>

      <BottomSheet
        open={menuOpen}
        onClose={() => {
          setMenuOpen(false);
        }}
        title={`Partie ${part.number}`}
        kicker="メニュー"
      >
        <div className="sheet__actions">
          <button
            type="button"
            className="btn btn--accent btn--block"
            onClick={() => {
              setMenuOpen(false);
              tracking.requestPartAction(part.number, 'watch');
            }}
          >
            Marquer toute la partie comme vue
          </button>
          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => {
              setMenuOpen(false);
              tracking.requestPartAction(part.number, 'reset');
            }}
          >
            Réinitialiser la partie
          </button>
          <button
            type="button"
            className="btn btn--paper btn--block"
            onClick={() => {
              setMenuOpen(false);
            }}
          >
            Fermer
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

export function PartPage() {
  const params = useParams();
  const partNumber = Number(params.partNumber);
  const valid = Number.isInteger(partNumber) && partNumber > 0;
  usePageTheme(valid ? partNumber : undefined);
  const catalog = useCatalog();
  const part = catalog.data?.parts.find((p) => p.number === partNumber);
  useDocumentTitle(part ? `Partie ${part.number} · ${part.name}` : 'Partie');

  return (
    <CatalogGate query={catalog} variant="part">
      {(data) => {
        const found = data.parts.find((p) => p.number === partNumber);
        if (!found) return <NotFoundPanel title="Partie introuvable" />;
        return <PartContent part={found} catalog={data} />;
      }}
    </CatalogGate>
  );
}
