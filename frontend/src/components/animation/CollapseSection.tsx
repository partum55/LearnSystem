import React from 'react';

interface CollapseSectionProps {
  isOpen: boolean;
  children: React.ReactNode;
}

export const CollapseSection: React.FC<CollapseSectionProps> = ({ isOpen, children }) => {
  return (
    <div className="anim-collapse" data-open={isOpen}>
      <div className="anim-collapse-inner">
        {children}
      </div>
    </div>
  );
};
