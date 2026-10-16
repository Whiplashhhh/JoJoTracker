import { Link } from 'react-router';
import { DODODO, Onomatopoeia } from './Onomatopoeia';
import { ReloadIcon } from './Icons';

/** Squelette de chargement stylé (trame qui pulse). */
export function Skeleton({ variant = 'home' }: { variant?: 'home' | 'part' | 'list' }) {
  const blocks =
    variant === 'part'
      ? ['skel--header', 'skel--bar', 'skel--row', 'skel--row', 'skel--row', 'skel--row']
      : variant === 'list'
        ? ['skel--cover', 'skel--cover', 'skel--cover', 'skel--cover']
        : ['skel--hero', 'skel--resume', 'skel--cover', 'skel--cover'];
  return (
    <div className={`skeleton skeleton--${variant}`} role="status" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      {blocks.map((b, i) => (
        <div
          key={i}
          className={`skel ${b}`}
          aria-hidden="true"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

/** Écran hors connexion, dans le style de l'appli. */
export function OfflineScreen({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="state-screen state-screen--offline" role="alert">
      <div className="state-screen__lines" aria-hidden="true" />
      <Onomatopoeia
        glyphs={[
          { text: 'ゴ', x: 4, y: 6, size: 72, rotate: -12 },
          { text: 'ゴ', x: 18, y: 15, size: 48, rotate: -6 },
          { text: 'ゴ', x: 74, y: 9, size: 58, rotate: 14 },
          { text: 'ゴ', x: 82, y: 70, size: 84, rotate: 8 },
          { text: 'ゴ', x: 70, y: 82, size: 46, rotate: 16 },
          { text: 'ゴ', x: 6, y: 80, size: 54, rotate: -4 },
        ]}
        tone="accent"
        className="onoma--menace"
      />
      <div className="panel state-panel">
        <p className="state-panel__kicker" aria-hidden="true">
          ゴゴゴゴ
        </p>
        <h1 className="state-panel__title">Pas de réseau…</h1>
        <p className="state-panel__text">
          Impossible de joindre le serveur. Tes épisodes cochés sont en sécurité : reviens quand la
          connexion sera de retour. (Le cochage hors ligne n’est pas possible.)
        </p>
        <button
          type="button"
          className="btn btn--accent btn--block"
          onClick={
            onRetry ??
            (() => {
              window.location.reload();
            })
          }
        >
          <ReloadIcon size={20} /> Réessayer
        </button>
      </div>
    </div>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-screen" role="alert">
      <div className="panel state-panel">
        <p className="state-panel__kicker" aria-hidden="true">
          バーン
        </p>
        <h1 className="state-panel__title">Aïe, un imprévu</h1>
        <p className="state-panel__text">{message}</p>
        {onRetry && (
          <button type="button" className="btn btn--accent btn--block" onClick={onRetry}>
            <ReloadIcon size={20} /> Réessayer
          </button>
        )}
      </div>
    </div>
  );
}

export function NotFoundPanel({ title = 'Page introuvable' }: { title?: string }) {
  return (
    <div className="state-screen">
      <Onomatopoeia
        glyphs={[
          { text: DODODO, x: 4, y: 8, size: 40, rotate: -10 },
          { text: DODODO, x: 30, y: 82, size: 34, rotate: 6 },
        ]}
        tone="accent"
      />
      <div className="panel state-panel">
        <p className="state-panel__kicker" aria-hidden="true">
          ？？？
        </p>
        <h1 className="state-panel__title">{title}</h1>
        <p className="state-panel__text">Cette case n’existe pas dans ce manga.</p>
        <Link to="/" className="btn btn--accent btn--block">
          Retour à l’accueil
        </Link>
      </div>
    </div>
  );
}
