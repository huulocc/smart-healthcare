import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { changePasswordSchema, type ChangePasswordFormValues } from '../../schemas/authSchemas';
import styles from './ChangePassword.module.css';

const ChangePassword = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    // TODO: connect the real change-password API in a later step; this only simulates a request for now.
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log('Change password submit', values);
    navigate('/profile');
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
