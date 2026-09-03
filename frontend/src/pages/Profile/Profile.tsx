import { useState } from 'react';
import ProfileView from './ProfileView';
import ProfileEditForm from './ProfileEditForm';
import { CURRENT_USER } from '../../data/mockUser';
import type { ProfileFormValues } from '../../schemas/authSchemas';
import styles from './Profile.module.css';

const Profile = () => {
  const [user, setUser] = useState(CURRENT_USER);
  const [isEditing, setIsEditing] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleEdit = () => {
    setSavedMessage(null);
    setIsEditing(true);
  };

  const handleSave = (values: ProfileFormValues) => {
    setUser((prev) => ({ ...prev, ...values }));
    setIsEditing(false);
    setSavedMessage('Profile updated successfully.');
  };

  return (
    <div className={styles.page}>
      <div className="container">
        {savedMessage && <p className={styles.successBanner}>{savedMessage}</p>}
        {isEditing ? (
          <ProfileEditForm user={user} onSave={handleSave} onCancel={() => setIsEditing(false)} />
        ) : (
          <ProfileView user={user} onEdit={handleEdit} />
        )}
      </div>
    </div>
  );
};

export default Profile;
