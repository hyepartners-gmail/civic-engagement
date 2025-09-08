'use client';

import { useState } from 'react';
import { GroupMember } from '@/types/common-ground';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useApi } from '@/hooks/common-ground/useApi';
import { Button } from '../ui/button';
import Link from 'next/link';

interface PairwiseWidgetProps {
  members: GroupMember[];
  currentUserId: string;
  groupId: string;
}

export default function PairwiseWidget({ members, currentUserId, groupId }: PairwiseWidgetProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { data, loading, refetch } = useApi<{ pairwisePct: number }>(
    selectedMemberId ? `/api/common-ground/groups/${groupId}/pairwise/${selectedMemberId}?version=v1` : ''
  );

  const otherMembers = members.filter(m => m.id !== currentUserId);

  const handleSelect = (userId: string) => {
    setSelectedMemberId(userId);
    setTimeout(() => refetch(), 100); // A small delay to ensure state is set before fetching
  };

  return (
    <div className="p-4 bg-platform-contrast/50 rounded-lg">
      <h4 className="font-semibold mb-2">Pairwise Compatibility</h4>
      <div className="flex gap-2">
        <Select onValueChange={handleSelect}>
          <SelectTrigger className="bg-platform-background border-platform-accent text-platform-text">
            <SelectValue placeholder="Select a member..." />
          </SelectTrigger>
          <SelectContent className="bg-platform-background border-platform-accent">
            {otherMembers.map(member => (
              <SelectItem key={member.id} value={member.id} className="text-platform-text hover:bg-platform-accent/20">{member.alias}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedMemberId && (
          <Link href={`/common-ground/group/${groupId}/pair/${selectedMemberId}`} passHref>
            <Button variant="platform-primary">View Report</Button>
          </Link>
        )}
      </div>
      {loading && <p className="text-sm mt-2">Calculating...</p>}
      {data && (
        <p className="text-2xl font-bold text-platform-accent mt-2">
          {(data.pairwisePct * 100).toFixed(0)}% Agreement
        </p>
      )}
    </div>
  );
}