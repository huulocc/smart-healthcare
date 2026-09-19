import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import GoogleSignInButton, { isGoogleSignInEnabled } from '../../components/GoogleSignInButton';
import ResendVerification from '../../components/ResendVerification';
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
  const { login, loginWithGoogle } = useAuth();
  const { from = '/profile', notice } = (location.state as LoginLocationState | null) ?? {};
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set when the password was right but the account has not been activated yet.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    setUnverifiedEmail(null);
    try {
      await login(values.email, values.password, values.rememberMe ?? false);
      navigate(from, { replace: true });
    } catch (error) {
      const apiError = toApiError(error);
      // 403 means "correct password, account not activated yet".
      if (apiError.status === 403) {
        setUnverifiedEmail(values.email);
      }
      if (!applyFieldErrors(apiError.fieldErrors, ['email', 'password'], setError)) {
        setSubmitError(apiError.message);
      }
    }
  };

  const onGoogleCredential = useCallback(
    async (credential: string) => {
      setSubmitError(null);
      setUnverifiedEmail(null);
      try {
        await loginWithGoogle(credential, getValues('rememberMe') ?? false);
        navigate(from, { replace: true });
      } catch (error) {
        setSubmitError(toApiError(error).message);
      }
    },
    [loginWithGoogle, getValues, navigate, from],
  );

  const onGoogleError = useCallback((message: string) => setSubmitError(message), []);

  return (
    <div className={styles.wrapper}>
      <header className={styles.intro}>
        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.subtitle}>Log in to see your appointments.</p>
      </header>

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
            <span>
              {submitError}
              {unverifiedEmail && (
                <>
                  {' '}
                  <ResendVerification email={unverifiedEmail} />
                </>
              )}
            </span>
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
          labelAction={
            <Link to="/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          }
        />

        <label className={styles.remember}>
          <input type="checkbox" className={styles.checkbox} {...register('rememberMe')} />
          <span>Keep me logged in for 30 days</span>
        </label>

        <Button type="submit" fullWidth loading={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Log In'}
        </Button>
      </form>

      {isGoogleSignInEnabled && (
        <>
          <div className={styles.divider}>
            <span>or</span>
          </div>
          <GoogleSignInButton onCredential={onGoogleCredential} onError={onGoogleError} text="signin_with" />
        </>
      )}

      <p className={styles.footerText}>
        Don&apos;t have an account? <Link to="/register">Sign Up</Link>
      </p>
    </div>
  );
};

export default Login;
