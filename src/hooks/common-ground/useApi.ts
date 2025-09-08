import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export function useApi<T>(url: string, options: UseApiOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [etag, setEtag] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);

    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...options.headers,
        };
        if (etag && options.method !== 'POST') {
          headers['If-None-Match'] = etag;
        }

        const response = await fetch(url, {
          method: options.method || 'GET',
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (response.status === 304) { // Not Modified
          setLoading(false);
          return;
        }

        if (!response.ok) {
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 100 + Math.random() * 100; // Exponential backoff with jitter
            await new Promise(res => setTimeout(res, delay));
            continue; // Retry
          }
          const errorData = await response.json();
          throw new Error(errorData.message || `API error: ${response.statusText}`);
        }

        const newEtag = response.headers.get('ETag');
        if (newEtag) {
          setEtag(newEtag);
        }

        const result = await response.json();
        setData(result);
        setLoading(false);
        return; // Success, exit loop
      } catch (err: any) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
          await new Promise(res => setTimeout(res, delay));
          continue; // Retry on network error
        }
        setError(err); // Final attempt failed
        setLoading(false);
      }
    }
  }, [url, options.method, options.body, options.headers, etag]);

  useEffect(() => {
    fetchData();
  }, [url]); // Fetch data when URL changes

  return { data, error, loading, refetch: fetchData };
}