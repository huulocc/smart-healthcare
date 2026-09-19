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
        <div className={styles.icon}>
          <MailCheck size={20} />
        </div>
        <header className={styles.intro}>
          <h2 className={styles.title}>Check your email</h2>
          <p className={styles.subtitle}>
            If <strong>{sentTo}</strong> exists in our system, we&apos;ve sent password reset instructions to that
            address. The link expires in 15 minutes.
          </p>
        </header>
        <Button variant="outline" to="/login">
          Back to log in
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.intro}>
        <h2 className={styles.title}>Reset your password</h2>
        <p className={styles.subtitle}>
          Enter the email you signed up with and we&apos;ll send you a link to reset your password.
        </p>
      </header>

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

        <div className={styles.actions}>
          <Button type="submit" fullWidth loading={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send link'}
          </Button>
          <Button variant="outline" fullWidth to="/login">
            Back to log in
          </Button>
        </div>
      </form>

      <p className={styles.footerText}>
        Remembered your password? <Link to="/login">Log In</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
