import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
};

type CardSectionProps = React.HTMLAttributes<HTMLDivElement>;

const Card = ({
  className = '',
  hoverable = true,
  ...props
}: CardProps) => {
  return (
    <div
      className={`card ${hoverable ? 'hover:shadow-lg' : ''} ${className}`}
      {...props}
    >
      {props.children}
    </div>
  );
};

const CardHeader = ({
  className = '',
  ...props
}: CardSectionProps) => {
  return (
    <div className={`card-header ${className}`} {...props}>
      {props.children}
    </div>
  );
};

const CardBody = ({
  className = '',
  ...props
}: CardSectionProps) => {
  return (
    <div className={`card-body ${className}`} {...props}>
      {props.children}
    </div>
  );
};

const CardFooter = ({
  className = '',
  ...props
}: CardSectionProps) => {
  return (
    <div className={`card-footer ${className}`} {...props}>
      {props.children}
    </div>
  );
};
const CardWithSections = Object.assign(Card, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export default CardWithSections;
