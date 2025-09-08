import React from 'react';
import { Button } from './ui/button';
import { XCircle } from 'lucide-react';

interface SkipButtonProps {
  onClick: () => void;
}

const SkipButton: React.FC<SkipButtonProps> = ({ onClick }) => {
  return (
    <Button 
      variant="platform-ghost" // Using new platform variant
      className="flex items-center gap-2 hover:text-red-400"
      onClick={onClick}
    >
      <XCircle className="h-4 w-4" />
      Skip Topic
    </Button>
  );
};

export default SkipButton;