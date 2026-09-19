import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../../components/Button';
import { verifyEmail } from '../../api/authApi';
import { toApiError } from '../../api/errors';
import styles from './VerifyEmail.module.css';

type Status = 'checking' | 'done' | 'failed';

/** Opened from the activation email: /verify-email?token=... */
const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'checking' : 'failed');
  const [message, setMessage] = useState('This activation link is missing its code.');
  // The token only works once, and React runs effects twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    verifyEmail(token)
      .then(() => setStatus('done'))
      .catch((error) => {
        setMessage(toApiError(error).message);
        setStatus('failed');
      });
  }, [token]);

  if (status === 'checking') {
    return (
      <div className={styles.wrapper}>
        <Loader2 className={styles.spinner} size={28} />
        <h2 className={styles.title}>Activating your account</h2>
        <p className={styles.subtitle}>One moment please.</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={styles.wrapper}>
        <div className={`${styles.icon} ${styles.iconError}`}>
          <AlertCircle size={22} />
        </div>
        <h2 className={styles.title}>We could not activate your account</h2>
        <p className={styles.subtitle}>{message}</p>
        <Button fullWidth to="/login">
          Back to log in
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.icon}>
        <CheckCircle2 size={22} />
      </div>
      <h2 className={styles.title}>Your account is active</h2>
      <p className={styles.subtitle}>You can log in now and book your first appointment.</p>
      <Button
        fullWidth
        onClick={() => navigate('/login', { state: { notice: 'Your account is active. Please log in.' } })}
      >
        Log In
      </Button>
    </div>
  );
};

export default VerifyEmail;
