import { computePartProgress, type CatalogResponse, type PartView } from '@jojo/shared/client';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { STATUS_LABELS } from '../lib/labels';
import { paletteFor, paletteVars } from '../theme/palettes';

/** Couverture de partie façon volume relié : numéro géant, nom, progression, état. */
export function PartCover({ part, catalog }: { part: PartView; catalog: CatalogResponse }) {
  const progress = computePartProgress(catalog.episodes, part.number, catalog.today);
  const ratio = progress.total === 0 ? 0 : progress.watched / progress.total;
  return (
    <Link
      to={`/parties/${part.number}`}
      className={`cover cover--${progress.status}`}
      style={{ ...paletteVars(paletteFor(part.number)), '--ratio': `${ratio}` } as CSSProperties}
      aria-label={`Partie ${part.number} : ${part.name}. ${progress.watched} sur ${progress.total} épisodes vus. ${STATUS_LABELS[progress.status]}.`}
    >
      <span className="cover__art" aria-hidden="true">
        <span className="cover__dots" />
        <span className="cover__numeral">{part.number}</span>
      </span>
      <span className="cover__tag" aria-hidden="true">
        Partie {part.number}
      </span>
      <span className="cover__status" aria-hidden="true">
        {STATUS_LABELS[progress.status]}
      </span>
      <span className="cover__name" aria-hidden="true">
        {part.name}
      </span>
      <span className="cover__progress" aria-hidden="true">
        <span className="cover__bar">
          <span className="cover__fill" />
        </span>
        <span className="cover__count">
          {progress.watched}/{progress.total}
        </span>
      </span>
    </Link>
  );
}
