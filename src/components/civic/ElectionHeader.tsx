import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, RefreshCw, Loader2 } from 'lucide-react';
import PlatformCard from '../PlatformCard';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ElectionHeaderProps {
  civicData: any;
  availableElections: any[];
  selectedElectionId?: string;
  loading: boolean;
  getCachedAddress: () => string | null;
  onRefresh: () => void;
  onChangeAddress: () => void;
  onElectionChange: (electionId: string) => void;
  getCurrentElectionId: () => string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const ElectionHeader: React.FC<ElectionHeaderProps> = ({
  civicData,
  availableElections,
  selectedElectionId,
  loading,
  getCachedAddress,
  onRefresh,
  onChangeAddress,
  onElectionChange,
  getCurrentElectionId
}) => {
  return (
    <motion.div variants={fadeInUp}>
      <PlatformCard className="p-6 bg-gradient-to-r from-platform-card-background to-platform-contrast/20">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-platform-accent" />
              <span className="text-lg font-medium">
                {getCachedAddress()?.split(',').slice(-2).join(',').trim() || 'Your Location'}
              </span>
            </div>
            
            {civicData.summary.election && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-platform-accent" />
                  <span className="text-xl font-semibold">{civicData.summary.election.name}</span>
                </div>
                <div className="text-2xl font-mono text-platform-accent">
                  {new Date(civicData.summary.election.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                
                {/* Election Dropdown for multiple elections */}
                {availableElections.length > 1 && (
                  <div className="mt-4">
                    <label className="text-sm text-platform-text/70 mb-2 block">
                      Other elections in your area:
                    </label>
                    <Select 
                      value={getCurrentElectionId()} 
                      onValueChange={onElectionChange}
                    >
                      <SelectTrigger className="w-full max-w-md">
                        <SelectValue placeholder="Select an election" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableElections.map((election: any) => (
                          <SelectItem key={election.id} value={election.id}>
                            {election.name} - {new Date(election.electionDay).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="platform-secondary"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button
              variant="platform-secondary"
              size="sm"
              onClick={onChangeAddress}
            >
              Change Address
            </Button>
          </div>
        </div>
        
        {!civicData.summary.election && (
          <div className="text-center py-8 text-platform-text/70">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-4">No scheduled elections found for your area</p>
            <p className="text-sm mb-4 text-platform-text/60">
              We only show elections relevant to your state and local area.
            </p>
            <Button 
              variant="platform-primary" 
              onClick={onChangeAddress}
              className="text-sm"
            >
              Try Different Address
            </Button>
          </div>
        )}
      </PlatformCard>
    </motion.div>
  );
};

export default ElectionHeader;