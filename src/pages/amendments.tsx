"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Topic, Amendment } from '../types';
import PlatformCard from '../components/PlatformCard';
import { Button } from '../components/ui/button';
import { ArrowLeft, Scale, ScrollText } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const AmendmentsPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isEligible, setIsEligible] = useState(false);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = session?.user?.id;
  const isUserAuthenticated = status === 'authenticated';
  const isAdmin = (session?.user as any)?.role === 'admin';

  const checkEligibilityAndFetchAmendments = useCallback(async () => {
    if (!isUserAuthenticated || !currentUserId) {
      setIsEligible(false);
      setLoading(false);
      return;
    }

    try {
      // Fetch all approved topics to determine total count
      const allTopicsRes = await fetch('/api/topics?region=all');
      if (!allTopicsRes.ok) {
        throw new Error('Failed to fetch all topics.');
      }
      const allApprovedTopics: Topic[] = (await allTopicsRes.json()).filter((t: Topic) => t.status === 'approved');

      // Fetch user's voted topics
      const userVotedTopicsRes = await fetch('/api/user-voted-topics');
      if (!userVotedTopicsRes.ok) {
        throw new Error('Failed to fetch user voted topics.');
      }
      const userVotedTopics: Topic[] = await userVotedTopicsRes.json();

      const hasVotedOnAllApprovedTopics = allApprovedTopics.length > 0 && userVotedTopics.length === allApprovedTopics.length;
      // Allow admins to bypass the voting requirement
      const isEligibleForAccess = isAdmin || hasVotedOnAllApprovedTopics;


      setIsEligible(isEligibleForAccess);

      if (isEligibleForAccess) {
        // Award 'Constitutional Delegate' badge if eligible and not already awarded
        // This action is idempotent on the backend, so it's safe to call on each view
        await fetch('/api/user-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionType: 'view_amendments_page' }),
        });

        // Fetch dynamically generated amendments based on winning solutions
        const amendmentsRes = await fetch('/api/amendments');
        if (!amendmentsRes.ok) {
          throw new Error('Failed to fetch amendments.');
        }
        const fetchedAmendments = await amendmentsRes.json();
        
        setAmendments(fetchedAmendments);
      }
    } catch (err: any) {
      console.error('Error checking eligibility or fetching amendments:', err);
      setError(err.message || 'Failed to load amendments page.');
      setIsEligible(false); // Ensure not eligible on error
    } finally {
      setLoading(false);
    }
  }, [isUserAuthenticated, currentUserId, isAdmin]);

  useEffect(() => {
    checkEligibilityAndFetchAmendments();
  }, [checkEligibilityAndFetchAmendments]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-platform-background text-platform-text">
        <p className="text-xl font-normal">Loading amendments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-platform-background text-platform-text">
        <PlatformCard className="p-6 text-center">
          <h2 className="text-xl font-thin text-red-400 mb-4">Error Loading Page</h2>
          <p className="font-normal text-platform-text/70">{error}</p>
          <Button onClick={() => router.push('/')} variant="platform-primary" className="mt-6 px-6 py-3 text-sm sm:text-base"> {/* Increased mt, standardized padding */}
            Back to Topics
          </Button>
        </PlatformCard>
      </div>
    );
  }

  if (!isEligible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-platform-background text-platform-text">
        <PlatformCard className="p-6 text-center">
          <h2 className="text-xl font-thin text-platform-text mb-4">Access Denied</h2> {/* Changed to text-platform-text */}
          <p className="font-normal text-platform-text/70 mb-4">
            You must vote on all available topics to unlock the Constitutional Convention and view proposed amendments.
          </p>
          <Link href="/" passHref>
            <Button variant="platform-primary" className="px-6 py-3 text-sm sm:text-base"> {/* Standardized padding */}
              Return to Voting
            </Button>
          </Link>
        </PlatformCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-platform-background text-platform-text p-6 sm:p-8 font-sans"> {/* Increased padding */}
      <div className="flex justify-between items-center mb-8 sm:mb-10"> {/* Increased mb */}
        <h1 className="text-2xl sm:text-3xl font-thin text-platform-text">Proposed Amendments</h1>
        <Link href="/" passHref>
          <Button variant="platform-secondary" className="px-6 py-3 text-sm sm:text-base"> {/* Standardized padding */}
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Topics
          </Button>
        </Link>
      </div>

      {amendments.length === 0 ? (
        <PlatformCard className="p-6 text-center">
          <p className="font-normal text-platform-text/70">No proposed amendments available yet. Amendments are generated from topics with winning solutions.</p>
        </PlatformCard>
      ) : (
        <div className="space-y-6"> {/* Increased space-y */}
          {amendments.map((amendment) => (
            <PlatformCard key={amendment.id} variant="background" className="p-6 sm:p-8"> {/* Increased padding */}
              <div className="flex items-center gap-3 mb-4"> {/* Increased mb */}
                <div className="bg-platform-accent text-platform-background px-3 py-1 rounded-full text-sm font-semibold">
                  Amendment #{amendment.amendmentNumber}
                </div>
                <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                  {amendment.totalVotes} votes
                </div>
              </div>
              
              <h3 className="text-lg sm:text-xl font-semibold text-platform-text mb-2">{amendment.title}</h3>
              
              <div className="mb-4 p-3 bg-platform-contrast/50 rounded-md">
                <p className="text-sm text-platform-text/70 mb-2">
                  <strong>Winning Solution:</strong> {amendment.winningSolution.title}
                </p>
                <p className="text-sm text-platform-text/60">
                  {amendment.winningSolution.description}
                </p>
              </div>

              <div className="bg-platform-contrast p-4 rounded-md mb-6"> {/* Increased mb */}
                <div className="flex items-center gap-2 mb-3">
                  <ScrollText className="h-4 w-4 text-platform-accent" />
                  <span className="font-semibold text-platform-text text-sm">Proposed Amendment Text:</span>
                </div>
                <p className="text-sm sm:text-base text-platform-text/90 whitespace-pre-wrap font-normal">
                  {amendment.amendmentText}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-sm sm:text-base text-platform-text/70 font-normal">
                <span className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Status: <span className="capitalize font-medium text-platform-text">{amendment.status}</span>
                </span>
                <span>Total Support: {amendment.totalVotes} votes</span>
              </div>
            </PlatformCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default AmendmentsPage;