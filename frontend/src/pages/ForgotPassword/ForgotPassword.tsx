import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, MailCheck } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../../schemas/authSchemas';
import styles from './ForgotPassword.module.css';

const ForgotPassword = () => {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    // TODO: nối API gửi email đặt lại mật khẩu thật ở bước sau; hiện chỉ giả lập request.
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log('Forgot password submit', values);
    setSentTo(values.email);
  };

  if (sentTo) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.sentIcon}>
          <MailCheck size={32} />
        </div>
        <h1 className={styles.title}>Kiểm tra email của bạn</h1>
        <p className={styles.subtitle}>
          Nếu <strong>{sentTo}</strong> tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email
          này.
        </p>

        <Link to="/reset-password" className={styles.demoLink}>
          Demo: mở liên kết đặt lại mật khẩu
        </Link>

        <p className={styles.footerText}>
          Nhớ ra mật khẩu rồi? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Quên mật khẩu?</h1>
      <p className={styles.subtitle}>Nhập email đã đăng ký, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormInput
          label="Email"
          type="email"
          placeholder="ban@example.com"
          icon={Mail}
          error={errors.email?.message}
          registration={register('email')}
        />

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Đang gửi...' : 'Gửi hướng dẫn'}
        </Button>
      </form>

      <p className={styles.footerText}>
        Nhớ ra mật khẩu rồi? <Link to="/login">Đăng nhập</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
