import { useEffect, useRef } from 'react';
import styles from './GoogleSignInButton.module.css';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
// hl=en keeps Google's own button in English like the rest of the app.
const SCRIPT_URL = 'https://accounts.google.com/gsi/client?hl=en';

/** False until VITE_GOOGLE_CLIENT_ID is set, so the button simply does not appear. */
export const isGoogleSignInEnabled = CLIENT_ID.trim() !== '';

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }): void;
          renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Adds Google's script to the page once, however many buttons ask for it. */
function loadGoogleScript(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load Google sign-in'));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface GoogleSignInButtonProps {
  /** Runs with the ID token Google hands to the browser. */
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

const GoogleSignInButton = ({ onCredential, onError, text = 'continue_with' }: GoogleSignInButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Google keeps the first callback it is given, so read the latest one through a ref.
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!isGoogleSignInEnabled) return;

    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        const container = containerRef.current;
        if (cancelled || !container || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => callbackRef.current(response.credential),
        });
        container.replaceChildren();
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          locale: 'en',
          width: container.clientWidth || 360,
        });
      })
      .catch((error: Error) => onError?.(error.message));

    return () => {
      cancelled = true;
    };
  }, [text, onError]);

  if (!isGoogleSignInEnabled) return null;

  return <div ref={containerRef} className={styles.container} />;
};

export default GoogleSignInButton;
