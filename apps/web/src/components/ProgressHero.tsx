import { computePartProgress, computeProgress, type CatalogResponse } from '@jojo/shared/client';
import type { CSSProperties } from 'react';
import { paletteFor } from '../theme/palettes';

function Starburst({ percent }: { percent: number }) {
  const points = Array.from({ length: 28 }, (_, i) => {
    const r = i % 2 === 0 ? 50 : 39;
    const a = (i / 28) * Math.PI * 2 - Math.PI / 2;
    return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  return (
    <div className="burst-badge" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="burst-badge__svg">
        <polygon points={points} transform="translate(4 4)" className="burst-badge__shadow" />
        <polygon points={points} className="burst-badge__shape" />
      </svg>
      <span className="burst-badge__value">
        {percent}
        <small>%</small>
      </span>
    </div>
  );
}

/** Progression globale mise en scène + jauge segmentée par partie. */
export function ProgressHero({ catalog }: { catalog: CatalogResponse }) {
  const global = computeProgress(catalog.episodes, catalog.today);
  const parts = catalog.parts.map((p) => ({
    ...p,
    progress: computePartProgress(catalog.episodes, p.number, catalog.today),
  }));
  const summary = parts
    .map((p) => `partie ${p.number} : ${p.progress.watched} sur ${p.progress.total}`)
    .join(', ');

  return (
    <section className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className="hero__kicker">
        Ta progression
      </h1>
      <div className="hero__row">
        <p className="hero__score">
          <span className="sr-only">
            {global.watched} épisodes vus sur {global.total}, soit {global.percent} %.
          </span>
          <span className="hero__count" aria-hidden="true">
            {global.watched}
          </span>
          <span className="hero__total" aria-hidden="true">
            <span>/ {global.total}</span>
            <small>épisodes vus</small>
          </span>
        </p>
        <Starburst percent={global.percent} />
      </div>
      <div className="gauge" role="img" aria-label={`Progression par partie — ${summary}.`}>
        {parts.map((p) => {
          const palette = paletteFor(p.number);
          return (
            <div
              key={p.number}
              className="gauge__seg"
              style={
                {
                  flexGrow: p.progress.total,
                  '--seg-color': palette.accent,
                  '--seg-fill': `${p.progress.total === 0 ? 0 : p.progress.watched / p.progress.total}`,
                } as CSSProperties
              }
            >
              <span className="gauge__fill" />
              <span className="gauge__label">{p.number}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
