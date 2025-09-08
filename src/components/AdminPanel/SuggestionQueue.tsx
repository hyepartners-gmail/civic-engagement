"use client";

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Topic } from '../../types';
import PlatformCard from '../PlatformCard';
import { colors } from '../../lib/theme'; // Import centralized colors

const SuggestionQueue: React.FC = () => {
  const [pendingTopics, setPendingTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPendingTopics = async () => {
    setLoading(true);
    try {
      // isAdmin is now derived from session on the API side
      const response = await fetch('/api/admin/suggestions/pending'); // Removed ?isAdmin=true
      if (!response.ok) throw new Error('Failed to fetch pending topics.');
      const data = await response.json();
      setPendingTopics(data.pendingTopics || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTopics();
  }, []);

  const handleApproveReject = async (topicId: string, status: 'approved' | 'rejected') => {
    // isAdmin is now derived from session on the API side

    try {
      const response = await fetch('/api/admin/suggestions/approve-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, status }), // Removed isAdmin
      });
      if (!response.ok) throw new Error(`Failed to ${status} topic.`);
      toast({ title: 'Success', description: `Topic has been ${status}.` });
      fetchPendingTopics(); // Refresh the list
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  if (loading) return <p className="font-normal">Loading suggestions...</p>;
  if (pendingTopics.length === 0) return <p className="font-normal">No pending topic suggestions.</p>;

  return (
    <div className="font-sans">
      <h3 className="text-lg sm:text-xl font-thin mb-6">Topic Suggestion Queue</h3> {/* Increased mb */}
      <div className="space-y-4"> {/* Increased space-y */}
        {pendingTopics.map(topic => (
          <PlatformCard key={topic.id} variant="background" className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"> {/* Increased padding and gap */}
            <div>
              <p className="text-sm font-medium text-platform-text">{topic.title}</p> {/* Changed to text-platform-text */}
              <p className="text-xs text-platform-text/70 font-normal">{topic.preview}</p>
              <p className="text-xs text-platform-text/50 font-normal">Region: {topic.region} | Status: {topic.status || 'approved'}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
              <Button size="sm" variant="platform-primary" className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => handleApproveReject(topic.id, 'approved')}>
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Approve
              </Button>
              <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => handleApproveReject(topic.id, 'rejected')}>
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Reject
              </Button>
            </div>
          </PlatformCard>
        ))}
      </div>
    </div>
  );
};

export default SuggestionQueue;