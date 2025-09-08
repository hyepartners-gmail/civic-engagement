import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion'; // Import motion

interface PlatformCardProps {
  variant?: 'default' | 'background'; // 'default' for contrast, 'background' for card-background
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  id?: string;
  'data-testid'?: string;
}

const PlatformCard: React.FC<PlatformCardProps> = ({ 
  className, 
  variant = 'default', 
  children, 
  ...props 
}) => {
  const baseClasses = "rounded-lg shadow-md text-platform-text";
  const variantClasses = {
    default: "bg-platform-contrast", // Used for general sections, discussion, leaderboards
    background: "bg-platform-card-background border border-platform-contrast", // Used for topic/solution cards, analytics cards
  };

  return (
    <motion.div // Use motion.div for animations
      className={cn(
        baseClasses, 
        variantClasses[variant], 
        "shadow-[inset_0_0_0_1px_rgba(162,89,255,0.3)]", // CRT vibe: 1px inset border with platform-accent transparency
        className
      )} 
      whileHover={{ scale: 1.01, boxShadow: "0 0 10px rgba(162, 89, 255, 0.6), 0 0 20px rgba(162, 89, 255, 0.4), inset 0 0 0 1px rgba(162,89,255,0.3)" }} // Neon glow on hover
      whileTap={{ scale: 0.98 }} // Electric pulse on click
      transition={{ type: "spring", stiffness: 300, damping: 25 }} // Snappy spring transition
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default PlatformCard;