import { useId } from 'react';
import type { ReactNode } from 'react';

import styles from './Field.module.css';

interface Props {
  label: string;
  error?: string;
  /** A line under the field explaining a rule the user cannot guess. */
  hint?: ReactNode;
  /** Gets the id to put on the input or select, so the label actually points at it. */
  children: (id: string) => ReactNode;
}

const Field = ({ label, error, hint, children }: Props) => {
  const id = useId();

  return (
    <div className={`admin-form-field ${styles.field}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <p className={styles.hint}>{hint}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Field;
