import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export default function AnimatedCounter({ value, prefix = '', suffix = '' }) {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 20,
    restDelta: 0.001
  });

  const display = useTransform(spring, (current) => {
    return prefix + new Intl.NumberFormat('en-IN').format(Math.floor(current)) + suffix;
  });

  useEffect(() => {
    spring.set(numericValue || 0);
  }, [numericValue, spring]);

  return <motion.span>{display}</motion.span>;
}
