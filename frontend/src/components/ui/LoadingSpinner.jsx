import React from 'react';
import { cn } from '@/lib/utils';

const LoadingSpinner = ({ 
  size = 'md', 
  className = '',
  color = 'primary',
  text = null 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    white: 'text-white',
    gray: 'text-gray-500'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-current border-t-transparent',
          sizeClasses[size],
          colorClasses[color]
        )}
        role="status"
        aria-label="加载中"
      />
      {text && (
        <p className={cn(
          'mt-2 text-sm',
          colorClasses[color]
        )}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;

