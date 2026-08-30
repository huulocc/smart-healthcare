import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User as UserIcon, Mail, Phone, Calendar, MapPin } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { profileSchema, type ProfileFormValues } from '../../schemas/authSchemas';
import type { User } from '../../data/mockUser';
import styles from './Profile.module.css';

interface ProfileEditFormProps {
  user: User;
  onSave: (values: ProfileFormValues) => void;
  onCancel: () => void;
}

const ProfileEditForm = ({ user, onSave, onCancel }: ProfileEditFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      dob: user.dob,
      address: user.address,
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    // TODO: nối API cập nhật hồ sơ thật ở bước sau; hiện chỉ giả lập request.
    await new Promise((resolve) => setTimeout(resolve, 500));
    onSave(values);
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.name}>Chỉnh sửa hồ sơ</h1>
      <p className={styles.subtitle}>Cập nhật thông tin cá nhân của bạn</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormInput
          label="Họ và tên"
          type="text"
          icon={UserIcon}
          error={errors.fullName?.message}
          registration={register('fullName')}
        />
        <FormInput
          label="Email"
          type="email"
          icon={Mail}
          error={errors.email?.message}
          registration={register('email')}
        />
        <FormInput
          label="Số điện thoại"
          type="tel"
          icon={Phone}
          error={errors.phone?.message}
          registration={register('phone')}
        />
        <FormInput
          label="Ngày sinh"
          type="date"
          icon={Calendar}
          error={errors.dob?.message}
          registration={register('dob')}
        />
        <FormInput
          label="Địa chỉ"
          type="text"
          icon={MapPin}
          error={errors.address?.message}
          registration={register('address')}
        />

        <div className={styles.formActions}>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileEditForm;
