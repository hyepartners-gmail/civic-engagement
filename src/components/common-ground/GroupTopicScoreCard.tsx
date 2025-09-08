import { TopicScoreGroup, GroupMember } from '@/types/common-ground';
import PlatformCard from '../PlatformCard';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import Pill from './ui/Pill';

interface GroupTopicScoreCardProps {
  score: TopicScoreGroup;
  members: GroupMember[];
}

export default function GroupTopicScoreCard({ score, members }: GroupTopicScoreCardProps) {
  const memberMap = new Map(members.map(m => [m.id, m]));

  const getPosition = (memberScore: number) => {
    // Normalize score from -100 to 100 range to 0-100%
    return ((memberScore + 100) / 200) * 100;
  };

  return (
    <PlatformCard className="p-6">
      <div className="flex justify-between items-start">
        <h4 className="font-semibold text-lg mb-4 flex-1">{score.topicId.replace(/-/g, ' ')}</h4>
        <Pill color={score.label === 'safe' ? 'green' : 'red'}>
          {score.agreementPct.toFixed(0)}% Agreement
        </Pill>
      </div>
      
      <div className="relative h-10 w-full mt-4">
        {/* Score Bar */}
        <div className="absolute top-1/2 -translate-y-1/2 h-1 w-full bg-platform-contrast rounded-full" />
        
        {/* Min/Max Ticks */}
        <div className="absolute top-1/2 -translate-y-1/2 h-3 w-0.5 bg-platform-text/70" style={{ left: `${getPosition(score.min)}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 h-3 w-0.5 bg-platform-text/70" style={{ left: `${getPosition(score.max)}%` }} />

        {/* Member Avatars */}
        {score.values.map(({ userId, score: memberScore }) => {
          const member = memberMap.get(userId);
          if (!member) return null;
          
          return (
            <Tooltip key={userId}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${getPosition(memberScore)}%` }}
                >
                  <Avatar className="h-8 w-8 border-2 border-platform-background">
                    <AvatarFallback>{member.alias.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{member.alias}: {memberScore.toFixed(0)}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-platform-text/70 mt-2">
        <span>{score.min.toFixed(0)}</span>
        <span>{score.max.toFixed(0)}</span>
      </div>
    </PlatformCard>
  );
}