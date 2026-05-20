import React from 'react';

interface StaggeredListProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({ children, className }) => {
  return (
    <div className={`anim-stagger ${className ?? ''}`}>
      {children}
    </div>
  );
};

interface StaggeredItemProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggeredItem: React.FC<StaggeredItemProps> = ({ children, className }) => {
  return (
    <div className={`anim-stagger-item ${className ?? ''}`}>
      {children}
    </div>
  );
};
