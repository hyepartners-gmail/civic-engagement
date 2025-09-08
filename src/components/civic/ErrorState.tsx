import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2 } from 'lucide-react';
import PlatformCard from '../PlatformCard';
import { Button } from '../ui/button';

interface ErrorStateProps {
  error: string;
  loading: boolean;
  onRetry: () => void;
  onChangeAddress: () => void;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const ErrorState: React.FC<ErrorStateProps> = ({ error, loading, onRetry, onChangeAddress }) => {
  return (
    <motion.div {...fadeInUp}>
      <PlatformCard className="p-6 text-center border-red-500/20">
        <h2 className="text-xl font-thin text-red-400 mb-4">Unable to Load Civic Information</h2>
        <p className="text-platform-text/70 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="platform-primary" onClick={onRetry} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Try Again
          </Button>
          <Button variant="platform-secondary" onClick={onChangeAddress}>
            Enter Different Address
          </Button>
        </div>
      </PlatformCard>
    </motion.div>
  );
};

export default ErrorState;