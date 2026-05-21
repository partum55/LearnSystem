"use client";
import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
};

type CardSectionProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = ({
  className = '',
  hoverable = false,
  ...props
}: CardProps) => (
  <div
    className={`card ${hoverable ? 'hover:shadow-lg' : ''} ${className}`.trim()}
    {...props}
  />
);

export const CardHeader = ({ className = '', ...props }: CardSectionProps) => (
  <div className={`card-header ${className}`.trim()} {...props} />
);

export const CardBody = ({ className = '', ...props }: CardSectionProps) => (
  <div className={`card-body ${className}`.trim()} {...props} />
);

export const CardFooter = ({ className = '', ...props }: CardSectionProps) => (
  <div className={`card-footer ${className}`.trim()} {...props} />
);

const CardWithSections = Object.assign(Card, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export default CardWithSections;
