import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    return (
      <div className="input-group w-full">
        {label && <label className="label">{label}</label>}
        <div className="relative">
          <input
            ref={ref}
            type={visible ? 'text' : 'password'}
            className={clsx('input pr-10', error && 'input-error', className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-0 top-0 h-full px-3 flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            aria-label={visible ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
            tabIndex={-1}
          >
            {visible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
        {(error || helperText) && (
          <div className={error ? 'error-text' : 'help-text'}>{error || helperText}</div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
