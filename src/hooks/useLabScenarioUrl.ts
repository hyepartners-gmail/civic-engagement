"use client";
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation'; // Use Next.js 13+ navigation hooks
import { useSSRSafeDebounce } from './useSSRSafeDebounce';
import LZString from 'lz-string';
import { useLab, LabScenario } from '@/contexts/LabContext';
import fastDeepEqual from 'fast-deep-equal'; // For deep comparison of scenario objects

// Get initial scenario from LabContext to use for comparison
import { initialScenario } from '@/contexts/LabContext';

export function useLabScenarioUrl() {
  const { scenario, setScenario } = useLab();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  // Debounced scenario for writing to URL to avoid too many rapid updates
  const debouncedScenario = useSSRSafeDebounce(scenario, 500);

  // Ref to track if the last update was initiated by the URL or internal state
  // This helps prevent infinite loops where a component reacts to its own changes.
  const lastUpdateSource = useRef<'url' | 'state' | null>(null);

  // Effect to read from URL (triggered by URL changes)
  useEffect(() => {
    if (!isClient) return;

    const urlParam = searchParams.get('scenario');
    
    if (urlParam) {
      try {
        const decoded = LZString.decompressFromEncodedURIComponent(urlParam);
        if (decoded) {
          const parsedScenario: LabScenario = JSON.parse(decoded);
          
          // Only update internal state if the parsed URL scenario is different
          // from the current internal state (deep comparison is crucial here).
          if (!fastDeepEqual(scenario, parsedScenario)) {
            lastUpdateSource.current = 'url'; // Mark source of update
            setScenario(parsedScenario, true); // 'true' indicates it's from history/URL
          }
        }
      } catch (e) {
        console.error("Failed to parse scenario from URL", e);
      }
    } else {
      // If 'scenario' param is removed from URL, and our internal state is not the default,
      // then reset the internal state to default.
      if (!fastDeepEqual(scenario, initialScenario)) {
        // Only reset if the change didn't just come from us removing the param
        if (lastUpdateSource.current !== 'state') {
          lastUpdateSource.current = 'url';
          setScenario(initialScenario);
        }
      }
    }
  }, [isClient, searchParams, scenario, setScenario]); // Depend on searchParams and scenario

  // Effect to write to URL (triggered by internal state changes)
  useEffect(() => {
    if (!isClient) {
      return;
    }

    // If the last update originated from the URL, we should skip writing back to avoid a loop.
    if (lastUpdateSource.current === 'url') {
      lastUpdateSource.current = null; // Reset the flag
      return;
    }

    const scenarioToEncode = {
      deltas: debouncedScenario.deltas,
      customPrograms: debouncedScenario.customPrograms,
      year: debouncedScenario.year,
    };
    const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(scenarioToEncode));
    
    const currentUrlParam = searchParams.get('scenario');

    // Only update URL if the encoded string is actually different from what's currently in the URL.
    if (encoded !== currentUrlParam) {
      const newParams = new URLSearchParams(searchParams.toString());
      
      // If the scenario is back to its initial/default state, remove the param from the URL.
      if (fastDeepEqual(debouncedScenario, initialScenario)) {
        newParams.delete('scenario');
      } else {
        newParams.set('scenario', encoded);
      }
      
      const newUrl = pathname + (newParams.toString() ? `?${newParams.toString()}` : '');
      
      // For App Router, we'll just call router.replace without checking asPath
      lastUpdateSource.current = 'state'; // Mark source of update
      router.replace(newUrl, { scroll: false });
    }
  }, [isClient, debouncedScenario, searchParams, pathname, initialScenario]); // Updated dependencies
}
