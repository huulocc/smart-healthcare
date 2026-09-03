import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone, Lock } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { registerSchema, type RegisterFormValues } from '../../schemas/authSchemas';
import styles from './Register.module.css';

const Register = () => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null);
    // TODO: connect the real register API in a later step; this only simulates a request for now.
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log('Register submit', values);
    setSubmitError('Sign up will be connected to the backend in a later step.');
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

        {submitError && <p className={styles.formError}>{submitError}</p>}

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
