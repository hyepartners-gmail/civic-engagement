import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import PlatformCard from '../PlatformCard';

interface MailOnlyNoticeProps {
  civicData: any;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const MailOnlyNotice: React.FC<MailOnlyNoticeProps> = ({ civicData }) => {
  if (!civicData.summary.mailOnly) return null;

  return (
    <motion.div variants={fadeInUp}>
      <PlatformCard className="p-6 bg-blue-500/10 border-blue-500/30">
        <div className="flex items-center gap-3 mb-3">
          <Calendar className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-blue-400">Mail-Only Election</h3>
        </div>
        <p className="text-platform-text">
          This election is conducted entirely by mail. Your ballot will be mailed to your registered address. 
          {civicData.summary.dropOffLocations.length > 0 && " You can also drop off your completed ballot at the locations listed above."}
        </p>
      </PlatformCard>
    </motion.div>
  );
};

export default MailOnlyNotice;