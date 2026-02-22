import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  helpText,
  success,
  className = '',
  ...props
}: {
  label?: string;
  error?: string;
  helpText?: string;
  success?: boolean;
  className?: string;
  [key: string]: any;
}, ref: React.Ref<HTMLInputElement>) => {
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