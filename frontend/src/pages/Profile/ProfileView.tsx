import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Mail, Phone, Calendar, MapPin, User as UserIcon } from 'lucide-react';
import Button from '../../components/Button';
import type { User } from '../../api/types';
import styles from './Profile.module.css';

interface ProfileViewProps {
  user: User;
  onEdit: () => void;
}

const ProfileView = ({ user, onEdit }: ProfileViewProps) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          <UserIcon size={36} />
        </div>
        <div>
          <h1 className={styles.name}>{user.fullName}</h1>
          <p className={styles.subtitle}>Patient Profile</p>
        </div>
      </div>

      <div className={styles.infoList}>
        <div className={styles.infoRow}>
          <Mail size={18} className={styles.infoIcon} />
          <div>
            <span className={styles.infoLabel}>Email</span>
            <p className={styles.infoValue}>{user.email}</p>
          </div>
        </div>
        <div className={styles.infoRow}>
          <Phone size={18} className={styles.infoIcon} />
          <div>
            <span className={styles.infoLabel}>Phone Number</span>
            <p className={styles.infoValue}>{user.phone}</p>
          </div>
        </div>
        <div className={styles.infoRow}>
          <Calendar size={18} className={styles.infoIcon} />
          <div>
            <span className={styles.infoLabel}>Date of Birth</span>
            <p className={styles.infoValue}>{user.dob ? format(new Date(user.dob), 'dd/MM/yyyy') : 'Not provided'}</p>
          </div>
        </div>
        <div className={styles.infoRow}>
          <MapPin size={18} className={styles.infoIcon} />
          <div>
            <span className={styles.infoLabel}>Address</span>
            <p className={styles.infoValue}>{user.address ?? 'Not provided'}</p>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="outline" onClick={onEdit}>
          Edit Profile
        </Button>
        <Link to="/profile/change-password" className={styles.changePasswordLink}>
          Change Password
        </Link>
      </div>
    </div>
  );
};

export default ProfileView;
