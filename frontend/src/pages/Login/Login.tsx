import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { DEMO_CREDENTIALS } from '../../data/mockUser';
import { loginSchema, type LoginFormValues } from '../../schemas/authSchemas';
import styles from './Login.module.css';

const Login = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    // TODO: replace this mock credential check with the real login API.
    await new Promise((resolve) => setTimeout(resolve, 800));

    const isValidAccount =
      values.email.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
      values.password === DEMO_CREDENTIALS.password;

    if (!isValidAccount) {
      setSubmitError('Invalid email or password. Please try again.');
      return;
    }

    navigate('/profile');
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Log In</h1>
      <p className={styles.subtitle}>Welcome back to Smart Healthcare</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        {submitError && (
          <div className={styles.formError} role="alert">
            <AlertCircle size={18} className={styles.formErrorIcon} />
            <span>{submitError}</span>
          </div>
        )}

        <FormInput
          label="Email"
          type="email"
          placeholder="you@example.com"
          icon={Mail}
          error={errors.email?.message}
          registration={register('email')}
        />
        <FormInput
          label="Password"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={errors.password?.message}
          registration={register('password')}
        />

        <div className={styles.forgotRow}>
          <Link to="/forgot-password" className={styles.forgotLink}>
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Log In'}
        </Button>
      </form>

      <p className={styles.demoHint}>
        Demo account: <strong>{DEMO_CREDENTIALS.email}</strong> / <strong>{DEMO_CREDENTIALS.password}</strong>
      </p>

      <p className={styles.footerText}>
        Don&apos;t have an account? <Link to="/register">Sign Up</Link>
      </p>
    </div>
  );
};

export default Login;
