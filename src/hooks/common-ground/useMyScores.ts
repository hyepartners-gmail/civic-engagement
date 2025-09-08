import { useEffect } from 'react';
import { useApi } from './useApi';
import { TopicScoreUser } from '@/types/common-ground';
import { useSession } from 'next-auth/react';

export function useMyScores(version: string) {
  const { data: session, status } = useSession();
  const isUserAuthenticated = status === 'authenticated';
  
  // Only construct the URL if the user is authenticated
  const apiUrl = isUserAuthenticated ? `/api/common-ground/me/topic-scores?version=${version}` : null;

  const { data, error, loading, refetch } = useApi<TopicScoreUser[]>(apiUrl || '');
  
  // Automatically refetch when the hook is used and user is authenticated
  useEffect(() => {
    if (isUserAuthenticated) {
      refetch();
    }
  }, [isUserAuthenticated, refetch]);

  return {
    myScores: data,
    error,
    loading: loading || status === 'loading', // Also consider session loading state
    refetch,
  };
}