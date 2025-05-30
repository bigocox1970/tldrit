import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full">
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 min-w-max">
            {content}
            <div className="border-t-[6px] border-l-[6px] border-r-[6px] border-transparent border-t-gray-900 absolute left-1/2 transform -translate-x-1/2 top-full" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip; 