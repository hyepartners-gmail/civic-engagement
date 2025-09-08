"use client";

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Button } from './ui/button';
import { ExternalLink, Mail, Phone, MapPin, Calendar, Vote, ScrollText, Users, RefreshCw } from 'lucide-react';
import PlatformCard from './PlatformCard';
import { colors } from '../lib/theme'; // Import centralized colors

interface CivicInfoDisplayProps {
  address: {
    city?: string;
    state?: string;
    zipCode?: string;
    congressionalDistrict?: string;
  };
  electionInfo: any;
  pollingInfo: any;
  contests: any[];
  officials: any;
  onRefresh: () => void;
}

const CivicInfoDisplay: React.FC<CivicInfoDisplayProps> = ({
  address,
  electionInfo,
  pollingInfo,
  contests,
  officials,
  onRefresh,
}) => {
  const hasPollingInfo = pollingInfo && (pollingInfo.pollingLocations?.length > 0 || pollingInfo.earlyVoteSites?.length > 0 || pollingInfo.dropOffLocations?.length > 0);
  const hasContests = contests && contests.length > 0;
  const hasOfficials = officials && (officials.electionAdministrationBody || officials.stateVoterRegistrationBody);

  return (
    <div className="space-y-6 font-sans">
      <PlatformCard variant="background" className="p-6 sm:p-8"> {/* Increased padding */}
        <div className="flex justify-between items-start mb-6"> {/* Increased mb */}
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-thin text-platform-text mb-2">Your Civic Hub</h2>
            <div className="space-y-1">
              <p className="text-sm sm:text-base text-platform-text/70 font-normal flex items-center gap-2">
                <MapPin className="h-4 w-4 text-platform-accent" />
                {address.city}, {address.state} {address.zipCode}
              </p>
              {address.congressionalDistrict && (
                <p className="text-sm text-platform-text/60 font-normal ml-6">
                  {address.congressionalDistrict}
                </p>
              )}
            </div>
            
            {electionInfo && (
              <div className="mt-4 p-4 bg-platform-accent/10 rounded-lg border border-platform-accent/20">
                <h3 className="text-base sm:text-lg font-semibold text-platform-text mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-platform-accent" />
                  Upcoming Election
                </h3>
                <p className="text-sm sm:text-base text-platform-text/90 font-normal">
                  <span className="font-semibold">{electionInfo.name}</span>
                </p>
                <p className="text-sm text-platform-text/70 font-normal">
                  {new Date(electionInfo.electionDay).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>
          
          <Button
            variant="platform-secondary"
            size="sm"
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm ml-4"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4" /> 
            <span className="hidden sm:inline">Refresh Info</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>

        {!electionInfo && (
          <div className="mt-4 p-4 bg-platform-text/5 rounded-lg border border-platform-text/10">
            <p className="text-sm text-platform-text/70 font-normal flex items-center gap-2">
              <Calendar className="h-4 w-4 text-platform-text/50" />
              No upcoming elections found for your area
            </p>
          </div>
        )}
      </PlatformCard>

      <Accordion type="multiple" className="w-full space-y-6"> {/* Increased space-y */}
        {hasPollingInfo && (
          <AccordionItem value="item-1" className="border-b border-platform-contrast">
            <AccordionTrigger className="bg-platform-contrast hover:bg-platform-contrast/80 text-platform-text font-semibold text-base sm:text-lg px-6 py-4 rounded-t-lg"> {/* Increased padding */}
              <MapPin className="h-5 w-5 mr-2 text-platform-accent" /> Voting Info
            </AccordionTrigger>
            <AccordionContent className="bg-platform-card-background p-6 sm:p-8 rounded-b-lg text-platform-text/90 space-y-4"> {/* Increased padding and space-y */}
              {pollingInfo.pollingLocations?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-platform-text mb-2">Polling Location</h4> {/* Changed to text-platform-text */}
                  {pollingInfo.pollingLocations.map((loc: any, index: number) => (
                    <div key={index} className="mb-2 text-sm font-normal">
                      <p>{loc.address?.line1}, {loc.address?.city}, {loc.address?.state} {loc.address?.zip}</p>
                      {loc.pollingHours && <p>Hours: {loc.pollingHours}</p>}
                      {loc.notes && <p>Notes: {loc.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
              {pollingInfo.earlyVoteSites?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-platform-text mb-2">Early Voting Sites</h4> {/* Changed to text-platform-text */}
                  {pollingInfo.earlyVoteSites.map((site: any, index: number) => (
                    <div key={index} className="mb-2 text-sm font-normal">
                      <p>{site.address?.line1}, {site.address?.city}, {site.address?.state} {site.address?.zip}</p>
                      {site.pollingHours && <p>Hours: {site.pollingHours}</p>}
                      {site.notes && <p>Notes: {site.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
              {pollingInfo.dropOffLocations?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-platform-text mb-2">Ballot Drop Box Locations</h4> {/* Changed to text-platform-text */}
                  {pollingInfo.dropOffLocations.map((drop: any, index: number) => (
                    <div key={index} className="mb-2 text-sm font-normal">
                      <p>{drop.address?.line1}, {drop.address?.city}, {drop.address?.state} {drop.address?.zip}</p>
                      {drop.pollingHours && <p>Hours: {drop.pollingHours}</p>}
                      {drop.notes && <p>Notes: {drop.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
              {!hasPollingInfo && <p className="text-platform-text/70 font-normal">No polling information available for this election.</p>}
            </AccordionContent>
          </AccordionItem>
        )}

        {hasContests && (
          <AccordionItem value="item-2" className="border-b border-platform-contrast">
            <AccordionTrigger className="bg-platform-contrast hover:bg-platform-contrast/80 text-platform-text font-semibold text-base sm:text-lg px-6 py-4 rounded-t-lg"> {/* Increased padding */}
              <Vote className="h-5 w-5 mr-2 text-platform-accent" /> Ballot Contests
            </AccordionTrigger>
            <AccordionContent className="bg-platform-card-background p-6 sm:p-8 rounded-b-lg text-platform-text/90 space-y-6"> {/* Increased padding and space-y */}
              {(() => {
                // Group contests by level
                const groupedContests = contests.reduce((groups: any, contest: any) => {
                  const level = contest.level || 'local';
                  if (!groups[level]) groups[level] = [];
                  groups[level].push(contest);
                  return groups;
                }, {});

                const levelOrder = ['federal', 'state', 'local'];
                const levelLabels = {
                  federal: 'Federal Elections',
                  state: 'State Elections', 
                  local: 'Local Elections'
                };

                return levelOrder.map(level => {
                  if (!groupedContests[level] || groupedContests[level].length === 0) return null;
                  
                  return (
                    <div key={level} className="space-y-4">
                      <h3 className="text-lg font-semibold text-platform-accent border-b border-platform-accent/30 pb-2">
                        {levelLabels[level as keyof typeof levelLabels]}
                      </h3>
                      {groupedContests[level].map((contest: any, index: number) => (
                        <div key={`${level}-${index}`} className="border-b border-platform-text/20 pb-4 last:border-b-0 last:pb-0 ml-4">
                          <h4 className="font-semibold text-platform-text mb-2">{contest.office || contest.referendumTitle}</h4>
                          {contest.candidates && contest.candidates.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-platform-text/80">Candidates:</p>
                              <div className="grid gap-2 ml-2">
                                {contest.candidates.map((candidate: any, cIndex: number) => (
                                  <div key={cIndex} className="flex items-center justify-between bg-platform-contrast/50 p-2 rounded">
                                    <div className="flex items-center gap-2">
                                      {candidate.photoUrl && (
                                        <img 
                                          src={candidate.photoUrl} 
                                          alt={candidate.name}
                                          className="w-8 h-8 rounded-full object-cover"
                                        />
                                      )}
                                      <div>
                                        <p className="text-sm font-medium text-platform-text">{candidate.name}</p>
                                        {candidate.party && (
                                          <p className="text-xs text-platform-text/70">{candidate.party}</p>
                                        )}
                                      </div>
                                    </div>
                                    {candidate.candidateUrl && (
                                      <a 
                                        href={candidate.candidateUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-platform-accent hover:underline flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        <span className="text-xs">Info</span>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {contest.referendumText && (
                            <div className="mt-3 bg-platform-contrast/30 p-3 rounded">
                              <p className="text-sm font-medium text-platform-text/80 mb-2">Referendum Summary:</p>
                              <p className="text-sm font-normal text-platform-text/90">{contest.referendumText}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                }).filter(Boolean);
              })()}
              {contests.length === 0 && (
                <p className="text-platform-text/70 font-normal">No ballot contests available for this election.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {hasOfficials && (
          <AccordionItem value="item-3" className="border-b border-platform-contrast">
            <AccordionTrigger className="bg-platform-contrast hover:bg-platform-contrast/80 text-platform-text font-semibold text-base sm:text-lg px-6 py-4 rounded-t-lg"> {/* Increased padding */}
              <Users className="h-5 w-5 mr-2 text-platform-accent" /> Election Officials
            </AccordionTrigger>
            <AccordionContent className="bg-platform-card-background p-6 sm:p-8 rounded-b-lg text-platform-text/90 space-y-4"> {/* Increased padding and space-y */}
              {officials.electionAdministrationBody && (
                <div>
                  <h4 className="font-semibold text-platform-text mb-2">Election Administration Body</h4> {/* Changed to text-platform-text */}
                  <p className="text-sm font-normal">{officials.electionAdministrationBody.name}</p>
                  {officials.electionAdministrationBody.electionInfoUrl && (
                    <p className="text-sm font-normal flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 text-platform-accent" />
                      <a href={officials.electionAdministrationBody.electionInfoUrl} target="_blank" rel="noopener noreferrer" className="text-platform-accent hover:underline">
                        Election Info
                      </a>
                    </p>
                  )}
                  {officials.electionAdministrationBody.phone && (
                    <p className="text-sm font-normal flex items-center gap-1">
                      <Phone className="h-3 w-3 text-platform-accent" />
                      {officials.electionAdministrationBody.phone}
                    </p>
                  )}
                  {officials.electionAdministrationBody.email && (
                    <p className="text-sm font-normal flex items-center gap-1">
                      <Mail className="h-3 w-3 text-platform-accent" />
                      <a href={`mailto:${officials.electionAdministrationBody.email}`} className="text-platform-accent hover:underline">
                        {officials.electionAdministrationBody.email}
                      </a>
                    </p>
                  )}
                </div>
              )}
              {officials.stateVoterRegistrationBody && (
                <div>
                  <h4 className="font-semibold text-platform-text mb-2">State Voter Registration Body</h4> {/* Changed to text-platform-text */}
                  <p className="text-sm font-normal">{officials.stateVoterRegistrationBody.name}</p>
                  {officials.stateVoterRegistrationBody.voterRegistrationUrl && (
                    <p className="text-sm font-normal flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 text-platform-accent" />
                      <a href={officials.stateVoterRegistrationBody.voterRegistrationUrl} target="_blank" rel="noopener noreferrer" className="text-platform-accent hover:underline">
                        Register to Vote
                      </a>
                    </p>
                  )}
                </div>
              )}
              {!hasOfficials && <p className="text-platform-text/70 font-normal">No election official information available.</p>}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
};

export default CivicInfoDisplay;