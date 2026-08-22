import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone, Lock } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { registerSchema, type RegisterFormValues } from '../../schemas/authSchemas';
import styles from './Register.module.css';

const Register = () => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null);
    // TODO: nối API đăng ký thật ở bước sau; hiện chỉ giả lập request.
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log('Register submit', values);
    setSubmitError('Chức năng đăng ký sẽ được kết nối ở bước tiếp theo.');
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Đăng ký</h1>
      <p className={styles.subtitle}>Tạo tài khoản để bắt đầu sử dụng Smart Healthcare</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormInput
          label="Họ và tên"
          type="text"
          placeholder="Nguyễn Văn A"
          icon={User}
          error={errors.fullName?.message}
          registration={register('fullName')}
        />
        <FormInput
          label="Email"
          type="email"
          placeholder="ban@example.com"
          icon={Mail}
          error={errors.email?.message}
          registration={register('email')}
        />
        <FormInput
          label="Số điện thoại"
          type="tel"
          placeholder="0901234567"
          icon={Phone}
          error={errors.phone?.message}
          registration={register('phone')}
        />
        <FormInput
          label="Mật khẩu"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={errors.password?.message}
          registration={register('password')}
        />
        <FormInput
          label="Xác nhận mật khẩu"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={errors.confirmPassword?.message}
          registration={register('confirmPassword')}
        />

        {submitError && <p className={styles.formError}>{submitError}</p>}

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
        </Button>
      </form>

      <p className={styles.footerText}>
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </div>
  );
};

export default Register;
