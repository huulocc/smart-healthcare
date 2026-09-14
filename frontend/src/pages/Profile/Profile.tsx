import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import Button from '../../components/Button';
import ProfileView from './ProfileView';
import ProfileEditForm from './ProfileEditForm';
import { getMyProfile } from '../../api/userApi';
import { toApiError } from '../../api/errors';
import type { User } from '../../api/types';
import styles from './Profile.module.css';

type ProfileState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; user: User };

const Profile = () => {
  const location = useLocation();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice ?? null,
  );

  useEffect(() => {
    // Ignore a late response if the user already left the page (or React StrictMode re-ran the effect).
    let ignore = false;
    getMyProfile().then(
      (user) => {
        if (!ignore) setState({ status: 'ready', user });
      },
      (error) => {
        if (!ignore) setState({ status: 'error', message: toApiError(error).message });
      },
    );
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const retry = () => {
    setState({ status: 'loading' });
    setReloadKey((key) => key + 1);
  };

  const handleEdit = () => {
    setSavedMessage(null);
    setIsEditing(true);
  };

  const handleSaved = (user: User) => {
    setState({ status: 'ready', user });
    setIsEditing(false);
    setSavedMessage('Profile updated successfully.');
  };

  return (
    <div className={styles.page}>
      <div className="container">
        {state.status === 'loading' && (
          <div className={`${styles.card} ${styles.statusCard}`} role="status">
            <Loader2 size={32} className={styles.spinner} />
            <p className={styles.subtitle}>Loading your profile...</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className={`${styles.card} ${styles.statusCard}`} role="alert">
            <AlertCircle size={32} className={styles.errorIcon} />
            <h1 className={styles.name}>Could not load your profile</h1>
            <p className={styles.subtitle}>{state.message}</p>
            <Button onClick={retry}>Try Again</Button>
          </div>
        )}

        {state.status === 'ready' && (
          <>
            {savedMessage && (
              <p className={styles.successBanner} role="status">
                {savedMessage}
              </p>
            )}
            {isEditing ? (
              <ProfileEditForm user={state.user} onSaved={handleSaved} onCancel={() => setIsEditing(false)} />
            ) : (
              <ProfileView user={state.user} onEdit={handleEdit} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
