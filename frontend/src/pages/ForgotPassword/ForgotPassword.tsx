import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, MailCheck } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { requestPasswordReset } from '../../api/authApi';
import { applyFieldErrors, toApiError } from '../../api/errors';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../../schemas/authSchemas';
import styles from './ForgotPassword.module.css';

const ForgotPassword = () => {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setSubmitError(null);
    try {
      await requestPasswordReset(values.email);
      setSentTo(values.email);
    } catch (error) {
      const apiError = toApiError(error);
      if (!applyFieldErrors(apiError.fieldErrors, ['email'], setError)) {
        setSubmitError(apiError.message);
      }
    }
  };

  if (sentTo) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.sentIcon}>
          <MailCheck size={32} />
        </div>
        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.subtitle}>
          If <strong>{sentTo}</strong> exists in our system, we&apos;ve sent password reset instructions to that
          address.
        </p>
        <p className={styles.hint}>The link expires in 15 minutes. If you can&apos;t find the email, check your spam folder.</p>

        <p className={styles.footerText}>
          Remembered your password? <Link to="/login">Log In</Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Forgot Password?</h1>
      <p className={styles.subtitle}>Enter your registered email and we&apos;ll send you reset instructions.</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormInput
          label="Email"
          type="email"
          placeholder="you@example.com"
          icon={Mail}
          error={errors.email?.message}
          registration={register('email')}
        />

        {submitError && (
          <p className={styles.formError} role="alert">
            {submitError}
          </p>
        )}

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Instructions'}
        </Button>
      </form>

      <p className={styles.footerText}>
        Remembered your password? <Link to="/login">Log In</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
