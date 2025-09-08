'use client';

import Link from 'next/link';
import PlatformCard from '../PlatformCard';
import { Button } from '../ui/button';
import { ArrowRight, Plus, Users, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/router';
import { useState } from 'react';
import CreateGroupModal from './CreateGroupModal';
import { useMyGroups } from '@/hooks/common-ground/useMyGroups';

export default function CommonGroundClient() {
  const { toast } = useToast();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const { groups, loading: groupsLoading, refetch: refetchGroups } = useMyGroups();

  const handleSaveGroup = async (nickname: string) => {
    setIsCreating(true);
    console.log(`CLIENT_CREATE_GROUP: Starting group creation with name: "${nickname}"`);
    try {
      const response = await fetch('/api/common-ground/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });
      console.log('CLIENT_CREATE_GROUP: API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('CLIENT_CREATE_GROUP: API returned an error:', errorData);
        throw new Error(errorData.message || 'Failed to create group.');
      }

      const responseData = await response.json();
      console.log('CLIENT_CREATE_GROUP: API response JSON:', responseData);
      
      const { groupId } = responseData;
      console.log('CLIENT_CREATE_GROUP: Extracted groupId:', groupId);

      if (!groupId) {
        console.error('CLIENT_CREATE_GROUP: groupId is missing or undefined in the API response.');
        toast({
          variant: 'destructive',
          title: 'Creation Error',
          description: 'The server did not return a valid group ID. Please try again.',
        });
        return;
      }

      toast({
        title: 'Group Created!',
        description: 'You are being redirected to your new group page.',
      });
      
      // Refresh the groups list
      refetchGroups();
      
      const redirectUrl = `/common-ground/group/${groupId}`;
      console.log('CLIENT_CREATE_GROUP: Redirecting to:', redirectUrl);
      router.push(redirectUrl);

    } catch (error: any) {
      console.error('CLIENT_CREATE_GROUP: Caught an error during group creation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsCreating(false);
      setIsCreateGroupModalOpen(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-thin text-platform-text mb-4">
        Common Ground
      </h1>
      <p className="text-platform-text/80 mb-8 max-w-2xl">
        This is the beginning of the Common Ground feature. Here, you'll answer questions to find alignment with others, form groups, and see where you stand on key issues.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlatformCard>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-platform-accent mb-4">Your Scores</h2>
            <p className="text-platform-text/80 mb-6">
              Take the survey to discover your alignment on various topics and see how you compare to others.
            </p>
            <Link href="/common-ground/you">
              <Button>
                Take the Survey <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </PlatformCard>
        <PlatformCard>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-platform-accent">Your Groups</h2>
              <Button onClick={() => setIsCreateGroupModalOpen(true)} disabled={isCreating} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            </div>
            
            {groupsLoading ? (
              <p className="text-platform-text/70">Loading your groups...</p>
            ) : groups.length > 0 ? (
              <div className="space-y-3">
                {groups.map((group) => (
                  <div key={group.id} className="bg-platform-contrast/30 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{group.nickname}</h3>
                        <p className="text-sm text-platform-text/70">
                          {group.memberRole === 'owner' ? 'Owner' : 'Member'} • Joined {new Date(group.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="platform-ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(group.groupCode);
                            toast({ title: 'Code Copied!', description: 'Group code copied to clipboard.' });
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          {group.groupCode}
                        </Button>
                        <Link href={`/common-ground/group/${group.id}`}>
                          <Button size="sm" variant="platform-secondary">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-platform-text/30 mx-auto mb-4" />
                <p className="text-platform-text/70 mb-4">
                  You haven't created or joined any groups yet.
                </p>
                <Button onClick={() => setIsCreateGroupModalOpen(true)} disabled={isCreating}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Group
                </Button>
              </div>
            )}
          </div>
        </PlatformCard>
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onSave={handleSaveGroup}
        isSaving={isCreating}
      />
    </div>
  );
}