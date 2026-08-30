import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Mail, Phone, Calendar, MapPin, User as UserIcon } from 'lucide-react';
import Button from '../../components/Button';
import type { User } from '../../data/mockUser';
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
          <p className={styles.subtitle}>Hồ sơ bệnh nhân</p>
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
            <span className={styles.infoLabel}>Số điện thoại</span>
            <p className={styles.infoValue}>{user.phone}</p>
          </div>
        </div>
        <div className={styles.infoRow}>
          <Calendar size={18} className={styles.infoIcon} />
          <div>
            <span className={styles.infoLabel}>Ngày sinh</span>
            <p className={styles.infoValue}>{format(new Date(user.dob), 'dd/MM/yyyy')}</p>
          </div>
        </div>
        <div className={styles.infoRow}>
          <MapPin size={18} className={styles.infoIcon} />
          <div>
            <span className={styles.infoLabel}>Địa chỉ</span>
            <p className={styles.infoValue}>{user.address}</p>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="outline" onClick={onEdit}>
          Chỉnh sửa hồ sơ
        </Button>
        <Link to="/profile/change-password" className={styles.changePasswordLink}>
          Đổi mật khẩu
        </Link>
      </div>
    </div>
  );
};

export default ProfileView;
