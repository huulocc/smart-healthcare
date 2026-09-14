import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { changeMyPassword } from '../../api/userApi';
import { applyFieldErrors, toApiError } from '../../api/errors';
import { changePasswordSchema, type ChangePasswordFormValues } from '../../schemas/authSchemas';
import styles from './ChangePassword.module.css';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setSubmitError(null);
    try {
      await changeMyPassword(values.currentPassword, values.newPassword);
      navigate('/profile', { state: { notice: 'Your password has been changed.' } });
    } catch (error) {
      const apiError = toApiError(error);
      if (!applyFieldErrors(apiError.fieldErrors, ['currentPassword', 'newPassword'], setError)) {
        setSubmitError(apiError.message);
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.card}>
          <h1 className={styles.title}>Change Password</h1>
          <p className={styles.subtitle}>Update the password for your account</p>

          <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormInput
              label="Current Password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              error={errors.currentPassword?.message}
              registration={register('currentPassword')}
            />
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
                {submitError}
              </p>
            )}

            <div className={styles.formActions}>
              <Link to="/profile" className={styles.cancelLink}>
                Cancel
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save New Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
