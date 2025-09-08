import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import PlatformCard from '../PlatformCard';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface OfficialsProps {
  civicData: any;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const Officials: React.FC<OfficialsProps> = ({ civicData }) => {
  if (civicData.summary.officials.length === 0) return null;

  return (
    <motion.div variants={fadeInUp}>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="platform-secondary" className="w-full justify-between p-6 h-auto">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-platform-accent" />
              <span className="text-lg font-semibold">Election Officials</span>
            </div>
            <span className="text-sm text-platform-text/70">Click to expand</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <PlatformCard className="mt-2 p-6">
            <div className="space-y-4">
              {civicData.summary.officials.map((official: any, index: number) => (
                <div key={index} className="bg-platform-contrast/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-platform-text mb-2">
                    {official.name}
                    {official.title && <span className="text-sm font-normal text-platform-text/70 ml-2">({official.title})</span>}
                  </h4>
                  <div className="space-y-2 text-sm">
                    {official.phone && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Phone:</span>
                        <a href={`tel:${official.phone}`} className="text-platform-accent hover:underline">
                          {official.phone}
                        </a>
                      </div>
                    )}
                    {official.email && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Email:</span>
                        <a href={`mailto:${official.email}`} className="text-platform-accent hover:underline">
                          {official.email}
                        </a>
                      </div>
                    )}
                    {official.faxNumber && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Fax:</span>
                        <span className="text-platform-text/70">{official.faxNumber}</span>
                      </div>
                    )}
                    {official.website && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Website:</span>
                        <a 
                          href={official.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-platform-accent hover:underline"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </PlatformCard>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
};

export default Officials;