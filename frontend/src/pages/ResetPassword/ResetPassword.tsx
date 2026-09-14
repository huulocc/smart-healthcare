import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, CheckCircle2 } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../../schemas/authSchemas';
import styles from './ResetPassword.module.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [isDone, setIsDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    // TODO: connect the real reset-password API in a later step; this only simulates a request for now.
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log('Reset password submit', values);
    setIsDone(true);
  };

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
