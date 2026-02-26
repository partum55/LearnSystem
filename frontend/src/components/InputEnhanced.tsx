import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  success?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helpText,
  success,
  className = '',
  ...props
}, ref) => {
  const inputClasses = [
    'input',
    error && 'input-error',
    success && 'input-success',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="input-group">
      {label && (
        <label className="label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={inputClasses}
        {...props}
      />
      {(helpText || error) && (
        <div className={error ? 'error-text' : 'help-text'}>
          {error || helpText}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
