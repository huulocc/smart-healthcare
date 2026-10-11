import { startTransition } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthTabs, { type AuthMode } from '../../components/AuthTabs';
import Login from '../Login/Login';
import Register from '../Register/Register';
import styles from './AuthPage.module.css';

const PATHS: Record<AuthMode, string> = { login: '/login', register: '/register' };

/**
 * One page that holds both forms. The tabs swap the form in place instead of
 * opening another page, but the URL still changes so /login and /register keep
 * working for links, bookmarks and the ProtectedRoute redirect.
 */
const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mode: AuthMode = location.pathname.startsWith('/register') ? 'register' : 'login';

  const selectMode = (next: AuthMode) => {
    if (next === mode) return;
    // The state carries a notice or a redirect target meant for the form we are leaving.
    startTransition(() => navigate(PATHS[next], { replace: true }));
  };

  return (
    <div className={styles.page}>
      <AuthTabs mode={mode} onSelect={selectMode} />
      {/* The key restarts the fade-in every time the form changes. */}
      <div key={mode} className={styles.panel}>
        {mode === 'login' ? <Login /> : <Register />}
      </div>
    </div>
  );
};

export default AuthPage;
