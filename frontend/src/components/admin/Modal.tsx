import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import styles from './Modal.module.css';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** The buttons; left out when the body supplies its own (a form's submit, say). */
  footer?: ReactNode;
}

/**
 * The one dialog in the app: every admin form, confirm and approval opens in it. Rendered
 * only while it is open, so mounting it is what opens it.
 */
const Modal = ({ title, onClose, children, footer }: Props) => {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Escape closes, and the page behind must not scroll while a dialog is over it.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move the keyboard into the dialog, to the first thing worth typing in.
    panel.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    // The backdrop closes on a click, but only on itself: a click inside the panel bubbles
    // up to here too, and would otherwise close the dialog the user is typing in.
    <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={title} ref={panel}>
        <header className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>
  );
};

export default Modal;
