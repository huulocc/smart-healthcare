import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoAccent}>Smart</span>Healthcare
        </Link>
      </header>
      <main className={styles.main}>
        <div className={styles.card}>{children}</div>
      </main>
    </div>
  );
};

export default AuthLayout;
