import React from 'react';
import PlatformCard from '../../PlatformCard';

interface OverallScoreIndicatorProps {
  score: number;
}

const getOverallScoreLabel = (score: number): string => {
  const roundedScore = Math.round(score);
  if (roundedScore < -66) return "Strongly Left-Leaning";
  if (roundedScore < -10) return "Leans Left";
  if (roundedScore <= 10) return "Centrist";
  if (roundedScore <= 66) return "Leans Right";
  return "Strongly Right-Leaning";
};

const OverallScoreIndicator: React.FC<OverallScoreIndicatorProps> = ({ score }) => {
  const scorePercentage = ((score + 100) / 200) * 100;
  const scoreLabel = getOverallScoreLabel(score);

  return (
    <PlatformCard className="p-6 mb-8">
      <h2 className="text-2xl font-semibold text-center mb-4">Your Overall Alignment</h2>
      <div className="relative h-4 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 rounded-full">
        <div
          className="absolute top-1/2 -translate-y-1/2 h-6 w-1 bg-white rounded shadow-lg"
          style={{ left: `${scorePercentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-platform-text/70 mt-2">
        <span>Left</span>
        <span>Center</span>
        <span>Right</span>
      </div>
      <p className="text-center text-xl font-thin text-platform-accent mt-4">
        {scoreLabel}
      </p>
    </PlatformCard>
  );
};

export default OverallScoreIndicator;