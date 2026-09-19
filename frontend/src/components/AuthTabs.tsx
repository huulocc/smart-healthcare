import styles from './AuthTabs.module.css';

export type AuthMode = 'login' | 'register';

interface AuthTabsProps {
  mode: AuthMode;
  onSelect: (mode: AuthMode) => void;
}

const TABS: { value: AuthMode; label: string }[] = [
  { value: 'login', label: 'Log In' },
  { value: 'register', label: 'Sign Up' },
];

/** Pill switcher between the two forms of the auth page. */
const AuthTabs = ({ mode, onSelect }: AuthTabsProps) => (
  <div className={styles.track} role="tablist">
    {TABS.map((tab) => (
      <button
        key={tab.value}
        type="button"
        role="tab"
        aria-selected={mode === tab.value}
        onClick={() => onSelect(tab.value)}
        className={`${styles.tab} ${mode === tab.value ? styles.active : ''}`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default AuthTabs;
