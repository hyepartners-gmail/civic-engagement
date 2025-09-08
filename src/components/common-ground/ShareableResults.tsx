import React from 'react';
import { TopicScoreGroup } from '@/types/common-ground';
import { nowIso } from '@/lib/common-ground/time';

interface ShareableResultsProps {
  groupName: string;
  safeTopics: TopicScoreGroup[];
}

const ShareableResults = React.forwardRef<HTMLDivElement, ShareableResultsProps>(
  ({ groupName, safeTopics }, ref) => {
    return (
      <div ref={ref} className="p-8 bg-platform-background text-platform-text w-[600px]">
        <h1 className="text-3xl font-thin text-platform-accent">Common Ground Found!</h1>
        <p className="text-lg text-platform-text/80">Top 5 Safe Topics for "{groupName}"</p>
        <div className="mt-6 space-y-4">
          {safeTopics.map(topic => (
            <div key={topic.id} className="p-4 bg-platform-contrast rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{topic.topicId.replace(/-/g, ' ')}</h3>
                <span className="text-green-400 font-bold">{topic.agreementPct.toFixed(0)}% Agreement</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-platform-text/50 mt-6 text-right">Generated on {new Date(nowIso()).toLocaleDateString()}</p>
      </div>
    );
  }
);

ShareableResults.displayName = 'ShareableResults';
export default ShareableResults;