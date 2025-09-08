import { useApi } from './useApi';
import { Group } from '@/types/common-ground';
import { useSession } from 'next-auth/react';

interface UserGroup extends Group {
  memberRole: 'owner' | 'member';
  memberAlias: string;
  joinedAt: string;
}

export function useMyGroups() {
  const { data: session, status } = useSession();
  const isUserAuthenticated = status === 'authenticated';
  
  // Only construct the URL if the user is authenticated
  const apiUrl = isUserAuthenticated ? '/api/common-ground/me/groups' : null;

  const { data, error, loading, refetch } = useApi<UserGroup[]>(apiUrl || '');

  return {
    groups: data || [],
    error,
    loading: loading || status === 'loading',
    refetch,
  };
}