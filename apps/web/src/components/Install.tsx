import { useState } from 'react';
import { install, useInstallState } from '../hooks/useInstallPrompt';
import { BottomSheet } from './BottomSheet';
import { CloseIcon, DownloadIcon, IosShareIcon, PlusSquareIcon } from './Icons';

/** Fiche illustrée pour iOS : Partager → Sur l'écran d'accueil. */
export function IosInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} kicker="ドン！" title="Installer sur l’iPhone">
      <ol className="ios-steps">
        <li>
          <span className="ios-steps__num">1</span>
          <span>
            Touche le bouton <strong>Partager</strong>
            <span className="ios-steps__icon" aria-hidden="true">
              <IosShareIcon size={22} />
            </span>{' '}
            en bas de Safari.
          </span>
        </li>
        <li>
          <span className="ios-steps__num">2</span>
          <span>
            Fais défiler et choisis <strong>Sur l’écran d’accueil</strong>
            <span className="ios-steps__icon" aria-hidden="true">
              <PlusSquareIcon size={22} />
            </span>
            .
          </span>
        </li>
        <li>
          <span className="ios-steps__num">3</span>
          <span>
            Valide avec <strong>Ajouter</strong> : l’appli s’ouvre ensuite en plein écran, comme une
            vraie.
          </span>
        </li>
      </ol>
      <div className="ios-mock" aria-hidden="true">
        <div className="ios-mock__screen">
          <span className="ios-mock__glyph">ゴ</span>
          <span className="ios-mock__callout">Ici !</span>
        </div>
        <div className="ios-mock__bar">
          <span className="ios-mock__btn">‹</span>
          <span className="ios-mock__btn">›</span>
          <span className="ios-mock__share">
            <IosShareIcon size={22} />
          </span>
          <span className="ios-mock__btn">▢</span>
          <span className="ios-mock__btn">⧉</span>
        </div>
      </div>
      <button type="button" className="btn btn--accent btn--block" onClick={onClose}>
        Compris !
      </button>
    </BottomSheet>
  );
}

/** Bannière discrète sur l'accueil (à partir de la 2e visite, masquée si refusée ou installée). */
export function InstallBanner() {
  const state = useInstallState();
  const [iosOpen, setIosOpen] = useState(false);
  if (state.mode === 'standalone' || state.mode === 'unsupported') return null;
  if (state.dismissed || state.visits < 2) return null;

  return (
    <>
      <aside className="install-banner" aria-label="Installer l’appli">
        <span className="install-banner__glyph" aria-hidden="true">
          ゴ
        </span>
        <p className="install-banner__text">
          <strong>Installe l’appli</strong>
          <span>Sur ton écran d’accueil, en plein écran.</span>
        </p>
        <button
          type="button"
          className="btn btn--accent btn--sm"
          onClick={() => {
            if (state.mode === 'ios') setIosOpen(true);
            else void install.prompt();
          }}
        >
          <DownloadIcon size={18} /> Installer
        </button>
        <button
          type="button"
          className="install-banner__close"
          aria-label="Ne plus proposer l’installation"
          onClick={() => {
            install.dismiss();
          }}
        >
          <CloseIcon size={18} />
        </button>
      </aside>
      <IosInstallSheet
        open={iosOpen}
        onClose={() => {
          setIosOpen(false);
        }}
      />
    </>
  );
}

/** Entrée « Installer l'appli » du profil (toujours disponible tant que l'appli n'est pas installée). */
export function InstallEntry() {
  const state = useInstallState();
  const [iosOpen, setIosOpen] = useState(false);
  if (state.mode === 'standalone') {
    return <p className="profile__hint">L’appli est installée sur cet appareil. ドン！</p>;
  }
  if (state.mode === 'unsupported') {
    // Navigateur Chromium sans invitation disponible (déjà refusée, ou appli déjà installée).
    const chromium = 'onbeforeinstallprompt' in window;
    return (
      <p className="profile__hint">
        {chromium
          ? 'Pour installer l’appli, ouvre le menu du navigateur (les trois points) puis « Installer l’appli » ou « Ajouter à l’écran d’accueil ». Si elle est déjà installée, lance-la depuis ton écran d’accueil.'
          : 'Ouvre l’appli dans Chrome (Android) ou Safari (iPhone) pour l’installer sur ton écran d’accueil.'}
      </p>
    );
  }
  return (
    <>
      <button
        type="button"
        className="btn btn--accent btn--block"
        onClick={() => {
          if (state.mode === 'ios') setIosOpen(true);
          else void install.prompt();
        }}
      >
        <DownloadIcon size={20} /> Installer l’appli
      </button>
      <IosInstallSheet
        open={iosOpen}
        onClose={() => {
          setIosOpen(false);
        }}
      />
    </>
  );
}
