import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone, Lock } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { registerAccount } from '../../api/authApi';
import { applyFieldErrors, toApiError } from '../../api/errors';
import { registerSchema, type RegisterFormValues } from '../../schemas/authSchemas';
import styles from './Register.module.css';

const Register = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async ({ fullName, email, phone, password }: RegisterFormValues) => {
    setSubmitError(null);
    try {
      await registerAccount({ fullName, email, phone, password });
      navigate('/login', { state: { notice: 'Your account has been created. Please log in.' } });
    } catch (error) {
      const apiError = toApiError(error);
      if (!applyFieldErrors(apiError.fieldErrors, ['fullName', 'email', 'phone', 'password'], setError)) {
        setSubmitError(apiError.message);
      }
    }
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Sign Up</h1>
      <p className={styles.subtitle}>Create an account to start using Smart Healthcare</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormInput
          label="Full Name"
          type="text"
          placeholder="John Doe"
          icon={User}
          error={errors.fullName?.message}
          registration={register('fullName')}
        />
        <FormInput
          label="Email"
          type="email"
          placeholder="you@example.com"
          icon={Mail}
          error={errors.email?.message}
          registration={register('email')}
        />
        <FormInput
          label="Phone Number"
          type="tel"
          placeholder="0901234567"
          icon={Phone}
          error={errors.phone?.message}
          registration={register('phone')}
        />
        <FormInput
          label="Password"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={errors.password?.message}
          registration={register('password')}
        />
        <FormInput
          label="Confirm Password"
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

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Signing up...' : 'Sign Up'}
        </Button>
      </form>

      <p className={styles.footerText}>
        Already have an account? <Link to="/login">Log In</Link>
      </p>
    </div>
  );
};

export default Register;
