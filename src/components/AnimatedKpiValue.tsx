"use client";

import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedKpiValueProps {
  startValue: number;
  endValue: number;
  formatter: (value: number) => string;
}

export default function AnimatedKpiValue({ startValue, endValue, formatter }: AnimatedKpiValueProps) {
  const count = useMotionValue(startValue);
  const transformed = useTransform(count, (latest) => formatter(latest));

  useEffect(() => {
    const controls = animate(count, endValue, { duration: 1.5, ease: "easeInOut" });
    return controls.stop;
  }, [startValue, endValue, count]);

  return <motion.span>{transformed}</motion.span>;
}