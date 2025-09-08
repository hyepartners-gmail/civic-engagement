"use client";

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface RollingCounterProps {
  value: number;
  duration?: number;
}

const RollingCounter: React.FC<RollingCounterProps> = ({ value, duration = 0.7 }) => {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const unsubscribe = count.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });

    const controls = animate(count, value, { duration });
    
    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [value, duration, count]);

  return <span>{displayValue.toLocaleString()}</span>;
};

export default RollingCounter;