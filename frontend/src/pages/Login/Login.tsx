import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { applyFieldErrors, toApiError } from '../../api/errors';
import { useAuth } from '../../context/useAuth';
import { loginSchema, type LoginFormValues } from '../../schemas/authSchemas';
import styles from './Login.module.css';

// Set by ProtectedRoute (from) or by pages that send the user here after a success (notice).
interface LoginLocationState {
  from?: string;
  notice?: string;
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { from = '/profile', notice } = (location.state as LoginLocationState | null) ?? {};
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (error) {
      const apiError = toApiError(error);
      if (!applyFieldErrors(apiError.fieldErrors, ['email', 'password'], setError)) {
        setSubmitError(apiError.message);
      }
    }
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Log In</h1>
      <p className={styles.subtitle}>Welcome back to Smart Healthcare</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        {notice && !submitError && (
          <div className={styles.formNotice} role="status">
            <CheckCircle2 size={18} className={styles.bannerIcon} />
            <span>{notice}</span>
          </div>
        )}

        {submitError && (
          <div className={styles.formError} role="alert">
            <AlertCircle size={18} className={styles.bannerIcon} />
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

      <p className={styles.footerText}>
        Don&apos;t have an account? <Link to="/register">Sign Up</Link>
      </p>
    </div>
  );
};

export default Login;
