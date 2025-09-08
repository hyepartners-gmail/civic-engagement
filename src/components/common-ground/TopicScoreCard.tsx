import { TopicScoreUser } from '@/types/common-ground';
import PlatformCard from '../PlatformCard';

interface TopicScoreCardProps {
  score: TopicScoreUser;
  topicName: string; // New prop for the actual topic name
}

// Helper function to convert score to a descriptive label
const getScoreLabel = (score: number): string => {
  const roundedScore = Math.round(score);
  if (roundedScore < -66) return "Far Left";
  if (roundedScore < 0) return "Leans Left";
  if (roundedScore === 0) return "Center";
  if (roundedScore <= 66) return "Leans Right";
  return "Far Right";
};

export default function TopicScoreCard({ score, topicName }: TopicScoreCardProps) {
  const scorePercentage = ((score.meanScore + 100) / 200) * 100;
  const scoreLabel = getScoreLabel(score.meanScore);

  return (
    <PlatformCard className="p-6">
      <h4 className="font-semibold text-lg mb-4">{topicName}</h4>
      <div className="relative h-4 w-full bg-platform-contrast rounded-full">
        <div
          className="absolute top-0 left-0 h-4 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 rounded-full"
          style={{ width: '100%' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-6 w-1 bg-white rounded"
          style={{ left: `${scorePercentage}%` }}
        />
      </div>
      <p className="text-center text-sm mt-2 text-platform-text/80">
        {scoreLabel}
      </p>
    </PlatformCard>
  );
}