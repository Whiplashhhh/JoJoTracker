import { motion, useReducedMotion } from 'motion/react';
import { NavLink, useLocation, useOutlet } from 'react-router';
import { useOnline } from '../hooks/useOnline';
import { HomeIcon, PanelsIcon, UserIcon } from './Icons';

const NAV = [
  { to: '/', label: 'Accueil', icon: HomeIcon, end: true },
  { to: '/parties', label: 'Parties', icon: PanelsIcon, end: false },
  { to: '/profil', label: 'Profil', icon: UserIcon, end: true },
] as const;

function BottomNav() {
  return (
    <nav className="nav" aria-label="Navigation principale">
      <span className="nav__brand" aria-hidden="true">
        <span className="nav__brand-glyph">ゴ</span>
      </span>
      <ul className="nav__list">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className="nav__link">
              <span className="nav__slab" aria-hidden="true" />
              <Icon size={24} />
              <span className="nav__label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Coquille des écrans connectés : contenu animé + navigation dans la zone du pouce. */
export function AppShell() {
  const location = useLocation();
  const outlet = useOutlet();
  const online = useOnline();
  const reduce = useReducedMotion() ?? false;
  const key = location.pathname;

  return (
    <div className="shell">
      <div className="statusbar-shim" aria-hidden="true" />
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      {!online && (
        <p className="offline-strip" role="status">
          Hors ligne — ゴゴゴ… le cochage reviendra avec le réseau.
        </p>
      )}
      <main id="contenu" className="shell__main" tabIndex={-1}>
        <motion.div
          key={key}
          className="page"
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {outlet}
        </motion.div>
        {!reduce && <span key={`wipe-${key}`} className="page-wipe" aria-hidden="true" />}
      </main>
      <BottomNav />
    </div>
  );
}
