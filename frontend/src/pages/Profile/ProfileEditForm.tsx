import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User as UserIcon, Mail, Phone, Calendar, MapPin } from 'lucide-react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import { updateMyProfile } from '../../api/userApi';
import { applyFieldErrors, toApiError } from '../../api/errors';
import type { User } from '../../api/types';
import { profileSchema, type ProfileFormValues } from '../../schemas/authSchemas';
import styles from './Profile.module.css';

interface ProfileEditFormProps {
  user: User;
  onSaved: (user: User) => void;
  onCancel: () => void;
}

const ProfileEditForm = ({ user, onSaved, onCancel }: ProfileEditFormProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      dob: user.dob ?? '',
      address: user.address ?? '',
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    setSubmitError(null);
    try {
      onSaved(await updateMyProfile(values));
    } catch (error) {
      const apiError = toApiError(error);
      if (!applyFieldErrors(apiError.fieldErrors, ['fullName', 'email', 'phone', 'dob', 'address'], setError)) {
        setSubmitError(apiError.message);
      }
    }
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.name}>Edit Profile</h1>
      <p className={styles.subtitle}>Update your personal information</p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormInput
          label="Full Name"
          type="text"
          icon={UserIcon}
          error={errors.fullName?.message}
          registration={register('fullName')}
        />
        <FormInput
          label="Email"
          type="email"
          icon={Mail}
          error={errors.email?.message}
          registration={register('email')}
        />
        <FormInput
          label="Phone Number"
          type="tel"
          icon={Phone}
          error={errors.phone?.message}
          registration={register('phone')}
        />
        <FormInput
          label="Date of Birth"
          type="date"
          icon={Calendar}
          error={errors.dob?.message}
          registration={register('dob')}
        />
        <FormInput
          label="Address"
          type="text"
          icon={MapPin}
          error={errors.address?.message}
          registration={register('address')}
        />

        {submitError && (
          <p className={styles.formError} role="alert">
            {submitError}
          </p>
        )}

        <div className={styles.formActions}>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileEditForm;
