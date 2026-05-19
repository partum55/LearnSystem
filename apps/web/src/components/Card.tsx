import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  hoverable = false,
}) => (
  <div
    className={clsx('card', hoverable && 'cursor-pointer', onClick && 'cursor-pointer', className)}
    onClick={onClick}
  >
    {children}
  </div>
);

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardSectionProps> = ({ children, className }) => (
  <div className={clsx('card-header', className)}>{children}</div>
);

export const CardBody: React.FC<CardSectionProps> = ({ children, className }) => (
  <div className={clsx('card-body', className)}>{children}</div>
);

export const CardFooter: React.FC<CardSectionProps> = ({ children, className }) => (
  <div className={clsx('card-footer', className)}>{children}</div>
);
