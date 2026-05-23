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
      {label && <label className="label block mb-1 font-semibold text-sm">{label}</label>}
      <input
        ref={ref}
        className={clsx('input', error && 'input-error', success && 'input-success', className)}
        {...props}
      />
      {(error || helperText) && (
        <div className={error ? 'error-text text-red-500 text-xs mt-1' : 'help-text text-gray-500 text-xs mt-1'}>{error || helperText}</div>
      )}
    </div>
  )
);

Input.displayName = 'Input';
