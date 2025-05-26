import React from 'react';

interface ToggleProps {
  isOn: boolean;
  onToggle: () => void;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  isOn,
  onToggle,
  leftLabel,
  rightLabel,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      {leftLabel && (
        <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
          {leftLabel}
        </span>
      )}
      
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        className={`
          relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full 
          transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${isOn ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        disabled={disabled}
        aria-pressed={isOn}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow 
            transform ring-0 transition ease-in-out duration-200
            ${isOn ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
      
      {rightLabel && (
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          {rightLabel}
        </span>
      )}
    </div>
  );
};

export default Toggle;