import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: ReactNode;
}

const HIGHLIGHTS = [
  'Book an appointment with a doctor in seconds',
  'Doctors see their schedule by day and by week',
  'Automatic reminders by email and SMS',
];

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className={styles.layout}>
      <aside className={styles.brand}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoMark} aria-hidden="true" />
          Smart Healthcare
        </Link>

        <div className={styles.pitch}>
          <h1 className={styles.tagline}>Booking a check-up should feel like texting a friend.</h1>
          <p className={styles.subline}>
            Patients pick a time that suits them, doctors keep the whole week in view. Everything in one place.
          </p>
          <ul className={styles.highlights}>
            {HIGHLIGHTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className={styles.photoPlaceholder}>
          <p>PHOTO PLACEHOLDER — doctor / clinic</p>
        </div>
      </aside>

      <main className={styles.formColumn}>
        <div className={styles.formCard}>
          {children}
          <p className={styles.support}>
            Need help? <a href="#support">Contact support</a> or call 1900 1234
          </p>
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
