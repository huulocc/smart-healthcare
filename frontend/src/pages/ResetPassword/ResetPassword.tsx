import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, CheckCircle2 } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../../schemas/authSchemas';
import styles from './ResetPassword.module.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [isDone, setIsDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    // TODO: nối API đặt lại mật khẩu thật ở bước sau; hiện chỉ giả lập request.
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log('Reset password submit', values);
    setIsDone(true);
  };

  if (isDone) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.doneIcon}>
          <CheckCircle2 size={32} />
        </div>
        <h1 className={styles.title}>Đặt lại mật khẩu thành công</h1>
        <p className={styles.subtitle}>Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.</p>
        <Button fullWidth onClick={() => navigate('/login')}>
          Đến trang đăng nhập
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Đặt lại mật khẩu</h1>
      <p className={styles.subtitle}>Nhập mật khẩu mới cho tài khoản của bạn.</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
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

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
        </Button>
      </form>

      <p className={styles.footerText}>
        Nhớ ra mật khẩu rồi? <Link to="/login">Đăng nhập</Link>
      </p>
    </div>
  );
};

export default ResetPassword;
