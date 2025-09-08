import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import PlatformCard from '../PlatformCard';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface VoterRegistrationProps {
  civicData: any;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const VoterRegistration: React.FC<VoterRegistrationProps> = ({ civicData }) => {
  const hasRegistrationInfo = civicData.summary.electionAdministration || civicData.summary.localJurisdiction;

  if (!hasRegistrationInfo) return null;

  return (
    <motion.div variants={fadeInUp}>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="platform-secondary" className="w-full justify-between p-6 h-auto">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-platform-accent" />
              <span className="text-lg font-semibold">Voter Registration & Election Info</span>
            </div>
            <span className="text-sm text-platform-text/70">Click to expand</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <PlatformCard className="mt-2 p-6">
            {civicData.summary.electionAdministration && (
              <div className="mb-6">
                <h4 className="font-semibold text-platform-text mb-4">State Election Administration</h4>
                <div className="space-y-3">
                  {civicData.summary.electionAdministration.electionRegistrationUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Voter Registration:</span>
                      <a 
                        href={civicData.summary.electionAdministration.electionRegistrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-platform-accent hover:underline text-sm"
                      >
                        Register to Vote
                      </a>
                    </div>
                  )}
                  {civicData.summary.electionAdministration.electionRegistrationConfirmationUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Check Registration:</span>
                      <a 
                        href={civicData.summary.electionAdministration.electionRegistrationConfirmationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-platform-accent hover:underline text-sm"
                      >
                        Verify Registration Status
                      </a>
                    </div>
                  )}
                  {civicData.summary.electionAdministration.absenteeVotingInfoUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Absentee/Mail-in Voting:</span>
                      <a 
                        href={civicData.summary.electionAdministration.absenteeVotingInfoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-platform-accent hover:underline text-sm"
                      >
                        Absentee Voting Info
                      </a>
                    </div>
                  )}
                  {civicData.summary.electionAdministration.ballotInfoUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Ballot Information:</span>
                      <a 
                        href={civicData.summary.electionAdministration.ballotInfoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-platform-accent hover:underline text-sm"
                      >
                        View Sample Ballot
                      </a>
                    </div>
                  )}
                  {civicData.summary.electionAdministration.votingLocationFinderUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Polling Locations:</span>
                      <a 
                        href={civicData.summary.electionAdministration.votingLocationFinderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-platform-accent hover:underline text-sm"
                      >
                        Find Polling Places
                      </a>
                    </div>
                  )}
                  {civicData.summary.electionAdministration.electionNoticeText && (
                    <div className="bg-platform-accent/10 p-3 rounded-lg mt-4">
                      <p className="text-sm text-platform-text">{civicData.summary.electionAdministration.electionNoticeText}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {civicData.summary.localJurisdiction && (
              <div>
                <h4 className="font-semibold text-platform-text mb-4">Local Election Office</h4>
                <div className="space-y-3">
                  {civicData.summary.localJurisdiction.name && (
                    <p className="text-sm"><span className="font-medium">Office:</span> {civicData.summary.localJurisdiction.name}</p>
                  )}
                  {civicData.summary.localJurisdiction.hoursOfOperation && (
                    <p className="text-sm"><span className="font-medium">Hours:</span> {civicData.summary.localJurisdiction.hoursOfOperation}</p>
                  )}
                  {civicData.summary.localJurisdiction.physicalAddress && (
                    <div className="text-sm">
                      <span className="font-medium">Address:</span>
                      <div className="ml-2">
                        {civicData.summary.localJurisdiction.physicalAddress.line1 && <div>{civicData.summary.localJurisdiction.physicalAddress.line1}</div>}
                        {civicData.summary.localJurisdiction.physicalAddress.city && (
                          <div>
                            {civicData.summary.localJurisdiction.physicalAddress.city}, {civicData.summary.localJurisdiction.physicalAddress.state} {civicData.summary.localJurisdiction.physicalAddress.zip}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </PlatformCard>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
};

export default VoterRegistration;