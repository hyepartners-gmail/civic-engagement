import { useRouter } from 'next/router';
import { useCallback, useMemo } from 'react';

export function useUrlBooleanState(key: string, initialValue: boolean) {
  const router = useRouter();

  const value = useMemo(() => {
    const param = router.query[key];
    if (param === '1') return true;
    if (param === '0') return false;
    return initialValue;
  }, [router.query, key, initialValue]);

  const setValue = useCallback(
    (newValue: boolean) => {
      const newQuery = { ...router.query };
      
      // Only add the parameter if it's not the default value
      if (newValue !== initialValue) {
        newQuery[key] = newValue ? '1' : '0';
      } else {
        delete newQuery[key];
      }
      
      router.replace(
        {
          pathname: router.pathname,
          query: newQuery,
        },
        undefined,
        { shallow: true }
      );
    },
    [router, key, initialValue]
  );

  return [value, setValue] as const;
}