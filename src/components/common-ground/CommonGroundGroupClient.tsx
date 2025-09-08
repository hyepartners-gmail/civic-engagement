'use client';

import { useGroup } from '@/hooks/common-ground/useGroup';
import { useScores } from '@/hooks/common-ground/useScores';
import GroupTopicScoreCard from './GroupTopicScoreCard';
import ShareableResults from './ShareableResults';
import { Button } from '../ui/button';
import { Share2, LayoutDashboard, UserPlus } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useRef, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import SafeHotLegend from './ui/SafeHotLegend';
import Link from 'next/link';
import PairwiseWidget from './PairwiseWidget';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import PlatformCard from '../PlatformCard';
import dynamic from 'next/dynamic';

const InviteModal = dynamic(() => import('./InviteModal'), {
  ssr: false,
});

export default function CommonGroundGroupClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { joinCode } = router.query;
  const { data: session, status } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Only load data if we have a session or are still loading auth
  const shouldLoadData = status === 'authenticated' || status === 'loading';
  const { group, loading: groupLoading, error: groupError } = useGroup(shouldLoadData ? groupId : null);
  const { topicScores, loading: scoresLoading, error: scoresError } = useScores(shouldLoadData ? groupId : null);
  
  const shareableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const currentUserId = session?.user?.id;
  const [isJoining, setIsJoining] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isMember = group?.members.some(m => m.id === currentUserId);
  const canJoin = !isMember && joinCode && joinCode === group?.groupCode;

  const handleJoinGroup = async () => {
    if (!canJoin) return;
    setIsJoining(true);
    try {
      const response = await fetch(`/api/common-ground/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupCode: joinCode }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join group.');
      }
      toast({ title: 'Success!', description: 'You have joined the group.' });
      router.replace(`/common-ground/group/${groupId}`, undefined, { shallow: true });
      // The useGroup hook will poll and update the member list automatically.
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsJoining(false);
    }
  };

  const handleShare = async () => {
    if (!isClient || !shareableRef.current) return;
    
    try {
      const dataUrl = await toPng(shareableRef.current, { backgroundColor: '#12001a' });
      const link = document.createElement('a');
      link.download = `common-ground-${group?.nickname || groupId}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'Image Saved!', description: 'Your shareable results have been downloaded.' });
    } catch (err) {
      console.error('Failed to generate image', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not generate shareable image.' });
    }
  };

  // Handle authentication errors - redirect to sign in with special context
  const isAuthError = groupError?.message?.includes('logged in') || scoresError?.message?.includes('logged in');
  
  useEffect(() => {
    if (status === 'unauthenticated' && !isRedirecting) {
      // Store group info in localStorage for after auth
      localStorage.setItem('pendingGroupId', groupId);
      if (joinCode) {
        localStorage.setItem('pendingJoinCode', joinCode as string);
      }
      
      // Redirect to auth page with Common Ground context
      setIsRedirecting(true);
      const currentUrl = window.location.href;
      router.push(`/auth?callbackUrl=${encodeURIComponent(currentUrl)}&commonGround=true`);
    }
  }, [status, isRedirecting, router, groupId, joinCode]);

  if (status === 'unauthenticated' || isRedirecting) {
    return <p>Redirecting to sign in...</p>;
  }

  if (groupLoading || scoresLoading) {
    return <p>Loading group data...</p>;
  }

  if (groupError || scoresError) {
    return <p className="text-red-400">Error loading group data.</p>;
  }

  if (!group || !topicScores) {
    return <p>No data available for this group.</p>;
  }

  const safeTopics = topicScores.filter(s => s.label === 'safe');
  const hotTopics = topicScores.filter(s => s.label === 'hot');
  const membersWithScores = new Set(topicScores.flatMap(s => s.values.map(v => v.userId)));
  const membersWithoutScores = group.members.filter(m => !membersWithScores.has(m.id));

  return (
    <div>
      {canJoin && (
        <PlatformCard className="p-6 mb-8 bg-green-500/10 border-green-500/30 text-center">
          <h3 className="text-xl font-semibold text-green-400">You've been invited to join "{group.nickname}"!</h3>
          <Button onClick={handleJoinGroup} disabled={isJoining} className="mt-4">
            {isJoining ? 'Joining...' : 'Join Group'}
          </Button>
        </PlatformCard>
      )}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl font-thin text-platform-accent">{group.nickname}</h1>
          <p className="text-platform-text/70">Group Code: <span className="font-mono bg-platform-contrast px-2 py-1 rounded">{group.groupCode}</span></p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Members
          </Button>
          <Link href={`/common-ground/group/${groupId}/dashboard`} passHref>
            <Button variant="secondary">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Button onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share Top 5 Safe Topics
          </Button>
        </div>
      </div>
      <div className="mb-8">
        <SafeHotLegend />
      </div>

      {membersWithoutScores.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg mb-8">
          <h4 className="font-semibold text-yellow-400">Waiting for {membersWithoutScores.length} member(s)</h4>
          <p className="text-sm text-platform-text/80">
            {membersWithoutScores.map(m => m.alias).join(', ')} still need to complete the survey.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold text-green-400 mb-4">Safe Topics</h2>
            <div className="space-y-6">
              {safeTopics.length > 0 ? (
                safeTopics.map(score => <GroupTopicScoreCard key={score.id} score={score} members={group.members} />)
              ) : (
                <p className="text-platform-text/70">No safe topics found yet. More members need to complete the survey.</p>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-red-400 mb-4">Hot Zones</h2>
            <div className="space-y-6">
              {hotTopics.length > 0 ? (
                hotTopics.map(score => <GroupTopicScoreCard key={score.id} score={score} members={group.members} />)
              ) : (
                <p className="text-platform-text/70">No hot topics found yet.</p>
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-semibold mb-4">Group Tools</h2>
          {currentUserId && <PairwiseWidget members={group.members} currentUserId={currentUserId} groupId={groupId} />}
        </div>
      </div>

      {isInviteModalOpen && (
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          groupCode={group.groupCode}
          groupId={groupId}
        />
      )}

      {/* Hidden component for generating the shareable image */}
      {isClient && (
        <div className="absolute -left-[9999px] top-0">
          <ShareableResults ref={shareableRef} groupName={group.nickname || ''} safeTopics={safeTopics.slice(0, 5)} />
        </div>
      )}
    </div>
  );
}