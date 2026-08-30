import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { changePasswordSchema, type ChangePasswordFormValues } from '../../schemas/authSchemas';
import styles from './ChangePassword.module.css';

const ChangePassword = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    // TODO: nối API đổi mật khẩu thật ở bước sau; hiện chỉ giả lập request.
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log('Change password submit', values);
    navigate('/profile');
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.card}>
          <h1 className={styles.title}>Đổi mật khẩu</h1>
          <p className={styles.subtitle}>Cập nhật mật khẩu đăng nhập cho tài khoản của bạn</p>

          <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormInput
              label="Mật khẩu hiện tại"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              error={errors.currentPassword?.message}
              registration={register('currentPassword')}
            />
            <FormInput
              label="Mật khẩu mới"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              error={errors.newPassword?.message}
              registration={register('newPassword')}
            />
            <FormInput
              label="Xác nhận mật khẩu mới"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              error={errors.confirmPassword?.message}
              registration={register('confirmPassword')}
            />

            <div className={styles.formActions}>
              <Link to="/profile" className={styles.cancelLink}>
                Hủy
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
