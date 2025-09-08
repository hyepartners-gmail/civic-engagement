'use client';

import { useGroup } from '@/hooks/common-ground/useGroup';
import { useScores } from '@/hooks/common-ground/useScores';
import { useSurvey } from '@/hooks/common-ground/useSurvey';
import { CATEGORIES } from '@/lib/common-ground/categories';
import { ArrowLeft, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import GroupTopicScoreCard from './GroupTopicScoreCard';
import EmptyState from './ui/EmptyState';
import { useApi } from '@/hooks/common-ground/useApi';
import QuestionDistribution from './QuestionDistribution';
import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import ShareableResults from './ShareableResults';

interface CommonGroundCategoryClientProps {
  groupId: string;
  categoryId: number;
}

export default function CommonGroundCategoryClient({ groupId, categoryId }: CommonGroundCategoryClientProps) {
  const { group, loading: groupLoading } = useGroup(groupId);
  const { topicScores, loading: scoresLoading } = useScores(groupId);
  const { survey, loading: surveyLoading } = useSurvey('v1');
  const { data: distributions, loading: distLoading } = useApi<any[]>(`/api/common-ground/groups/${groupId}/category/${categoryId}/responses?version=v1`);
  const shareableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const category = CATEGORIES.find(c => c.id === categoryId);

  const handleShare = async () => {
    if (!isClient || !shareableRef.current) return;
    
    try {
      const dataUrl = await toPng(shareableRef.current, { backgroundColor: '#12001a' });
      const link = document.createElement('a');
      link.download = `common-ground-${group?.nickname}-${category?.name}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'Image Saved!', description: 'Your shareable results have been downloaded.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not generate shareable image.' });
    }
  };

  if (groupLoading || scoresLoading || surveyLoading || distLoading) {
    return <p>Loading category details...</p>;
  }

  if (!category || !group || !topicScores || !survey) {
    return <p>Could not load category data.</p>;
  }

  const topicsInCategory = (survey.topics || []).filter(t => t.categoryId === categoryId);
  const topicScoresInCategory = topicScores.filter(score => topicsInCategory.some(t => t.id === score.topicId));
  const safeTopics = topicScoresInCategory.filter(s => s.label === 'safe');

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Link href={`/common-ground/group/${groupId}`} passHref>
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Group
          </Button>
        </Link>
        <Button onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share Safe Topics
        </Button>
      </div>
      <h1 className="text-3xl font-thin text-platform-text mb-2">{category.name}</h1>
      <p className="text-platform-text/80 mb-8">
        A breakdown of your group's alignment on topics related to {category.name.toLowerCase()}.
      </p>

      {topicScoresInCategory.length > 0 ? (
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Topic Scores</h2>
            <div className="space-y-6">
              {topicScoresInCategory.map(score => (
                <GroupTopicScoreCard key={score.id} score={score} members={group.members} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">Question Distributions</h2>
            <div className="space-y-6">
              {distributions?.map(dist => (
                <QuestionDistribution key={dist.questionId} distribution={dist} />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <EmptyState
          title="No Scores Yet"
          description={`No one in this group has answered questions for the ${category.name} category yet.`}
        />
      )}

      {isClient && (
        <div className="absolute -left-[9999px] top-0">
          <ShareableResults ref={shareableRef} groupName={`${group.nickname} - ${category.name}`} safeTopics={safeTopics} />
        </div>
      )}
    </div>
  );
}