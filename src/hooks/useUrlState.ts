"use client";

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * A hook to synchronize state with URL parameters
 * @param key The URL parameter key
 * @param defaultValue The default value if parameter is not present
 * @returns [value, setValue] tuple similar to useState
 */
export function useUrlState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isUpdating = useRef(false);
  
  // Get the current value from URL or use default
  const getValueFromUrl = (): T => {
    const param = searchParams.get(key);
    
    if (param === null) {
      return defaultValue;
    }
    
    // Handle array values - if default is array, parse as comma-separated
    if (Array.isArray(defaultValue)) {
      if (param.includes(',')) {
        return param.split(',') as unknown as T;
      }
      return [param] as unknown as T;
    }
    
    // Handle different types
    if (typeof defaultValue === 'boolean') {
      return (param === 'true') as unknown as T;
    }
    
    if (typeof defaultValue === 'number') {
      return Number(param) as unknown as T;
    }
    
    return param as unknown as T;
  };
  
  // Initialize state with URL value
  const [value, setValue] = useState<T>(getValueFromUrl());
  
  // Update state when URL changes, but prevent updating during our own updates
  useEffect(() => {
    if (isUpdating.current) {
      isUpdating.current = false;
      return;
    }
    
    const newValue = getValueFromUrl();
    setValue(newValue);
  }, [searchParams, key, defaultValue]);
  
  // Update URL when value changes
  const updateUrl = (newValue: T) => {
    isUpdating.current = true;
    
    const params = new URLSearchParams(searchParams.toString());
    
    // Handle different value types
    if (newValue === null || newValue === undefined) {
      params.delete(key);
    } else if (JSON.stringify(newValue) === JSON.stringify(defaultValue)) {
      params.delete(key);
    } else if (Array.isArray(newValue)) {
      // Handle array values as comma-separated string
      params.set(key, newValue.join(','));
    } else {
      params.set(key, String(newValue));
    }
    
    // Create the new URL
    const newUrl = pathname + (params.toString() ? `?${params.toString()}` : '');
    
    // Update the URL only if it actually changed
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
    
    // Reset the flag after a short delay to ensure the effect has run
    setTimeout(() => {
      isUpdating.current = false;
    }, 0);
  };
  
  // Return the state and updater
  const setValueAndUrl = (newValue: T) => {
    setValue(newValue);
    updateUrl(newValue);
  };
  
  return [value, setValueAndUrl];
}