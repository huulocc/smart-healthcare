import { useState } from 'react';
import { resendVerification } from '../api/authApi';
import styles from './ResendVerification.module.css';

type State = 'idle' | 'sending' | 'sent' | 'error';

/** "Send a new activation link", used on the login page and right after signing up. */
const ResendVerification = ({ email }: { email: string }) => {
  const [state, setState] = useState<State>('idle');

  const send = async () => {
    setState('sending');
    try {
      await resendVerification(email);
      setState('sent');
    } catch {
      setState('error');
    }
  };

  if (state === 'sent') {
    return <span className={styles.sent}>A new activation link is on its way to {email}.</span>;
  }

  return (
    <span className={styles.wrapper}>
      <button type="button" className={styles.link} onClick={send} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending...' : 'Send a new activation link'}
      </button>
      {state === 'error' && <span className={styles.failed}>Could not send it. Please try again.</span>}
    </span>
  );
};

export default ResendVerification;
