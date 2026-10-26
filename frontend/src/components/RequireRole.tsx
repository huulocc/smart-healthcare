import { AlertCircle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import type { Role } from '../api/types';
import { useAuth } from '../context/useAuth';

import styles from './RequireRole.module.css';

interface Props {
  /** Leave it out to mean "any signed-in account". */
  role?: Role;
  children: ReactNode;
}

/** Who the guarded area belongs to, for the refusal message. */
const audience: Record<Role, string> = {
  ADMIN: 'administrators',
  DOCTOR: 'doctors',
  PATIENT: 'patients',
};

const RequireRole = ({ role, children }: Props) => {
  const { status, user } = useAuth();
  const location = useLocation();

  // After a refresh the token is known before the account is. Deciding here would throw an
  // admin off their own page every time they pressed F5, so wait instead.
  if (status === 'resolving') {
    return (
      <div className={styles.panel} role="status">
        <Loader2 size={32} className={styles.spinner} />
        <p className={styles.text}>Checking your account...</p>
      </div>
    );
  }

  if (user === null) {
    // Remember where the user wanted to go, so Login can send them back there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // They are signed in, so sending them to a login form they are already past would only
  // confuse them. Say what happened instead.
  if (role !== undefined && user.role !== role) {
    return (
      <div className={styles.panel} role="alert">
        <AlertCircle size={32} className={styles.errorIcon} />
        <h1 className={styles.heading}>You do not have access to this page</h1>
        <p className={styles.text}>
          This area is for {audience[role]}. You are signed in as {user.email}.
        </p>
        <Link to="/" className={styles.link}>
          Back to home
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireRole;
