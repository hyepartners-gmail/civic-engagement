import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock } from 'lucide-react';
import PlatformCard from '../PlatformCard';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import LocationsList from './LocationsList';
import { formatHours } from '../../utils/civic-utils';

interface PollingInfoProps {
  civicData: any;
  earlyVotingSearch: string;
  setEarlyVotingSearch: (value: string) => void;
  showAllEarlyVoting: boolean;
  setShowAllEarlyVoting: (show: boolean) => void;
  dropOffSearch: string;
  setDropOffSearch: (value: string) => void;
  showAllDropOff: boolean;
  setShowAllDropOff: (show: boolean) => void;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const PollingInfo: React.FC<PollingInfoProps> = ({
  civicData,
  earlyVotingSearch,
  setEarlyVotingSearch,
  showAllEarlyVoting,
  setShowAllEarlyVoting,
  dropOffSearch,
  setDropOffSearch,
  showAllDropOff,
  setShowAllDropOff
}) => {
  const hasPollingInfo = civicData.summary.polling.location || 
                        civicData.summary.earlyVoteSites.length > 0 || 
                        civicData.summary.dropOffLocations.length > 0 || 
                        civicData.raw?.voterInfo?.mailOnly;

  if (!hasPollingInfo) return null;

  return (
    <motion.div variants={fadeInUp}>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="platform-secondary" className="w-full justify-between p-6 h-auto">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="h-5 w-5 text-platform-accent" />
                <span className="text-lg font-semibold">
                  {civicData.raw?.voterInfo?.mailOnly ? 'Voting Information' : 'Polling Information'}
                </span>
              </div>
              {!civicData.raw?.voterInfo?.mailOnly && (
                <div className="text-left text-sm text-platform-text/70">
                  {(() => {
                    // Collect all locations for preview
                    const allLocations = [
                      ...(civicData.raw?.voterInfo?.pollingLocations?.map((location: any) => ({
                        address: location.address?.locationName 
                          ? `${location.address.locationName}, ${location.address.line1 || ''}`
                          : location.address?.line1 || 'Polling Location'
                      })) || []),
                      ...(civicData.summary.earlyVoteSites?.slice(0, 2).map((site: any) => ({
                        address: site.location?.split(',')[0] || 'Early Voting Site'
                      })) || []),
                      ...(civicData.summary.dropOffLocations?.slice(0, 1).map((location: any) => ({
                        address: location.location?.split(',')[0] || 'Drop-off Location'
                      })) || [])
                    ];
                    
                    const previewLocations = allLocations.slice(0, 3);
                    const totalLocations = (civicData.raw?.voterInfo?.pollingLocations?.length || 0) + 
                                         (civicData.summary.earlyVoteSites?.length || 0) + 
                                         (civicData.summary.dropOffLocations?.length || 0);
                    
                    return (
                      <>
                        {previewLocations.map((location, index) => (
                          <div key={index} className="truncate">
                            {location.address}
                          </div>
                        ))}
                        {totalLocations > 3 && (
                          <div className="text-platform-accent">
                            +{totalLocations - 3} more locations
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              {civicData.raw?.voterInfo?.mailOnly && (
                <div className="text-left text-sm text-platform-text/70">
                  Mail-only voting precinct
                </div>
              )}
            </div>
            <span className="text-sm text-platform-text/70 ml-4">Click to expand</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <PlatformCard className="mt-2 p-6 space-y-6">
            {/* Mail-only precinct handling */}
            {civicData.raw?.voterInfo?.mailOnly && (
              <div className="bg-platform-accent/20 border border-platform-accent/40 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📬</span>
                  <h4 className="font-semibold text-platform-text">Ballot Mailed to You</h4>
                </div>
                <p className="text-platform-text/80 text-sm">
                  Your precinct votes by mail. Your ballot will be mailed to your registered address.
                </p>
              </div>
            )}
            
            {/* Polling Locations */}
            {!civicData.raw?.voterInfo?.mailOnly && civicData.raw?.voterInfo?.pollingLocations && civicData.raw.voterInfo.pollingLocations.length > 0 && (
              <LocationsList
                title="Polling Locations"
                locations={civicData.raw.voterInfo.pollingLocations.map((location: any) => ({
                  location: location.address?.locationName 
                    ? `${location.address.locationName}, ${[location.address.line1, location.address.city, location.address.state, location.address.zip].filter(Boolean).join(', ')}`
                    : [location.address?.line1, location.address?.city, location.address?.state, location.address?.zip].filter(Boolean).join(', '),
                  hours: location.pollingHours || 'Contact local election office',
                  notes: location.notes,
                  latitude: location.latitude,
                  longitude: location.longitude
                }))}
                searchTerm=""
                onSearchChange={() => {}}
                showAll={true}
                onToggleShowAll={() => {}}
              />
            )}

            {/* Fallback to summary polling location if no raw polling locations */}
            {!civicData.raw?.voterInfo?.mailOnly && 
             (!civicData.raw?.voterInfo?.pollingLocations || civicData.raw.voterInfo.pollingLocations.length === 0) && 
             civicData.summary.polling.location && (
              <div>
                <h4 className="font-semibold text-platform-text mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Polling Location
                </h4>
                <div className="bg-platform-contrast/30 p-4 rounded-lg">
                  <p className="font-medium">{civicData.summary.polling.location}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-platform-text/70">
                    <Clock className="h-4 w-4" />
                    {formatHours(civicData.summary.polling.hours)}
                  </div>
                  {civicData.summary.polling.notes && (
                    <p className="text-sm text-platform-text/70 mt-2">{civicData.summary.polling.notes}</p>
                  )}
                  <button 
                    className="mt-2 text-xs bg-platform-accent/20 px-2 py-1 rounded text-platform-accent hover:bg-platform-accent/30 transition-colors"
                    onClick={() => {
                      const url = civicData.summary.polling.coordinates 
                        ? `https://maps.google.com/maps?q=${civicData.summary.polling.coordinates.lat},${civicData.summary.polling.coordinates.lng}`
                        : `https://maps.google.com/maps?q=${encodeURIComponent(civicData.summary.polling.location)}`;
                      window.open(url, '_blank');
                    }}
                  >
                    Open in Maps
                  </button>
                </div>
              </div>
            )}

            {/* Early Voting Sites */}
            {!civicData.raw?.voterInfo?.mailOnly && civicData.summary.earlyVoteSites.length > 0 && (
              <LocationsList
                title="Early Voting Sites"
                locations={civicData.summary.earlyVoteSites}
                searchTerm={earlyVotingSearch}
                onSearchChange={setEarlyVotingSearch}
                showAll={showAllEarlyVoting}
                onToggleShowAll={setShowAllEarlyVoting}
              />
            )}

            {/* Drop-off Locations */}
            {civicData.summary.dropOffLocations.length > 0 && (
              <LocationsList
                title="Ballot Drop-off Locations"
                locations={civicData.summary.dropOffLocations}
                searchTerm={dropOffSearch}
                onSearchChange={setDropOffSearch}
                showAll={showAllDropOff}
                onToggleShowAll={setShowAllDropOff}
              />
            )}
          </PlatformCard>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
};

export default PollingInfo;