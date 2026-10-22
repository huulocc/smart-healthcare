import { AlertCircle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AsyncState } from '../../hooks/useAsync';

import styles from './AsyncSection.module.css';

interface Props<T> {
  state: AsyncState<T>;
  onRetry: () => void;
  children: (data: T) => ReactNode;
}

/**
 * Spinner, or the error with a way out, or the screen itself. Every admin panel goes through
 * this so "the backend is down" never looks like "there is nothing here".
 */
function AsyncSection<T>({ state, onRetry, children }: Props<T>) {
  if (state.status === 'loading') {
    return (
      <div className={styles.panel} role="status">
        <Loader2 size={28} className={styles.spinner} />
        <p className={styles.text}>Loading...</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={styles.panel} role="alert">
        <AlertCircle size={28} className={styles.errorIcon} />
        <p className={styles.text}>{state.message}</p>
        <button type="button" className="admin-secondary-btn" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  return <>{children(state.data)}</>;
}

export default AsyncSection;
