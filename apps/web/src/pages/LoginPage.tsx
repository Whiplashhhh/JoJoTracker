import { PASSWORD_MIN } from '@jojo/shared/client';
import { useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import { ApiError, api, errorMessage } from '../api/client';
import { forgetUserData, queryKeys, signOutIntent, useAuthConfig, useMe } from '../api/queries';
import { Field, PasswordInput, StrengthMeter } from '../components/Form';
import { Onomatopoeia } from '../components/Onomatopoeia';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePageTheme } from '../theme/theme-context';

type Mode = 'login' | 'signup';

const BACKDROP = [
  { text: 'ゴ', x: 6, y: 6, size: 58, rotate: -14 },
  { text: 'ゴ', x: 20, y: 14, size: 40, rotate: -6, delay: -2 },
  { text: 'ゴ', x: 80, y: 4, size: 50, rotate: 12, delay: -3 },
  { text: 'ド', x: 86, y: 44, size: 44, rotate: 16, delay: -1 },
  { text: 'ド', x: 78, y: 54, size: 30, rotate: 10, delay: -4 },
] as const;

export function LoginPage() {
  usePageTheme(undefined);
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('mode') === 'inscription' ? 'signup' : 'login';
  useDocumentTitle(mode === 'login' ? 'Connexion' : 'Inscription');
  const me = useMe();
  const config = useAuthConfig();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion() ?? false;
  // Page demandée avant la redirection (chemin interne uniquement : pas de redirection ouverte).
  const navState = location.state as { from?: unknown; signedOut?: unknown } | null;
  const from = navState?.from;
  const signedOut = navState?.signedOut === true;
  const destination =
    typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (me.data && !signedOut) return <Navigate to={destination} replace />;

  const signupOpen = config.data?.signupOpen ?? true;
  const inviteRequired = config.data?.inviteRequired ?? false;
  const sessionDays = config.data?.sessionDays ?? 30;

  const switchMode = (next: Mode) => {
    setErrors({});
    setFormError(null);
    setParams(next === 'signup' ? { mode: 'inscription' } : {}, {
      replace: true,
      state: location.state as unknown,
    });
  };

  /** Onglets : flèches gauche/droite pour passer de l'un à l'autre (motif ARIA « tabs »). */
  const onTabKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next: Mode = mode === 'login' ? 'signup' : 'login';
    switchMode(next);
    requestAnimationFrame(() => {
      document.getElementById(`tab-${next}`)?.focus();
    });
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    if (mode === 'signup' && password.length < PASSWORD_MIN) {
      setErrors({ password: `Au moins ${PASSWORD_MIN} caractères.` });
      return;
    }
    setSubmitting(true);
    try {
      const result =
        mode === 'login'
          ? await api.login({ username, password, remember })
          : await api.register({
              username,
              password,
              remember,
              ...(inviteRequired ? { inviteCode } : {}),
            });
      // Nouveau compte sur cet appareil : rien du précédent ne doit subsister.
      forgetUserData(queryClient);
      signOutIntent.reset();
      queryClient.setQueryData(queryKeys.me, result);
      await navigate(destination, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      }
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <div className="statusbar-shim" aria-hidden="true" />
      <div className="login__stage" aria-hidden="true">
        <div className="login__lines" />
        <div className="login__slab" />
        <Onomatopoeia glyphs={BACKDROP} tone="accent" className="onoma--menace" />
      </div>

      <header className="login__header">
        <motion.p
          className="login__kicker"
          initial={reduce ? false : { opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          Carnet de visionnage
        </motion.p>
        <motion.h1
          className="login__title"
          initial={reduce ? false : { opacity: 0, scale: 1.4, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: -4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <span className="login__title-a">JoJo</span>
          <span className="login__title-b">Tracker</span>
        </motion.h1>
        <p className="login__pitch">
          Coche tes épisodes et garde le fil de <em>l’aventure</em>.
        </p>
      </header>

      <motion.section
        className="panel login__panel"
        aria-label={mode === 'login' ? 'Connexion' : 'Inscription'}
        initial={reduce ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 28 }}
      >
        <div className="tabs" role="tablist" aria-label="Choisir une action" onKeyDown={onTabKey}>
          <button
            type="button"
            role="tab"
            id="tab-login"
            aria-controls="panel-auth"
            tabIndex={mode === 'login' ? 0 : -1}
            aria-selected={mode === 'login'}
            className="tabs__tab"
            onClick={() => {
              switchMode('login');
            }}
          >
            Connexion
          </button>
          <button
            type="button"
            role="tab"
            id="tab-signup"
            aria-controls="panel-auth"
            tabIndex={mode === 'signup' ? 0 : -1}
            aria-selected={mode === 'signup'}
            className="tabs__tab"
            onClick={() => {
              switchMode('signup');
            }}
          >
            Inscription
          </button>
        </div>

        <div id="panel-auth" role="tabpanel" aria-labelledby={`tab-${mode}`}>
          {mode === 'signup' && !signupOpen ? (
            <div className="closed">
              <p className="closed__stamp" aria-hidden="true">
                FERMÉ
              </p>
              <h2 className="closed__title">Les inscriptions sont fermées</h2>
              <p className="closed__text">
                Ce tracker est réservé à ses lecteurs actuels. Si tu as déjà un compte,
                connecte-toi.
              </p>
              <button
                type="button"
                className="btn btn--accent btn--block"
                onClick={() => {
                  switchMode('login');
                }}
              >
                Se connecter
              </button>
            </div>
          ) : (
            <form className="form" onSubmit={(e) => void onSubmit(e)} noValidate>
              <Field
                label="Pseudo"
                error={errors.username}
                {...(mode === 'signup'
                  ? { hint: '3 à 24 caractères : lettres, chiffres, _ et -' }
                  : {})}
              >
                {(id, describedBy) => (
                  <input
                    id={id}
                    className="input"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                    }}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(errors.username)}
                    required
                  />
                )}
              </Field>
              <Field
                label="Mot de passe"
                error={errors.password}
                {...(mode === 'signup' ? { hint: `${PASSWORD_MIN} caractères minimum` } : {})}
              >
                {(id, describedBy) => (
                  <PasswordInput
                    id={id}
                    value={password}
                    onChange={setPassword}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    describedBy={describedBy}
                    invalid={Boolean(errors.password)}
                  />
                )}
              </Field>
              {mode === 'signup' && <StrengthMeter password={password} />}
              {mode === 'signup' && inviteRequired && (
                <Field label="Code d’invitation" error={errors.inviteCode}>
                  {(id, describedBy) => (
                    <input
                      id={id}
                      className="input"
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value);
                      }}
                      autoComplete="off"
                      autoCapitalize="none"
                      aria-describedby={describedBy}
                      required
                    />
                  )}
                </Field>
              )}
              <label className="check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => {
                    setRemember(e.target.checked);
                  }}
                />
                <span className="check__box" aria-hidden="true" />
                <span>Rester connectée ({sessionDays} jours)</span>
              </label>
              {formError && (
                <p className="form__error" role="alert">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                className="btn btn--accent btn--xl btn--block"
                disabled={submitting}
              >
                {submitting ? '…' : mode === 'login' ? 'Entrer' : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>
      </motion.section>
      <p className="login__footer">Appli de fan non officielle</p>
    </div>
  );
}
