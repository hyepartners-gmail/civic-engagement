'use client';

import { useSurvey } from '@/hooks/common-ground/useSurvey';
import SurveyRunner from './SurveyRunner';
import TopicScoreCard from './TopicScoreCard';
import { Button } from '../ui/button';
import Link from 'next/link';
import EmptyState from './ui/EmptyState';
import { ListChecks, Users } from 'lucide-react';
import PlatformCard from '../PlatformCard';
import { useMemo, useEffect, useState } from 'react';
import { TopicScoreUser } from '@/types/common-ground';
import OverallScoreIndicator from './ui/OverallScoreIndicator';
import { useRouter } from 'next/router';
import { useToast } from '@/hooks/use-toast';

interface CommonGroundYouClientProps {
  myScores: TopicScoreUser[] | null;
  scoresLoading: boolean;
  scoresError: Error | null;
  refetchScores: () => void;
}

export default function CommonGroundYouClient({ myScores, scoresLoading, scoresError, refetchScores }: CommonGroundYouClientProps) {
  const surveyVersion = 'v1';
  const { survey, loading: surveyLoading, error: surveyError } = useSurvey(surveyVersion);
  const router = useRouter();
  const { toast } = useToast();
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);

  const surveyCompleted = myScores && myScores.length > 0;
  const fromInvite = router.query.fromInvite === 'true';

  const handleSurveyComplete = () => {
    refetchScores();
  };

  // Handle automatic group joining after survey completion
  useEffect(() => {
    if (surveyCompleted && fromInvite && !isJoiningGroup) {
      const pendingGroupId = localStorage.getItem('pendingGroupId');
      const pendingJoinCode = localStorage.getItem('pendingJoinCode');
      
      if (pendingGroupId && pendingJoinCode) {
        setIsJoiningGroup(true);
        joinGroup(pendingGroupId, pendingJoinCode);
      }
    }
  }, [surveyCompleted, fromInvite, isJoiningGroup]);

  const joinGroup = async (groupId: string, joinCode: string) => {
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
      
      // Clear stored data
      localStorage.removeItem('commonGroundInvite');
      localStorage.removeItem('pendingGroupId');
      localStorage.removeItem('pendingJoinCode');
      
      toast({ 
        title: 'Welcome to the Group!', 
        description: 'You have successfully joined the group. Redirecting to group page...' 
      });
      
      // Redirect to group page
      setTimeout(() => {
        router.push(`/common-ground/group/${groupId}`);
      }, 2000);
      
    } catch (error: any) {
      console.error('Failed to join group:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error.message || 'Failed to join group. You can try joining manually.' 
      });
      setIsJoiningGroup(false);
    }
  };

  // Create a map for efficient topic name lookup
  const topicMap = useMemo(() => {
    if (!survey?.topics) return new Map<string, string>();
    return new Map(survey.topics.map(t => [t.id, t.name]));
  }, [survey]);

  const overallScore = useMemo(() => {
    if (!myScores || myScores.length === 0) {
      return 0;
    }
    const totalScore = myScores.reduce((sum, score) => sum + score.meanScore, 0);
    return totalScore / myScores.length;
  }, [myScores]);

  if (surveyLoading || scoresLoading) {
    return <p>Loading your Common Ground data...</p>;
  }

  if (surveyError || scoresError) {
    const errorToShow = surveyError || scoresError;
    return (
      <PlatformCard className="p-6">
        <h2 className="text-xl font-thin text-red-400 mb-4">Error Loading Data</h2>
        <p className="font-normal text-platform-text/70">There was a problem loading the survey. Please check the console for more details.</p>
        <pre className="mt-4 p-2 bg-platform-contrast text-red-300 text-xs rounded overflow-auto">
          {errorToShow?.toString()}
        </pre>
      </PlatformCard>
    );
  }

  return (
    <div>
      {surveyCompleted ? (
        <div>
          <OverallScoreIndicator score={overallScore} />
          
          {/* Show joining status for invite users */}
          {isJoiningGroup && (
            <PlatformCard className="p-6 mb-6 bg-green-500/10 border-green-500/30 text-center">
              <h3 className="text-xl font-semibold text-green-400 mb-2">Joining Your Group...</h3>
              <p className="text-platform-text/80">
                Great job completing the survey! We're adding you to the group now.
              </p>
            </PlatformCard>
          )}
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Your Topic Scores</h2>
            {!fromInvite && (
              <Link href="/common-ground">
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  Find or Create a Group
                </Button>
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myScores.map(score => {
              const topicName = topicMap.get(score.topicId) || score.topicId.replace(/-/g, ' ');
              return <TopicScoreCard key={score.id} score={score} topicName={topicName} />;
            })}
          </div>
        </div>
      ) : (
        survey && survey.topics && survey.topics.length > 0 ? (
          <SurveyRunner survey={survey} onComplete={handleSurveyComplete} />
        ) : (
          <EmptyState
            icon={<ListChecks />}
            title="Survey Not Found"
            description="We couldn't find the survey data, or the survey has no questions. It might be temporarily unavailable."
            action={<Link href="/common-ground"><Button>Back to Common Ground</Button></Link>}
          />
        )
      )}
    </div>
  );
}