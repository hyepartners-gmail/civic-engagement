'use client';

import { useApi } from '@/hooks/common-ground/useApi';
import PlatformCard from '../PlatformCard';
import StatTile from './ui/StatTile';
import Pill from './ui/Pill';

interface PairwiseReportClientProps {
  groupId: string;
  otherUserId: string;
}

interface PairwiseData {
  pairwisePct: number;
  safeTopics: string[];
  hotTopics: string[];
}

export default function PairwiseReportClient({ groupId, otherUserId }: PairwiseReportClientProps) {
  const { data, loading, error } = useApi<PairwiseData>(`/api/common-ground/groups/${groupId}/pairwise/${otherUserId}?version=v1`);

  if (loading) return <p>Calculating compatibility...</p>;
  if (error) return <p className="text-red-400">Could not load report.</p>;
  if (!data) return <p>No data available for this pair.</p>;

  const talkingPoints = [
    `You both agree on ${data.safeTopics.length} topics. A great place to start is discussing "${data.safeTopics[0]?.replace(/-/g, ' ')}".`,
    `One area of disagreement is "${data.hotTopics[0]?.replace(/-/g, ' ')}". Try to understand the other's perspective here.`,
    `Overall, you have a ${(data.pairwisePct * 100).toFixed(0)}% compatibility score. Use this as a guide to find common ground.`,
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTile label="Compatibility Score" value={`${(data.pairwisePct * 100).toFixed(0)}%`} />
        <StatTile label="Safe Topics" value={data.safeTopics.length} />
        <StatTile label="Hot Topics" value={data.hotTopics.length} />
      </div>

      <PlatformCard className="p-6">
        <h3 className="text-xl font-semibold mb-4">Suggested Talking Points</h3>
        <ul className="space-y-3 list-disc list-inside">
          {talkingPoints.map((point, i) => <li key={i}>{point}</li>)}
        </ul>
      </PlatformCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlatformCard className="p-6">
          <h3 className="text-xl font-semibold text-green-400 mb-4">Safe Topics (High Agreement)</h3>
          <div className="flex flex-wrap gap-2">
            {data.safeTopics.map(topic => <Pill key={topic} color="green">{topic.replace(/-/g, ' ')}</Pill>)}
          </div>
        </PlatformCard>
        <PlatformCard className="p-6">
          <h3 className="text-xl font-semibold text-red-400 mb-4">Hot Topics (Low Agreement)</h3>
          <div className="flex flex-wrap gap-2">
            {data.hotTopics.map(topic => <Pill key={topic} color="red">{topic.replace(/-/g, ' ')}</Pill>)}
          </div>
        </PlatformCard>
      </div>
    </div>
  );
}