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
    // TODO: connect the real forgot-password API in a later step; this only simulates a request for now.
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
        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.subtitle}>
          If <strong>{sentTo}</strong> exists in our system, we&apos;ve sent password reset instructions to that
          address.
        </p>

        <Link to="/reset-password" className={styles.demoLink}>
          Demo: open the reset password link
        </Link>

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
