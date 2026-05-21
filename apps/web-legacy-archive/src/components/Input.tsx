"use client";
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  success?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, success, className = '', ...props }, ref) => {
    const inputClasses = [
      'input',
      error && 'input-error',
      success && 'input-success',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div className="input-group w-full">
        {label && <label className="label">{label}</label>}
        <input ref={ref} className={inputClasses} {...props} />
        {(error || helperText) && (
          <div className={error ? 'error-text' : 'help-text'}>{error || helperText}</div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
