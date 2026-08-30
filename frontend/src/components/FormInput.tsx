import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import styles from './FormInput.module.css';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  icon?: LucideIcon;
  registration?: UseFormRegisterReturn;
}

const FormInput = ({
  label,
  error,
  icon: Icon,
  registration,
  type = 'text',
  className = '',
  ...props
}: FormInputProps) => {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.inputWrapper} ${error ? styles.hasError : ''}`}>
        {Icon && <Icon className={styles.icon} size={18} />}
        <input
          id={id}
          type={inputType}
          className={`${styles.input} ${Icon ? styles.hasIcon : ''} ${isPassword ? styles.hasToggle : ''}`}
          aria-invalid={!!error}
          {...registration}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
};

export default FormInput;
