import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { loginSchema, type LoginFormValues } from '../../schemas/authSchemas';
import styles from './Login.module.css';

const Login = () => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    // TODO: connect the real login API in a later step; this only simulates a request for now.
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log('Login submit', values);
    setSubmitError('Login will be connected to the backend in a later step.');
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Log In</h1>
      <p className={styles.subtitle}>Welcome back to Smart Healthcare</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
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
        />

        <div className={styles.forgotRow}>
          <Link to="/forgot-password" className={styles.forgotLink}>
            Forgot password?
          </Link>
        </div>

        {submitError && <p className={styles.formError}>{submitError}</p>}

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Log In'}
        </Button>
      </form>

      <p className={styles.footerText}>
        Don&apos;t have an account? <Link to="/register">Sign Up</Link>
      </p>
    </div>
  );
};

export default Login;
