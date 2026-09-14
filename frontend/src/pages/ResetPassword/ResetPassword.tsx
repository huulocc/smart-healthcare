import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { resetPassword } from '../../api/authApi';
import { applyFieldErrors, toApiError } from '../../api/errors';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../../schemas/authSchemas';
import styles from './ResetPassword.module.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isDone, setIsDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) return;
    setSubmitError(null);
    try {
      await resetPassword(token, values.newPassword);
      setIsDone(true);
    } catch (error) {
      const apiError = toApiError(error);
      if (!applyFieldErrors(apiError.fieldErrors, ['newPassword'], setError)) {
        setSubmitError(apiError.message);
      }
    }
  };

  // The page is opened from the link in the email: /reset-password?token=...
  if (!token) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.errorIcon}>
          <AlertCircle size={32} />
        </div>
        <h1 className={styles.title}>Invalid Reset Link</h1>
        <p className={styles.subtitle}>This link is missing its reset code. Please request a new password reset email.</p>
        <Button fullWidth to="/forgot-password">
          Request a New Link
        </Button>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.doneIcon}>
          <CheckCircle2 size={32} />
        </div>
        <h1 className={styles.title}>Password Reset Successful</h1>
        <p className={styles.subtitle}>You can now log in with your new password.</p>
        <Button fullWidth onClick={() => navigate('/login')}>
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Reset Password</h1>
      <p className={styles.subtitle}>Enter a new password for your account.</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormInput
          label="New Password"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={errors.newPassword?.message}
          registration={register('newPassword')}
        />
        <FormInput
          label="Confirm New Password"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={errors.confirmPassword?.message}
          registration={register('confirmPassword')}
        />

        {submitError && (
          <p className={styles.formError} role="alert">
            {submitError} <Link to="/forgot-password">Request a new link</Link>
          </p>
        )}

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Reset Password'}
        </Button>
      </form>

      <p className={styles.footerText}>
        Remembered your password? <Link to="/login">Log In</Link>
      </p>
    </div>
  );
};

export default ResetPassword;
