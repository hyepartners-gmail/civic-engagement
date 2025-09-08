import React from 'react';
import { motion } from 'framer-motion';
import { Vote } from 'lucide-react';
import PlatformCard from '../PlatformCard';
import { Button } from '../ui/button';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface BallotContestsProps {
  civicData: any;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const getPartyColors = (party: string) => {
  const partyLower = party.toLowerCase();
  
  if (partyLower.includes('democrat') || partyLower.includes('dem')) {
    return {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-400'
    };
  }
  
  if (partyLower.includes('republican') || partyLower.includes('rep')) {
    return {
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      text: 'text-red-400'
    };
  }
  
  // Default colors for other parties
  return {
    bg: 'bg-platform-accent/20',
    border: 'border-platform-accent/30',
    text: 'text-platform-accent'
  };
};

const BallotContests: React.FC<BallotContestsProps> = ({ civicData }) => {
  if (civicData.summary.contests.length === 0) return null;

  return (
    <motion.div variants={fadeInUp}>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="platform-secondary" className="w-full justify-between p-6 h-auto">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Vote className="h-5 w-5 text-platform-accent" />
                <span className="text-lg font-semibold">Ballot Contests</span>
              </div>
              <div className="text-left text-sm text-platform-text/70">
                {civicData.summary.contests.slice(0, 3).map((contest: any, index: number) => (
                  <div key={index} className="truncate">
                    {contest.title || contest.office}
                  </div>
                ))}
                {civicData.summary.contests.length > 3 && (
                  <div className="text-platform-accent">
                    +{civicData.summary.contests.length - 3} more
                  </div>
                )}
              </div>
            </div>
            <span className="text-sm text-platform-text/70 ml-4">Click to expand</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <PlatformCard className="mt-2 p-6">
            {['Federal', 'State', 'County', 'Local'].map(level => {
              const levelContests = civicData.summary.contests.filter((c: any) => c.level === level);
              if (levelContests.length === 0) return null;
              
              return (
                <div key={level} className="mb-8 last:mb-0">
                  <h3 className="text-lg font-semibold text-platform-accent border-b border-platform-accent/30 pb-2 mb-4">
                    {level} Elections
                  </h3>
                  <div className="space-y-6">
                    {levelContests.map((contest: any, index: number) => (
                      <div key={index} className="border-l-2 border-platform-accent/30 pl-4">
                        <h4 className="font-semibold text-platform-text mb-3">
                          {contest.title || contest.office}
                        </h4>
                        
                        {contest.type === 'candidate' && contest.candidates.length > 0 && (
                          <div className="grid gap-3 md:grid-cols-2">
                            {contest.candidates.map((candidate: any, cIndex: number) => (
                              <div key={cIndex} className="flex items-center gap-3 p-3 bg-platform-contrast/30 rounded-lg">
                                {candidate.photoUrl && (
                                  <img 
                                    src={candidate.photoUrl} 
                                    alt={candidate.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                    loading="lazy"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium">{candidate.name}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {candidate.party && (() => {
                                      const colors = getPartyColors(candidate.party);
                                      return (
                                        <span className={`inline-flex items-center rounded-full ${colors.bg} border ${colors.border} px-2.5 py-0.5 text-xs font-medium ${colors.text}`}>
                                          {candidate.party}
                                        </span>
                                      );
                                    })()}
                                    {candidate.orderOnBallot && (
                                      <span className="inline-flex items-center rounded-full bg-platform-contrast/50 border border-platform-contrast px-2.5 py-0.5 text-xs font-medium text-platform-text/80">
                                        #{candidate.orderOnBallot}
                                      </span>
                                    )}
                                  </div>
                                  {(candidate.phone || candidate.email) && (
                                    <div className="flex gap-2 mt-2 text-xs">
                                      {candidate.phone && (
                                        <a href={`tel:${candidate.phone}`} className="text-platform-accent hover:underline">
                                          📞 {candidate.phone}
                                        </a>
                                      )}
                                      {candidate.email && (
                                        <a href={`mailto:${candidate.email}`} className="text-platform-accent hover:underline">
                                          ✉️ Email
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {candidate.channels && candidate.channels.length > 0 && (
                                    <div className="flex gap-1 mt-2">
                                      {candidate.channels.map((channel: any, chIndex: number) => (
                                        <a
                                          key={chIndex}
                                          href={channel.type === 'Twitter' ? `https://twitter.com/${channel.id}` : 
                                                channel.type === 'Facebook' ? `https://facebook.com/${channel.id}` :
                                                channel.type === 'YouTube' ? `https://youtube.com/channel/${channel.id}` :
                                                channel.id}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs bg-platform-accent/20 px-2 py-1 rounded text-platform-accent hover:bg-platform-accent/30"
                                        >
                                          {channel.type}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1">
                                  {candidate.candidateUrl && (
                                    <Button 
                                      variant="link" 
                                      size="sm"
                                      onClick={() => window.open(candidate.candidateUrl, '_blank')}
                                      className="text-platform-accent text-xs h-auto p-1"
                                    >
                                      Website
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {contest.type === 'referendum' && (
                          <div className="bg-platform-contrast/30 p-4 rounded-lg space-y-3">
                            {contest.referendumSubtitle && (
                              <p className="text-sm font-medium text-platform-text">{contest.referendumSubtitle}</p>
                            )}
                            {contest.referendumBrief && (
                              <p className="text-sm text-platform-text/90">{contest.referendumBrief}</p>
                            )}
                            {contest.referendumText && contest.referendumText !== contest.referendumBrief && (
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button variant="link" className="text-xs p-0 h-auto text-platform-accent">
                                    Read Full Text
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="mt-2 p-3 bg-platform-background/50 rounded text-xs">
                                    {contest.referendumText}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                            {(contest.referendumProStatement || contest.referendumConStatement) && (
                              <div className="grid md:grid-cols-2 gap-3 mt-3">
                                {contest.referendumProStatement && (
                                  <div className="bg-green-500/10 p-3 rounded border border-green-500/20">
                                    <h5 className="text-xs font-semibold text-green-400 mb-2">Arguments For</h5>
                                    <p className="text-xs text-platform-text/80">{contest.referendumProStatement}</p>
                                  </div>
                                )}
                                {contest.referendumConStatement && (
                                  <div className="bg-red-500/10 p-3 rounded border border-red-500/20">
                                    <h5 className="text-xs font-semibold text-red-400 mb-2">Arguments Against</h5>
                                    <p className="text-xs text-platform-text/80">{contest.referendumConStatement}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            {contest.referendumPassageThreshold && (
                              <p className="text-xs text-platform-text/70">
                                <span className="font-medium">Passage Requirement:</span> {contest.referendumPassageThreshold}
                              </p>
                            )}
                            {contest.referendumEffectOfAbstain && (
                              <p className="text-xs text-platform-text/70">
                                <span className="font-medium">Effect of Abstaining:</span> {contest.referendumEffectOfAbstain}
                              </p>
                            )}
                            {contest.referendumBallotResponses && contest.referendumBallotResponses.length > 0 && (
                              <div className="text-xs">
                                <span className="font-medium">Ballot Options:</span>
                                <div className="flex gap-2 mt-1">
                                  {contest.referendumBallotResponses.map((response: string, rIndex: number) => (
                                    <span key={rIndex} className="inline-flex items-center rounded-full bg-platform-accent/20 border border-platform-accent/30 px-2.5 py-0.5 text-xs font-medium text-platform-accent">
                                      {response}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {contest.referendumUrl && (
                              <Button 
                                variant="link" 
                                size="sm"
                                onClick={() => window.open(contest.referendumUrl, '_blank')}
                                className="text-platform-accent text-xs h-auto p-0"
                              >
                                More Information
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </PlatformCard>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
};

export default BallotContests;