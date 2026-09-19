import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone, Lock, MailCheck } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import GoogleSignInButton, { isGoogleSignInEnabled } from '../../components/GoogleSignInButton';
import ResendVerification from '../../components/ResendVerification';
import { registerAccount } from '../../api/authApi';
import { applyFieldErrors, toApiError } from '../../api/errors';
import { useAuth } from '../../context/useAuth';
import { registerSchema, type RegisterFormValues } from '../../schemas/authSchemas';
import styles from './Register.module.css';

type SignUpRole = 'PATIENT' | 'DOCTOR';

const ROLE_OPTIONS: { value: SignUpRole; title: string; description: string }[] = [
  { value: 'PATIENT', title: 'Patient', description: 'Book and follow your appointments' },
  { value: 'DOCTOR', title: 'Doctor', description: 'Manage your working schedule' },
];

const STRENGTH_LABELS = [
  'At least 6 characters.',
  'Weak password — add an uppercase letter or a number',
  'Medium password',
  'Good password',
  'Strong password',
];

function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const Register = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [role, setRole] = useState<SignUpRole>('PATIENT');
  // Set once the account exists; the user then has to open the link in their email.
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const password = watch('password') ?? '';
  const score = passwordScore(password);
  const tone = score <= 1 ? styles.toneWeak : score === 2 ? styles.toneMedium : styles.toneStrong;

  const onSubmit = async ({ fullName, email, phone, password: newPassword }: RegisterFormValues) => {
    setSubmitError(null);
    try {
      await registerAccount({ fullName, email, phone, password: newPassword, role });
      setSignedUpEmail(email);
    } catch (error) {
      const apiError = toApiError(error);
      if (!applyFieldErrors(apiError.fieldErrors, ['fullName', 'email', 'phone', 'password'], setError)) {
        setSubmitError(apiError.message);
      }
    }
  };

  // Google has already checked the address, so these accounts skip the activation email.
  const onGoogleCredential = useCallback(
    async (credential: string) => {
      setSubmitError(null);
      try {
        await loginWithGoogle(credential);
        navigate('/profile', { replace: true });
      } catch (error) {
        setSubmitError(toApiError(error).message);
      }
    },
    [loginWithGoogle, navigate],
  );

  const onGoogleError = useCallback((message: string) => setSubmitError(message), []);

  if (signedUpEmail) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.doneIcon}>
          <MailCheck size={20} />
        </div>
        <header className={styles.intro}>
          <h2 className={styles.title}>Check your email</h2>
          <p className={styles.subtitle}>
            We sent an activation link to <strong>{signedUpEmail}</strong>. Open it to finish creating your account.
            The link expires in 24 hours.
          </p>
        </header>
        {role === 'DOCTOR' && (
          <p className={styles.roleNote}>
            Your doctor request was saved. Until an admin approves it you can use the app as a patient.
          </p>
        )}
        <p className={styles.footerText}>
          Nothing in your inbox? <ResendVerification email={signedUpEmail} />
        </p>
        <Button variant="outline" fullWidth to="/login">
          Back to log in
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.intro}>
        <h2 className={styles.title}>Create your account</h2>
        <p className={styles.subtitle}>It takes less than a minute.</p>
      </header>

      <div className={styles.roleGroup}>
        <span className={styles.roleLabel}>You are</span>
        <div className={styles.roleGrid}>
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={role === option.value}
              onClick={() => setRole(option.value)}
              className={`${styles.roleCard} ${role === option.value ? styles.roleCardActive : ''}`}
            >
              <span className={styles.roleTitle}>{option.title}</span>
              <span className={styles.roleDescription}>{option.description}</span>
            </button>
          ))}
        </div>
        {role === 'DOCTOR' && (
          <p className={styles.roleNote}>
            A doctor account has to be approved by an admin. Until then you can use the app as a patient.
          </p>
        )}
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormInput
          label="Full Name"
          type="text"
          placeholder="John Doe"
          icon={User}
          error={errors.fullName?.message}
          registration={register('fullName')}
        />

        <div className={styles.fieldRow}>
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
        </div>

        <div className={styles.passwordField}>
          <FormInput
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            icon={Lock}
            error={errors.password?.message}
            registration={register('password')}
          />
          <div className={styles.meter} aria-hidden="true">
            {[1, 2, 3, 4].map((level) => (
              <span key={level} className={`${styles.bar} ${score >= level ? tone : ''}`} />
            ))}
          </div>
          <span className={styles.strengthLabel}>{password ? STRENGTH_LABELS[score] : STRENGTH_LABELS[0]}</span>
        </div>

        <FormInput
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={errors.confirmPassword?.message}
          registration={register('confirmPassword')}
        />

        <div className={styles.terms}>
          <label className={styles.termsLabel}>
            <input type="checkbox" className={styles.checkbox} {...register('agreeTerms')} />
            <span>
              I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>
            </span>
          </label>
          {errors.agreeTerms && <span className={styles.fieldError}>{errors.agreeTerms.message}</span>}
        </div>

        {submitError && (
          <p className={styles.formError} role="alert">
            {submitError}
          </p>
        )}

        <Button type="submit" fullWidth loading={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      {isGoogleSignInEnabled && (
        <>
          <div className={styles.divider}>
            <span>or</span>
          </div>
          <GoogleSignInButton onCredential={onGoogleCredential} onError={onGoogleError} text="signup_with" />
        </>
      )}

      <p className={styles.footerText}>
        Already have an account? <Link to="/login">Log In</Link>
      </p>
    </div>
  );
};

export default Register;
