import { PASSWORD_MIN } from '@jojo/shared/client';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type CSSProperties, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, api, errorMessage } from '../api/client';
import { clearSession, queryKeys, useMe } from '../api/queries';
import { BottomSheet } from '../components/BottomSheet';
import { Field, PasswordInput, StrengthMeter } from '../components/Form';
import { DownloadIcon } from '../components/Icons';
import { InstallEntry } from '../components/Install';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatLongDate } from '../lib/format';
import { revealStore } from '../lib/reveal-store';
import { toast } from '../lib/toast-store';
import { usePageTheme } from '../theme/theme-context';

function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    clearSession(queryClient);
    await navigate('/connexion', { replace: true });
  };
}

function AntiSpoilToggle({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const onChange = async () => {
    setBusy(true);
    try {
      const settings = await api.updateSettings({ antiSpoil: !enabled });
      queryClient.setQueryData(
        queryKeys.me,
        (old: Awaited<ReturnType<typeof api.me>> | null | undefined) =>
          old ? { ...old, settings } : old,
      );
      if (settings.antiSpoil) revealStore.clear();
      // On jette le catalogue en cache (il peut contenir des titres non vus) : il sera relu
      // au prochain affichage, déjà filtré par le serveur.
      queryClient.removeQueries({ queryKey: queryKeys.catalog });
      toast.show({
        message: settings.antiSpoil
          ? 'Mode anti-spoil activé : les titres non vus sont masqués.'
          : 'Mode anti-spoil désactivé : tous les titres sont visibles.',
        tone: 'success',
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="toggle-row">
      <div>
        <p className="toggle-row__label" id="antispoil-label">
          Mode anti-spoil
        </p>
        <p className="toggle-row__hint" id="antispoil-hint">
          {enabled
            ? 'Activé : seuls les titres des épisodes vus sont affichés.'
            : 'Désactivé : tous les titres sont affichés, même ceux à venir.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="antispoil-label"
        aria-describedby="antispoil-hint"
        className="switch"
        disabled={busy}
        onClick={() => void onChange()}
      >
        <span className="switch__track" aria-hidden="true">
          <span className="switch__on">ON</span>
          <span className="switch__off">OFF</span>
          <span className="switch__thumb" />
        </span>
      </button>
    </div>
  );
}

function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setErrors({});
    if (next.length < PASSWORD_MIN) {
      setErrors({ newPassword: `Au moins ${PASSWORD_MIN} caractères.` });
      return;
    }
    setBusy(true);
    try {
      await api.changePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      toast.show({
        message: 'Mot de passe changé. Les autres appareils ont été déconnectés.',
        tone: 'success',
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_CREDENTIALS') {
        setErrors({ currentPassword: error.message });
      } else if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      } else {
        toast.error(errorMessage(error));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={(e) => void onSubmit(e)} noValidate>
      <Field label="Mot de passe actuel" error={errors.currentPassword}>
        {(id, describedBy) => (
          <PasswordInput
            id={id}
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
            describedBy={describedBy}
            invalid={Boolean(errors.currentPassword)}
          />
        )}
      </Field>
      <Field
        label="Nouveau mot de passe"
        error={errors.newPassword}
        hint={`${PASSWORD_MIN} caractères minimum`}
      >
        {(id, describedBy) => (
          <PasswordInput
            id={id}
            value={next}
            onChange={setNext}
            autoComplete="new-password"
            describedBy={describedBy}
            invalid={Boolean(errors.newPassword)}
          />
        )}
      </Field>
      <StrengthMeter password={next} />
      <button
        type="submit"
        className="btn btn--accent btn--block"
        disabled={busy || !current || !next}
      >
        Changer le mot de passe
      </button>
    </form>
  );
}

function DeleteAccount({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signOut = useSignOut();
  const matches = confirm.trim().toLowerCase() === username.toLowerCase();

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.deleteAccount({ confirmUsername: confirm.trim(), password });
      setOpen(false);
      await signOut();
      toast.show({ message: 'Compte supprimé. サヨナラ…', tone: 'info' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn--danger btn--block"
        onClick={() => {
          setConfirm('');
          setPassword('');
          setError(null);
          setOpen(true);
        }}
      >
        Supprimer mon compte
      </button>
      <BottomSheet
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        tone="danger"
        kicker="バーン"
        title="Supprimer définitivement ?"
      >
        <p className="sheet__text">
          Ton compte et toute ta progression seront effacés, sans retour possible. Pour confirmer,
          retape ton pseudo (<strong>{username}</strong>) et ton mot de passe.
        </p>
        <Field label="Ton pseudo">
          {(id, describedBy) => (
            <input
              id={id}
              className="input"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
              }}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <Field label="Ton mot de passe" error={error ?? undefined}>
          {(id, describedBy) => (
            <PasswordInput
              id={id}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              describedBy={describedBy}
              invalid={error !== null}
            />
          )}
        </Field>
        <div className="sheet__actions">
          <button
            type="button"
            className="btn btn--danger btn--block"
            disabled={!matches || password.length === 0 || busy}
            onClick={() => void onDelete()}
          >
            Supprimer pour toujours
          </button>
          <button
            type="button"
            className="btn btn--paper btn--block"
            onClick={() => {
              setOpen(false);
            }}
          >
            Annuler
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

export function ProfilePage() {
  usePageTheme(undefined);
  useDocumentTitle('Profil');
  const me = useMe();
  const signOut = useSignOut();
  const [busy, setBusy] = useState(false);
  if (!me.data) return null;
  const { user, settings } = me.data;

  const run = async (action: () => Promise<void>, after?: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      await after?.();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile">
      <header className="page-head">
        <p className="page-head__kicker" aria-hidden="true">
          プロフィール
        </p>
        <h1
          className="page-head__title page-head__title--fit"
          style={{ '--len': Math.max(user.username.length, 6) } as CSSProperties}
        >
          {user.username}
        </h1>
        <p className="page-head__sub">Membre depuis le {formatLongDate(user.createdAt)}</p>
      </header>

      <div className="profile__grid">
        <section className="panel profile__card" aria-labelledby="sec-spoil">
          <h2 id="sec-spoil" className="profile__title">
            Anti-spoil
          </h2>
          <AntiSpoilToggle enabled={settings.antiSpoil} />
        </section>

        <section className="panel profile__card" aria-labelledby="sec-install">
          <h2 id="sec-install" className="profile__title">
            Appli
          </h2>
          <InstallEntry />
        </section>

        <section className="panel profile__card" aria-labelledby="sec-password">
          <h2 id="sec-password" className="profile__title">
            Mot de passe
          </h2>
          <ChangePasswordForm />
        </section>

        <section className="panel profile__card" aria-labelledby="sec-session">
          <h2 id="sec-session" className="profile__title">
            Sessions
          </h2>
          <div className="stack">
            <button
              type="button"
              className="btn btn--paper btn--block"
              disabled={busy}
              onClick={() => void run(api.logout, signOut)}
            >
              Se déconnecter
            </button>
            <button
              type="button"
              className="btn btn--paper btn--block"
              disabled={busy}
              onClick={() => void run(api.logoutAll, signOut)}
            >
              Se déconnecter partout
            </button>
          </div>
        </section>

        <section className="panel profile__card" aria-labelledby="sec-data">
          <h2 id="sec-data" className="profile__title">
            Mes données
          </h2>
          <p className="profile__hint">
            Exporte ta progression (épisodes vus et dates) au format JSON.
          </p>
          <button
            type="button"
            className="btn btn--paper btn--block"
            disabled={busy}
            onClick={() => void run(() => api.downloadExport())}
          >
            <DownloadIcon size={20} /> Exporter en JSON
          </button>
        </section>

        <section className="panel profile__card profile__card--danger" aria-labelledby="sec-danger">
          <h2 id="sec-danger" className="profile__title">
            Zone dangereuse
          </h2>
          <DeleteAccount username={user.username} />
        </section>

        <section className="panel profile__card profile__about" aria-labelledby="sec-about">
          <h2 id="sec-about" className="profile__title">
            À propos
          </h2>
          <p>
            JoJo Tracker est une appli de fan, non officielle et sans lien avec les ayants droit.
            Aucun visuel officiel : tout est dessiné maison. Les titres ne sont envoyés à ton
            appareil qu’une fois l’épisode vu.
          </p>
          <p className="profile__meta">
            Polices : Anton, Archivo, Dela Gothic One (SIL Open Font License). Version{' '}
            {__APP_VERSION__}.
          </p>
        </section>
      </div>
    </div>
  );
}
