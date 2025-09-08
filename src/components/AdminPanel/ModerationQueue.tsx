"use client";

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { ShieldOff, CheckCircle2, XCircle } from 'lucide-react';
import { Comment, Topic, Solution, User } from '../../types';
import { DUMMY_USERS } from '../../lib/dummy-users';
import PlatformCard from '../PlatformCard'; // Import PlatformCard
import { colors } from '../../lib/theme'; // Import centralized colors

interface FlaggedUser {
  user: Pick<User, 'id' | 'displayName' | 'isMuted'>;
  flagCount: number;
}

interface ModerationData {
  flaggedComments: Comment[];
  flaggedTopics: Topic[];
  flaggedSolutions: { topicId: string; topicTitle: string; solution: Solution }[]; // Added flagged solutions
  flaggedUsers: FlaggedUser[];
}

const ModerationQueue: React.FC = () => {
  const [data, setData] = useState<ModerationData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // isAdmin is now derived from session on the API side
      const response = await fetch('/api/moderation/queue'); // Removed ?isAdmin=true
      if (!response.ok) throw new Error('Failed to fetch moderation data.');
      const moderationData = await response.json();
      setData(moderationData);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMuteToggle = async (userId: string, isMuted: boolean) => {
    try {
      const response = await fetch('/api/admin/mute-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, mute: !isMuted }),
      });
      if (!response.ok) throw new Error('Failed to update mute status.');
      toast({ title: 'Success', description: `User has been ${!isMuted ? 'muted' : 'unmuted'}.` });
      fetchData(); // Refresh data
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleCommentApproveReject = async (commentId: string, status: 'approved' | 'rejected') => {
    // isAdmin is now derived from session on the API side

    try {
      const response = await fetch('/api/admin/comments/approve-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, status }), // Removed isAdmin
      });
      if (!response.ok) throw new Error(`Failed to ${status} comment.`);
      toast({ title: 'Success', description: `Comment has been ${status}.` });
      fetchData(); // Refresh data
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleSolutionApproveReject = async (topicId: string, solutionId: string, status: 'approved' | 'rejected') => {
    // isAdmin is now derived from session on the API side

    try {
      const response = await fetch('/api/admin/solutions/approve-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, solutionId, status }), // Removed isAdmin
      });
      if (!response.ok) throw new Error(`Failed to ${status} solution.`);
      toast({ title: 'Success', description: `Solution has been ${status}.` });
      fetchData(); // Refresh data
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  if (loading) return <p className="font-normal">Loading moderation queue...</p>;
  if (!data) return <p className="font-normal">No moderation data found.</p>;

  return (
    <div className="font-sans">
      <h3 className="text-lg sm:text-xl font-thin mb-6">Moderation Queue</h3> {/* Increased mb */}
      <Tabs defaultValue="comments" className="w-full">
        <TabsList className="bg-platform-card-background border-platform-contrast flex-wrap h-auto p-2"> {/* Increased padding */}
          <TabsTrigger value="comments" className="data-[state=active]:bg-platform-accent data-[state=active]:text-platform-text font-medium text-sm px-4 py-2">Comments ({data.flaggedComments.length})</TabsTrigger> {/* Increased padding */}
          <TabsTrigger value="topics" className="data-[state=active]:bg-platform-accent data-[state=active]:text-platform-text font-medium text-sm px-4 py-2">Topics ({data.flaggedTopics.length})</TabsTrigger> {/* Increased padding */}
          <TabsTrigger value="solutions" className="data-[state=active]:bg-platform-accent data-[state=active]:text-platform-text font-medium text-sm px-4 py-2">Solutions ({data.flaggedSolutions.length})</TabsTrigger> {/* Increased padding */}
          <TabsTrigger value="users" className="data-[state=active]:bg-platform-accent data-[state=active]:text-platform-text font-medium text-sm px-4 py-2">Users ({data.flaggedUsers.length})</TabsTrigger> {/* Increased padding */}
        </TabsList>
        
        <TabsContent value="comments" className="mt-6 space-y-4"> {/* Increased mt and space-y */}
          {data.flaggedComments.length > 0 ? (
            data.flaggedComments.map(item => (
              <PlatformCard key={item.id} variant="background" className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"> {/* Increased padding and gap */}
                <div>
                  <p className="text-xs text-platform-text/70 font-normal">"{item.text}"</p>
                  <p className="text-sm font-medium text-platform-text">by {item.author.displayName} - <span className="text-red-400">{item.flags} flags</span></p> {/* Changed to text-platform-text */}
                </div>
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <Button size="sm" variant="platform-secondary" className="font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => handleMuteToggle(item.author.id, DUMMY_USERS.find(u => u.id === item.author.id)?.isMuted || false)}><ShieldOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Mute User</Button>
                  <Button size="sm" variant="platform-primary" className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => handleCommentApproveReject(item.id, 'approved')}><CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Approve</Button>
                  <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => handleCommentApproveReject(item.id, 'rejected')}><XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Reject</Button>
                </div>
              </PlatformCard>
            ))
          ) : (
            <p className="font-normal text-platform-text/70">No flagged comments.</p>
          )}
        </TabsContent>

        <TabsContent value="topics" className="mt-6 space-y-4"> {/* Increased mt and space-y */}
          {data.flaggedTopics.length > 0 ? (
            data.flaggedTopics.map(item => (
              <PlatformCard key={item.id} variant="background" className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"> {/* Increased padding and gap */}
                <div>
                  <p className="text-sm font-medium text-platform-text">{item.title}</p> {/* Changed to text-platform-text */}
                  <p className="text-xs text-platform-text/70 font-normal">{item.preview}</p>
                  <p className="text-sm font-medium"><span className="text-red-400">{item.flags} flags</span></p>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  {/* Assuming approve/reject for topics is handled in SuggestionQueue, or needs new API */}
                  <Button size="sm" variant="platform-primary" className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => console.log('Approve Topic', item.id)}><CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Approve</Button>
                  <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => console.log('Reject Topic', item.id)}><XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Reject</Button>
                </div>
              </PlatformCard>
            ))
          ) : (
            <p className="font-normal text-platform-text/70">No flagged topics.</p>
          )}
        </TabsContent>

        <TabsContent value="solutions" className="mt-6 space-y-4"> {/* Increased mt and space-y */}
          {data.flaggedSolutions.length > 0 ? (
            data.flaggedSolutions.map(item => (
              <PlatformCard key={item.solution.id} variant="background" className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"> {/* Increased padding and gap */}
                <div>
                  <p className="text-sm font-medium text-platform-text">{item.solution.title}</p> {/* Changed to text-platform-text */}
                  <p className="text-xs text-platform-text/70 font-normal">Topic: {item.topicTitle}</p>
                  <p className="text-xs text-platform-text/70 font-normal">"{item.solution.description}"</p>
                  <p className="text-sm font-medium"><span className="text-red-400">{(item.solution as any).flags || 0} flags</span></p>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <Button size="sm" variant="platform-primary" className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => handleSolutionApproveReject(item.topicId, item.solution.id || '', 'approved')}><CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Approve</Button>
                  <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => handleSolutionApproveReject(item.topicId, item.solution.id || '', 'rejected')}><XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Reject</Button>
                </div>
              </PlatformCard>
            ))
          ) : (
            <p className="font-normal text-platform-text/70">No flagged solutions.</p>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-6 space-y-4"> {/* Increased mt and space-y */}
          {data.flaggedUsers.length > 0 ? (
            data.flaggedUsers.map(item => (
              <PlatformCard key={item.user.id} variant="background" className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"> {/* Increased padding and gap */}
                <div>
                  <p className="text-sm font-medium text-platform-text">{item.user.displayName} - <span className="text-red-400">{item.flagCount} total flags</span></p> {/* Changed to text-platform-text */}
                  <p className="text-xs text-platform-text/70 font-normal">Status: {item.user.isMuted ? 'Muted' : 'Active'}</p>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <Button size="sm" variant="platform-secondary" className="font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => handleMuteToggle(item.user.id, item.user.isMuted || false)}>
                    <ShieldOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> {item.user.isMuted ? 'Unmute' : 'Mute'} User
                  </Button>
                </div>
              </PlatformCard>
            ))
          ) : (
            <p className="font-normal text-platform-text/70">No flagged users.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModerationQueue;