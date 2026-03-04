import React from 'react';

interface TabTransitionProps {
  tabKey: string;
  children: React.ReactNode;
}

export const TabTransition: React.FC<TabTransitionProps> = ({ tabKey, children }) => {
  return (
    <div key={tabKey} className="anim-tab-enter">
      {children}
    </div>
  );
};
