import React, { useState } from 'react';

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  labels?: string[];
  className?: string;
}

const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  labels,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #4285F4 0%, #4285F4 ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`,
          }}
        />
        <div 
          className="absolute top-0 w-6 h-6 bg-blue-600 rounded-full -mt-2 transform -translate-x-1/2 cursor-pointer" 
          style={{ left: `${percentage}%` }}
        />
      </div>
      
      {labels && labels.length > 1 && (
        <div className="flex justify-between mt-2">
          {labels.map((label, index) => (
            <span
              key={index}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default Slider;