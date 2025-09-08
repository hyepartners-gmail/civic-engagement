import { useState, useEffect, useRef } from 'react';

export function useViewportObserver(options?: IntersectionObserverInit) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      options
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  const setRef = (node: HTMLElement | null) => {
    ref.current = node;
  };

  return [setRef, isIntersecting] as const;
}