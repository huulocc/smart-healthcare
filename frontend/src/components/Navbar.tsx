import { startTransition, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { isAuthenticated, role, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
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

        <nav
          id="main-navigation"
          aria-label="Main navigation"
          className={`${styles.nav} ${menuOpen ? styles.open : ''}`}
          onClick={() => setMenuOpen(false)}
        >
          <ul className={styles.navList}>
            <li>
              <NavLink to="/" end>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/departments">Departments</NavLink>
            </li>
            <li>
              <NavLink to="/doctors">Doctors</NavLink>
            </li>
            <li>
              <NavLink to="/my-appointments">My appointments</NavLink>
            </li>
            {/* The only way into the admin area: there is no link to it anywhere else. */}
            {role === 'ADMIN' && (
              <li>
                <NavLink to="/admin">Admin</NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className={styles.loginBtn}>
                Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className={`${styles.registerBtn} ${styles.logoutBtn}`}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.loginBtn}>
                Log In
              </Link>
              <Link to="/register" className={styles.registerBtn}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
