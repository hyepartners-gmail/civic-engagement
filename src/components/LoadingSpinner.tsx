"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { colors } from '@/lib/theme'; // Import centralized colors

interface LoadingSpinnerProps {
  spinnerSize?: 'sm' | 'md' | 'lg'; // Controls the size of the spinner
  message?: string; // Custom loading message
  className?: string; // Additional class names for the container
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  spinnerSize = 'md', 
  message = 'loading',
  className = ''
}) => {
  const sizeMap = {
    sm: { spinner: 'w-6 h-6', text: 'text-xs', dot: 'w-1 h-1' },
    md: { spinner: 'w-8 h-8', text: 'text-sm', dot: 'w-1.5 h-1.5' },
    lg: { spinner: 'w-12 h-12', text: 'text-base', dot: 'w-2 h-2' },
  };

  const { spinner, text, dot } = sizeMap[spinnerSize];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <motion.div
        className={`relative rounded-full border-2 border-t-transparent ${spinner}`}
        style={{ borderColor: colors.platform.accent, borderTopColor: colors.platform.cyan }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        {/* Inner sparkle effect */}
        <motion.div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full`}
          style={{ backgroundColor: colors.platform.fuchsia }}
          animate={{ 
            scale: [0.5, 1, 0.5], 
            opacity: [0.8, 0.2, 0.8],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
      <p className={`mt-2 text-platform-text/70 lowercase ${text}`}>{message}</p>
    </div>
  );
};

export default LoadingSpinner;