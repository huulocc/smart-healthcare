import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { loginSchema, type LoginFormValues } from '../../schemas/authSchemas';
import styles from './Login.module.css';

const Login = () => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    // TODO: nối API đăng nhập thật ở bước sau; hiện chỉ giả lập request.
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log('Login submit', values);
    setSubmitError('Chức năng đăng nhập sẽ được kết nối ở bước tiếp theo.');
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Đăng nhập</h1>
      <p className={styles.subtitle}>Chào mừng bạn quay lại Smart Healthcare</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormInput
          label="Email"
          type="email"
          placeholder="ban@example.com"
          icon={Mail}
          error={errors.email?.message}
          registration={register('email')}
        />
        <FormInput
          label="Mật khẩu"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={errors.password?.message}
          registration={register('password')}
        />

        <div className={styles.forgotRow}>
          <Link to="/forgot-password" className={styles.forgotLink}>
            Quên mật khẩu?
          </Link>
        </div>

        {submitError && <p className={styles.formError}>{submitError}</p>}

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>

      <p className={styles.footerText}>
        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
      </p>
    </div>
  );
};

export default Login;
