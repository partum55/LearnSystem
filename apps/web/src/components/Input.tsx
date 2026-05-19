import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  success?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, success, className, ...props }, ref) => (
    <div className="input-group w-full">
      {label && <label className="label">{label}</label>}
      <input
        ref={ref}
        className={clsx('input', error && 'input-error', success && 'input-success', className)}
        {...props}
      />
      {(error || helperText) && (
        <div className={error ? 'error-text' : 'help-text'}>{error || helperText}</div>
      )}
    </div>
  )
);

Input.displayName = 'Input';
