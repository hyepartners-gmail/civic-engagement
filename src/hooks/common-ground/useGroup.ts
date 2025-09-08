import { useApi } from './useApi';
import { Group, GroupMember } from '@/types/common-ground';

interface GroupData extends Group {
  members: GroupMember[];
}

export function useGroup(groupId: string | null) {
  const { data, error, loading, refetch } = useApi<GroupData>(groupId ? `/api/common-ground/groups/${groupId}` : '');

  // The polling logic has been removed to prevent automatic page refreshes.
  // Manual refresh can be implemented using the 'refetch' function if needed.

  return { group: data, error, loading, refetch };
}