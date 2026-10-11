import { startTransition } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    // One transition for both updates. Otherwise React renders "logged out" while still on a protected
    // page, and ProtectedRoute sends the user to /login instead of the home page.
    startTransition(() => {
      logout();
      navigate('/');
    });
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.navContainer}`}>
        <div className={styles.logo}>
          <Link to="/">
            <span className={styles.logoAccent}>Smart</span>Healthcare
          </Link>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/departments">Departments</Link></li>
            <li><Link to="/doctors">Doctors</Link></li>
          </ul>
        </nav>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className={styles.loginBtn}>Profile</Link>
              <button type="button" onClick={handleLogout} className={`${styles.registerBtn} ${styles.logoutBtn}`}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.loginBtn}>Log In</Link>
              <Link to="/register" className={styles.registerBtn}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
